import mongoose from 'mongoose';
import { Repository } from '../models/Repository.js';
import { IGithubRepository } from './githubApi.service.js';

/**
 * Synchronizes a list of repositories fetched from GitHub into MongoDB.
 * Keeps local metadata in sync with GitHub, inserts new repositories, and preserves connection states.
 * 
 * @param userId The database record ID of the user owning these repositories.
 * @param githubRepos An array of raw repositories fetched from the GitHub API.
 * @returns The raw bulkWrite execution result from Mongoose.
 * @throws Error if database write fails.
 */
export async function syncRepositories(
  userId: string,
  githubRepos: IGithubRepository[]
): Promise<any> {
  // Handle empty array case: Return successful no-op representation to avoid Mongoose exceptions on empty operations
  if (githubRepos.length === 0) {
    return {
      ok: 1,
      writeErrors: [],
      writeConcernErrors: [],
      insertedIds: {},
      upsertedIds: {},
      insertedCount: 0,
      upsertedCount: 0,
      matchedCount: 0,
      modifiedCount: 0,
      removedCount: 0,
      upsertedItems: [],
    };
  }

  const operations = githubRepos.map((repo) => {
    return {
      updateOne: {
        // Uniquely identify the record using user ID and GitHub repository ID (compound index)
        filter: {
          userId: new mongoose.Types.ObjectId(userId),
          githubRepoId: repo.id,
        },
        update: {
          // Overwrite/Update GitHub-controlled metadata fields
          $set: {
            owner: repo.owner.login,
            name: repo.name,
            fullName: repo.full_name,
            description: repo.description || undefined,
            language: repo.language || undefined,
            private: repo.private,
          },
          // Set defaults ONLY when inserting new repositories
          // This preserves any existing local connection state (isConnected) on existing repositories
          $setOnInsert: {
            isConnected: false,
          },
        },
        upsert: true,
      },
    };
  });

  try {
    const result = await Repository.bulkWrite(operations);
    return result;
  } catch (error: any) {
    throw new Error(`Repository database synchronization failed: ${error.message}`);
  }
}
