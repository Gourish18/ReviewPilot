import { connectDatabase, disconnectDatabase } from './config/database.js';
import { User } from './models/User.js';
import { Repository } from './models/Repository.js';
import { Review } from './models/Review.js';
import { env } from './config/env.js';

async function checkRealDatabase() {
  console.log('=== Real-World Production Validation: DB & Env ===');
  
  // 1. Check Env Config
  console.log('\n--- Environment Configuration ---');
  console.log('NODE_ENV:', env.nodeEnv);
  console.log('PORT:', env.port);
  console.log('FRONTEND_URL:', env.frontendUrl);
  console.log('GITHUB_CLIENT_ID:', env.githubClientId ? 'CONFIGURED' : 'MISSING');
  console.log('GITHUB_CLIENT_SECRET:', env.githubClientSecret ? 'CONFIGURED' : 'MISSING');
  console.log('GITHUB_CALLBACK_URL:', env.githubCallbackUrl);
  console.log('GITHUB_WEBHOOK_SECRET:', env.githubWebhookSecret ? 'CONFIGURED' : 'MISSING');
  
  const isMock = !env.geminiApiKey || env.geminiApiKey.startsWith('mock_') || !env.geminiApiKey.startsWith('AIzaSy');
  console.log('GEMINI_API_KEY Type:', isMock ? 'MOCK/OFFLINE BYPASS KEY' : 'REAL GEMINI KEY');
  
  // 2. Connect to DB
  console.log('\n--- Database Connection ---');
  try {
    await connectDatabase();
    console.log('MongoDB connection successful.');
  } catch (err: any) {
    console.error('MongoDB connection failed:', err.message || err);
    process.exit(1);
  }
  
  try {
    // 3. Query Users
    console.log('\n--- Users In Database ---');
    const usersCount = await User.countDocuments();
    console.log('Total Users:', usersCount);
    const sampleUsers = await User.find().limit(5);
    sampleUsers.forEach(u => {
      console.log(`- Username: ${u.username}, GitHub ID: ${u.githubId}, Email: ${u.email || 'N/A'}, Token: ${u.accessToken ? 'PRESENT' : 'MISSING'}`);
    });
    
    // 4. Query Repositories
    console.log('\n--- Repositories In Database ---');
    const reposCount = await Repository.countDocuments();
    console.log('Total Repositories:', reposCount);
    const connectedRepos = await Repository.countDocuments({ isConnected: true });
    console.log('Connected Repositories:', connectedRepos);
    const sampleRepos = await Repository.find().limit(5);
    sampleRepos.forEach(r => {
      console.log(`- Full Name: ${r.fullName}, Connected: ${r.isConnected}, Owner: ${r.owner}`);
    });
    
    // 5. Query Reviews
    console.log('\n--- Reviews In Database ---');
    const reviewsCount = await Review.countDocuments();
    console.log('Total Reviews:', reviewsCount);
    const completedReviews = await Review.countDocuments({ status: 'completed' });
    console.log('Completed Reviews:', completedReviews);
    const pendingReviews = await Review.countDocuments({ status: 'pending' });
    console.log('Pending Reviews:', pendingReviews);
    const failedReviews = await Review.countDocuments({ status: 'failed' });
    console.log('Failed Reviews:', failedReviews);
    
    const sampleReviews = await Review.find().sort({ createdAt: -1 }).limit(3).populate('repositoryId', 'fullName');
    sampleReviews.forEach(rev => {
      const repo = rev.repositoryId as any;
      console.log(`- Review ID: ${rev._id}`);
      console.log(`  Repo: ${repo?.fullName || 'N/A'}`);
      console.log(`  PR: #${rev.prNumber} - ${rev.prTitle}`);
      console.log(`  Status: ${rev.status}, Category: ${rev.triageCategory || 'N/A'}`);
      console.log(`  Security Findings Count: ${rev.securityFindings?.length || 0}`);
      console.log(`  Logic Findings Count: ${rev.logicFindings?.length || 0}`);
      console.log(`  Markdown Report Length: ${rev.markdownReport?.length || 0}`);
      console.log(`  Created At: ${rev.createdAt.toISOString()}`);
    });
    
  } catch (err: any) {
    console.error('Failed to query database collections:', err.message || err);
  } finally {
    console.log('\nDisconnecting from database...');
    await disconnectDatabase();
    console.log('Database disconnected.');
  }
}

checkRealDatabase();
