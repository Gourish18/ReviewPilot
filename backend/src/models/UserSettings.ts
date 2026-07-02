import mongoose from 'mongoose';

const { Schema, model, models } = mongoose;

export interface IUserSettings {
  userId: mongoose.Types.ObjectId;
  preferredLLMProvider: 'gemini' | 'openai' | 'anthropic' | 'local';
  preferredModel: string;
  temperature: number;
  maxTokens: number;
  reviewDepth: 'shallow' | 'standard' | 'deep';
  enableSecurityReview: boolean;
  enableLogicReview: boolean;
  enableArchitectureReview: boolean;
  enablePerformanceReview: boolean;
  enableComments: boolean;
  enableSummary: boolean;
  notificationPreferences: {
    email: boolean;
    slack: boolean;
  };
  defaultRepositoryBehavior: 'opt-in' | 'opt-out';
  createdAt: Date;
  updatedAt: Date;
}

const userSettingsSchema = new Schema<IUserSettings>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      unique: true,
      index: true,
    },
    preferredLLMProvider: {
      type: String,
      enum: ['gemini', 'openai', 'anthropic', 'local'],
      default: 'gemini',
    },
    preferredModel: {
      type: String,
      default: 'gemini-2.5-flash',
    },
    temperature: {
      type: Number,
      default: 0.1,
      min: 0.0,
      max: 1.0,
    },
    maxTokens: {
      type: Number,
      default: 2048,
    },
    reviewDepth: {
      type: String,
      enum: ['shallow', 'standard', 'deep'],
      default: 'standard',
    },
    enableSecurityReview: {
      type: Boolean,
      default: true,
    },
    enableLogicReview: {
      type: Boolean,
      default: true,
    },
    enableArchitectureReview: {
      type: Boolean,
      default: true,
    },
    enablePerformanceReview: {
      type: Boolean,
      default: true,
    },
    enableComments: {
      type: Boolean,
      default: true,
    },
    enableSummary: {
      type: Boolean,
      default: true,
    },
    notificationPreferences: {
      email: { type: Boolean, default: true },
      slack: { type: Boolean, default: false },
    },
    defaultRepositoryBehavior: {
      type: String,
      enum: ['opt-in', 'opt-out'],
      default: 'opt-in',
    },
  },
  {
    timestamps: true,
  }
);

export const UserSettings = models.UserSettings || model<IUserSettings>('UserSettings', userSettingsSchema);
