import mongoose from 'mongoose';

const { Schema, model, models } = mongoose;

/**
 * Interface representing the structure of a PR Review document in MongoDB.
 */
export interface IReview {
  userId: mongoose.Types.ObjectId;
  repositoryId: mongoose.Types.ObjectId;
  prNumber: number;
  prTitle: string;
  commitSha?: string;
  triageCategory?: string;
  securityFindings: string[];
  logicFindings: string[];
  markdownReport: string;
  status: 'pending' | 'completed' | 'failed';
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new Schema<IReview>(
  {
    // userId links the review to the User who triggered it or owns the repository
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    // repositoryId links the review to the Repository being analyzed
    repositoryId: {
      type: Schema.Types.ObjectId,
      ref: 'Repository',
      required: [true, 'Repository ID is required'],
      index: true,
    },
    // prNumber tracks the GitHub pull request identifier
    prNumber: {
      type: Number,
      required: [true, 'PR number is required'],
      index: true,
    },
    // prTitle stores the title of the pull request at the time of review
    prTitle: {
      type: String,
      required: [true, 'PR title is required'],
      trim: true,
    },
    // commitSha tracks the specific git commit hash that was reviewed
    commitSha: {
      type: String,
      trim: true,
    },
    // triageCategory holds the PR classification assigned by LangGraph (e.g. frontend, backend)
    triageCategory: {
      type: String,
      trim: true,
    },
    // securityFindings stores the list of security vulnerabilities identified in the PR
    securityFindings: {
      type: [String],
      default: [],
    },
    // logicFindings stores the list of logical, correctness, or architectural improvements
    logicFindings: {
      type: [String],
      default: [],
    },
    // markdownReport stores the final compiled review summary text in Markdown format
    markdownReport: {
      type: String,
      default: '',
    },
    // status tracks the state of the automated review execution
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'pending',
      required: [true, 'Status is required'],
      index: true,
    },
  },
  {
    // Timestamps automatically maintain createdAt and updatedAt fields for auditing
    timestamps: true,
  }
);

// Compound index for fast lookup and sorting of reviews belonging to a specific repository
reviewSchema.index({ repositoryId: 1, prNumber: 1 });

// Prevent model overwrite issues during hot-reloading in development
export const Review = models.Review || model<IReview>('Review', reviewSchema);
