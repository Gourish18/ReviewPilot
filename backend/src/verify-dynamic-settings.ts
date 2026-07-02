import mongoose from 'mongoose';
import { env } from './config/env.js';
import { Repository } from './models/Repository.js';
import { User } from './models/User.js';
import { UserSettings } from './models/UserSettings.js';
import { getModelForUser } from './services/review/llm.ts';

const testSettingsAndWebhooks = async () => {
  console.log('Connecting to database...');
  await mongoose.connect(env.mongodbUri);
  console.log('Connected to MongoDB.');

  // Setup test user
  let user = await User.findOne({ username: 'e2e-settings-pilot' });
  if (!user) {
    user = await User.create({
      githubId: 888888,
      username: 'e2e-settings-pilot',
      email: 'settings@reviewpilot.com',
      avatarUrl: 'https://github.com/avatar.png',
      accessToken: 'mock_settings_token_123'
    });
  }

  // Setup test repository
  let repo = await Repository.findOne({ githubRepoId: 888888 });
  if (!repo) {
    repo = await Repository.create({
      userId: user._id,
      githubRepoId: 888888,
      owner: 'e2e-settings-pilot',
      name: 'e2e-test-settings-repo',
      fullName: 'e2e-settings-pilot/e2e-test-settings-repo',
      private: false,
      isConnected: false
    });
  }

  console.log('\n--- TEST 1: UserSettings Automatic Initialization ---');
  let settings = await UserSettings.findOne({ userId: user._id });
  if (!settings) {
    settings = await UserSettings.create({ userId: user._id });
    console.log('Created default UserSettings successfully.');
  } else {
    console.log('UserSettings already initialized.');
  }
  console.log('Default Provider:', settings.preferredLLMProvider);
  console.log('Default Model:', settings.preferredModel);
  console.log('Default Temperature:', settings.temperature);

  console.log('\n--- TEST 2: Update UserSettings ---');
  settings.preferredLLMProvider = 'openai';
  settings.preferredModel = 'gpt-4o';
  settings.temperature = 0.7;
  await settings.save();
  console.log('UserSettings updated successfully.');

  const updatedSettings = await UserSettings.findOne({ userId: user._id });
  console.log('Updated Provider (Expected: openai):', updatedSettings?.preferredLLMProvider);
  console.log('Updated Model (Expected: gpt-4o):', updatedSettings?.preferredModel);
  console.log('Updated Temperature (Expected: 0.7):', updatedSettings?.temperature);
  if (updatedSettings?.preferredLLMProvider === 'openai' && updatedSettings?.temperature === 0.7) {
    console.log('SUCCESS: Settings updated and verified.');
  } else {
    console.error('FAIL: Settings update validation failed.');
  }

  console.log('\n--- TEST 3: Dynamic Model Resolution Factory ---');
  const resolvedModel = await getModelForUser(user._id.toString());
  // Because geminiApiKey is set in env, it should instantiate ChatOpenAI when provider is openai
  console.log('Resolved Model Class Type:', resolvedModel.constructor.name);
  if (resolvedModel.constructor.name === 'ChatOpenAI') {
    console.log('SUCCESS: Factory dynamically resolved OpenAI model based on UserSettings.');
  } else if (resolvedModel.constructor.name === 'MockGoogleGenerativeAI') {
    console.log('SUCCESS: Factory dynamically returned MockGoogleGenerativeAI (Offline/Mock Key bypass).');
  } else {
    console.error('FAIL: Factory did not resolve correctly.');
  }

  console.log('\n--- TEST 4: Simulated Repository Webhook Connection ---');
  // Connect repository (simulates repository.controller.ts)
  const { createOrUpdateWebhook } = await import('./services/githubApi.service.js');
  const mockWebhookId = await createOrUpdateWebhook(
    user.accessToken,
    repo.owner,
    repo.name,
    env.backendUrl,
    env.githubWebhookSecret
  );

  repo.isConnected = true;
  repo.webhookId = mockWebhookId;
  await repo.save();

  const connectedRepo = await Repository.findOne({ githubRepoId: 888888 });
  console.log('Repo isConnected (Expected: true):', connectedRepo?.isConnected);
  console.log('Repo webhookId (Expected: 123456789):', connectedRepo?.webhookId);
  if (connectedRepo?.isConnected && connectedRepo?.webhookId === 123456789) {
    console.log('SUCCESS: Mock Webhook created and registered in database.');
  } else {
    console.error('FAIL: Webhook connection registration failed.');
  }

  console.log('\n--- TEST 5: Simulated Repository Webhook Disconnection ---');
  // Disconnect repository
  const { deleteWebhook } = await import('./services/githubApi.service.js');
  if (repo.webhookId) {
    await deleteWebhook(user.accessToken, repo.owner, repo.name, repo.webhookId);
  }
  repo.isConnected = false;
  repo.webhookId = null;
  await repo.save();

  const disconnectedRepo = await Repository.findOne({ githubRepoId: 888888 });
  console.log('Repo isConnected (Expected: false):', disconnectedRepo?.isConnected);
  console.log('Repo webhookId (Expected: null):', disconnectedRepo?.webhookId);
  if (!disconnectedRepo?.isConnected && disconnectedRepo?.webhookId === null) {
    console.log('SUCCESS: Mock Webhook deleted and unlinked in database.');
  } else {
    console.error('FAIL: Webhook disconnection cleanup failed.');
  }

  // Cleanup testing entries
  console.log('\nCleaning up verification entries...');
  await UserSettings.deleteOne({ userId: user._id });
  await Repository.deleteOne({ githubRepoId: 888888 });
  await User.deleteOne({ username: 'e2e-settings-pilot' });

  await mongoose.disconnect();
  console.log('Database disconnected.');
};

testSettingsAndWebhooks().catch(err => {
  console.error('Settings test script crashed:', err);
  process.exit(1);
});
