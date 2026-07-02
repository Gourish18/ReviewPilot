import mongoose from 'mongoose';

const { Schema, model, models, Types } = mongoose;

/**
 * Interface representing the structure of a Repository document in MongoDB.
 */
export interface IRepository {
  userId: mongoose.Types.ObjectId;
  githubRepoId: number;
  owner: string;
  name: string;
  fullName: string;
  description?: string;
  language?: string;
  private: boolean;
  isConnected: boolean;
  webhookId?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

const repositorySchema = new Schema<IRepository>(
  {
    // userId links the repository to a specific user document.
    // References are used to normalize details and establish a relationship without duplicating user info.
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID reference is required'],
    },
    // githubRepoId stores the unique repository ID from GitHub.
    githubRepoId: {
      type: Number,
      required: [true, 'GitHub Repository ID is required'],
    },
    // owner stores the repository owner's username or organization name.
    owner: {
      type: String,
      required: [true, 'Repository owner is required'],
      trim: true,
    },
    // name is the repository's short name.
    name: {
      type: String,
      required: [true, 'Repository name is required'],
      trim: true,
    },
    // fullName represents owner/name, which is useful for direct API requests.
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
    },
    // description is optional repository details.
    description: {
      type: String,
      trim: true,
    },
    // language is the primary programming language of the codebase.
    language: {
      type: String,
      trim: true,
    },
    // private flags if the repository is private or public.
    private: {
      type: Boolean,
      required: true,
      default: false,
    },
    // isConnected tracks if the webhook/integration is active in ReviewPilot.
    isConnected: {
      type: Boolean,
      required: true,
      default: false,
    },
    // webhookId stores the GitHub webhook ID automatically provisioned for this repository
    webhookId: {
      type: Number,
      default: null,
    },
  },
  {
    // Timestamps automatically manage createdAt and updatedAt fields.
    timestamps: true,
  }
);

// Compound index on (userId, githubRepoId) guarantees that a user cannot link the same GitHub repository multiple times.
repositorySchema.index({ userId: 1, githubRepoId: 1 }, { unique: true });

// Prevent model overwrite errors during development/hot-reloading in TSX/Next.js
export const Repository = models.Repository || model<IRepository>('Repository', repositorySchema);
