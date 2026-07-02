import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Review } from '../models/Review.js';
import { Repository } from '../models/Repository.js';

/**
 * Helper to calculate the quality score of an individual completed review.
 * Baseline starts at 100, points are deducted based on findings severity, capped at 0.
 */
const calculateReviewScore = (securityFindings: string[], logicFindings: string[]): number => {
  let score = 100;
  const security = securityFindings || [];
  const logic = logicFindings || [];

  for (const finding of security) {
    const text = finding.toLowerCase();
    if (text.includes('critical')) {
      score -= 20;
    } else if (text.includes('high') || text.includes('severe') || text.includes('vulnerability')) {
      score -= 15;
    } else {
      score -= 10; // Default to medium severity deduction
    }
  }

  score -= logic.length * 5; // Deduct 5 points per logic/correctness finding
  return Math.max(0, score);
};

/**
 * Retrieves the compiled dashboard statistics, trends, breakdowns, and activity events
 * for the currently authenticated user.
 */
export const getDashboardData = async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId;

  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Run all database counts, projections, and aggregation pipelines in parallel
    const [
      reposTotal,
      reposConnected,
      reviewsCompleted,
      reviewsPending,
      reviewsFailed,
      completedReviewsData,
      categoryBreakdownRaw,
      repoBreakdownRaw,
      trendDataRaw,
      latestReviewsRaw,
      recentConnectedRepos,
      recentReviewsForActivity
    ] = await Promise.all([
      // 1. Total repositories
      Repository.countDocuments({ userId }),

      // 2. Connected repositories
      Repository.countDocuments({ userId, isConnected: true }),

      // 3. Completed reviews
      Review.countDocuments({ userId, status: 'completed' }),

      // 4. Pending reviews
      Review.countDocuments({ userId, status: 'pending' }),

      // 5. Failed reviews
      Review.countDocuments({ userId, status: 'failed' }),

      // 6. Project security and logic findings for score computations
      Review.find({ userId, status: 'completed' }).select('securityFindings logicFindings'),

      // 7. Category breakdown aggregation
      Review.aggregate([
        { $match: { userId: userObjectId, status: 'completed' } },
        { $group: { _id: { $ifNull: ['$triageCategory', 'general'] }, count: { $sum: 1 } } },
        { $project: { category: '$_id', count: 1, _id: 0 } }
      ]),

      // 8. Repository breakdown aggregation
      Review.aggregate([
        { $match: { userId: userObjectId, status: 'completed' } },
        {
          $group: {
            _id: '$repositoryId',
            count: { $sum: 1 },
            reviews: { $push: { securityFindings: '$securityFindings', logicFindings: '$logicFindings' } }
          }
        },
        {
          $lookup: {
            from: 'repositories',
            localField: '_id',
            foreignField: '_id',
            as: 'repo'
          }
        },
        { $unwind: '$repo' },
        {
          $project: {
            repositoryId: '$_id',
            name: '$repo.fullName',
            count: 1,
            reviews: 1,
            _id: 0
          }
        }
      ]),

      // 9. Review trend aggregation (past 7 days)
      Review.aggregate([
        { $match: { userId: userObjectId, status: 'completed', createdAt: { $gte: sevenDaysAgo } } },
        { $project: { date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, securityFindings: 1, logicFindings: 1 } },
        {
          $group: {
            _id: '$date',
            count: { $sum: 1 },
            reviews: { $push: { securityFindings: '$securityFindings', logicFindings: '$logicFindings' } }
          }
        },
        { $sort: { _id: 1 } }
      ]),

      // 10. Latest 5 reviews populated with repository details
      Review.find({ userId })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('repositoryId', 'fullName owner name'),

      // 11. Latest 5 connected repositories for activity timeline
      Repository.find({ userId, isConnected: true }).sort({ updatedAt: -1 }).limit(5),

      // 12. Latest 5 reviews for activity timeline
      Review.find({ userId }).sort({ createdAt: -1 }).limit(5).populate('repositoryId', 'fullName')
    ]);

    // Calculate Average Quality Score and total Security Alerts in memory
    let totalScore = 0;
    let securityAlerts = 0;

    for (const rev of completedReviewsData) {
      const security = rev.securityFindings || [];
      const logic = rev.logicFindings || [];

      securityAlerts += security.length;
      totalScore += calculateReviewScore(security, logic);
    }

    const averageQualityScore = completedReviewsData.length > 0
      ? Math.round((totalScore / completedReviewsData.length) * 10) / 10
      : 100;

    // Format category breakdown
    const categoryBreakdown = categoryBreakdownRaw.map((c) => ({
      category: c.category,
      count: c.count
    }));

    // Format repository breakdown with dynamically computed average scores
    const repositoryBreakdown = repoBreakdownRaw.map((r) => {
      let repoTotalScore = 0;
      const reviewsList = r.reviews || [];

      for (const rev of reviewsList) {
        repoTotalScore += calculateReviewScore(rev.securityFindings, rev.logicFindings);
      }

      const avgScore = reviewsList.length > 0 ? Math.round((repoTotalScore / reviewsList.length) * 10) / 10 : 100;

      return {
        name: r.name,
        count: r.count,
        avgScore
      };
    });

    // Format review trend with daily average scores
    const reviewTrend = trendDataRaw.map((t) => {
      let dayTotalScore = 0;
      const dayReviews = t.reviews || [];

      for (const rev of dayReviews) {
        dayTotalScore += calculateReviewScore(rev.securityFindings, rev.logicFindings);
      }

      const avgScore = dayReviews.length > 0 ? Math.round((dayTotalScore / dayReviews.length) * 10) / 10 : 100;

      return {
        date: t._id,
        count: t.count,
        avgScore
      };
    });

    // Build Recent Activity Feed dynamically from database events
    const activityEvents: Array<{ type: string; repoName: string; timestamp: Date; details?: string; score?: number }> = [];

    // Add repository connection events
    for (const repo of recentConnectedRepos) {
      activityEvents.push({
        type: 'repo_connected',
        repoName: repo.fullName,
        timestamp: repo.updatedAt
      });
    }

    // Add review lifecycle events
    for (const rev of recentReviewsForActivity) {
      const repoName = (rev.repositoryId as any)?.fullName || 'unknown';
      if (rev.status === 'completed') {
        const score = calculateReviewScore(rev.securityFindings, rev.logicFindings);
        activityEvents.push({
          type: 'review_completed',
          repoName,
          timestamp: rev.createdAt,
          details: `PR #${rev.prNumber}: ${rev.prTitle}`,
          score
        });
      } else if (rev.status === 'failed') {
        activityEvents.push({
          type: 'review_failed',
          repoName,
          timestamp: rev.createdAt,
          details: `PR #${rev.prNumber}: ${rev.prTitle}`
        });
      } else if (rev.status === 'pending') {
        activityEvents.push({
          type: 'review_pending',
          repoName,
          timestamp: rev.createdAt,
          details: `PR #${rev.prNumber}: ${rev.prTitle}`
        });
      }
    }

    // Sort combined events chronologically and slice to the top 5
    const recentActivity = activityEvents
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 5);

    // Format the latest reviews response list
    const latestReviews = latestReviewsRaw.map((rev) => {
      const repo = rev.repositoryId as any;
      return {
        id: rev._id.toString(),
        repositoryId: repo?._id?.toString() || '',
        repositoryName: repo?.name || '',
        repositoryOwner: repo?.owner || '',
        repositoryFullName: repo?.fullName || '',
        prNumber: rev.prNumber,
        prTitle: rev.prTitle,
        triageCategory: rev.triageCategory || null,
        status: rev.status,
        createdAt: rev.createdAt
      };
    });

    res.status(200).json({
      overview: {
        repositoriesTotal: reposTotal,
        repositoriesConnected: reposConnected,
        reviewsCompleted,
        reviewsPending,
        reviewsFailed,
        averageQualityScore,
        securityAlerts
      },
      reviewTrend,
      categoryBreakdown,
      repositoryBreakdown,
      recentActivity,
      latestReviews
    });
  } catch (error: any) {
    console.error('Failed to retrieve dashboard data:', error);
    res.status(500).json({ error: error.message || 'Internal database aggregation failure' });
  }
};
