import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Review, IReview } from '../models/Review.js';

interface PopulatedRepository {
  _id: mongoose.Types.ObjectId;
  name: string;
  owner: string;
  fullName: string;
}

const isPopulated = (doc: any): doc is PopulatedRepository => {
  return doc && typeof doc === 'object' && 'fullName' in doc;
};

/**
 * Retrieves the paginated and filtered list of pull request reviews belonging to the authenticated user.
 * 
 * Supports optional filtering by `repositoryId`, custom pagination via `page`/`limit`, 
 * and populates the repository details (name, owner, fullName) cleanly.
 */
export const getReviews = async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId;

  // 1. Enforce Authentication
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  // 2. Parse and Validate Query Parameters
  let page = parseInt(req.query.page as string || '1', 10);
  let limit = parseInt(req.query.limit as string || '20', 10);
  const repositoryId = req.query.repositoryId as string;

  if (isNaN(page) || page < 1) {
    res.status(400).json({ error: 'Invalid page parameter. Must be an integer >= 1.' });
    return;
  }

  if (isNaN(limit) || limit < 1) {
    res.status(400).json({ error: 'Invalid limit parameter. Must be an integer >= 1.' });
    return;
  }

  // Cap limit at 100 to protect database and prevent resource exhaustion
  if (limit > 100) {
    limit = 100;
  }

  const skip = (page - 1) * limit;

  try {
    // 3. Build Query Filter - strictly scoped to req.userId
    const filter: {
      userId: string;
      repositoryId?: mongoose.Types.ObjectId;
    } = { userId };

    if (repositoryId) {
      // Validate ObjectId format to prevent database casting exceptions
      if (!mongoose.Types.ObjectId.isValid(repositoryId)) {
        res.status(400).json({ error: 'Invalid repositoryId format' });
        return;
      }
      filter.repositoryId = new mongoose.Types.ObjectId(repositoryId);
    }

    // 4. Query Database (find with pagination + populate, parallelized with count)
    const [reviews, total] = await Promise.all([
      Review.find(filter)
        .sort({ createdAt: -1 }) // Newest first
        .skip(skip)
        .limit(limit)
        .populate('repositoryId', 'name owner fullName'), // Populate repository name & owner
      Review.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(total / limit);

    // 5. Format and Clean Response Shape for Frontend Consumption
    const cleanedReviews = reviews.map(review => {
      const repo = review.repositoryId;
      const hasRepo = isPopulated(repo);
      return {
        id: review._id.toString(),
        repositoryId: hasRepo ? repo._id.toString() : repo.toString(),
        repositoryName: hasRepo ? repo.name : 'N/A',
        repositoryOwner: hasRepo ? repo.owner : 'N/A',
        repositoryFullName: hasRepo ? repo.fullName : 'N/A',
        prNumber: review.prNumber,
        prTitle: review.prTitle,
        triageCategory: review.triageCategory || null,
        status: review.status,
        createdAt: review.createdAt
      };
    });

    // 6. Respond with paginated payload
    res.status(200).json({
      reviews: cleanedReviews,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    });
  } catch (error: any) {
    console.error('Failed to retrieve PR reviews:', error);
    res.status(500).json({ error: 'Database query failure occurred during reviews retrieval' });
  }
};

/**
 * Retrieves a single PR review document by its ID.
 * Enforces strict ownership checks to ensure users can only view their own reviews.
 */
export const getReviewById = async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId;
  const { id } = req.params;

  // 1. Enforce Authentication
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  // 2. Validate ObjectId format
  if (typeof id !== 'string' || !mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json({ error: 'Invalid review ID format' });
    return;
  }

  try {
    // 3. Query Review by ID and userId (ownership check) and populate repository details
    const review = await Review.findOne({ _id: id, userId })
      .populate('repositoryId', 'name owner fullName');

    // 4. Handle Not Found
    if (!review) {
      res.status(404).json({ error: 'Review not found' });
      return;
    }

    const repo = review.repositoryId;
    const hasRepo = isPopulated(repo);

    // 5. Respond with full review details
    res.status(200).json({
      id: review._id.toString(),
      repositoryId: hasRepo ? repo._id.toString() : repo.toString(),
      repositoryName: hasRepo ? repo.name : 'N/A',
      repositoryOwner: hasRepo ? repo.owner : 'N/A',
      repositoryFullName: hasRepo ? repo.fullName : 'N/A',
      prNumber: review.prNumber,
      prTitle: review.prTitle,
      commitSha: review.commitSha || null,
      status: review.status,
      triageCategory: review.triageCategory || null,
      securityFindings: review.securityFindings || [],
      logicFindings: review.logicFindings || [],
      markdownReport: review.markdownReport || '',
      createdAt: review.createdAt,
      updatedAt: review.updatedAt
    });
  } catch (error: any) {
    console.error('Failed to retrieve review detail:', error);
    res.status(500).json({ error: 'Database query failure occurred during review detail retrieval' });
  }
};

