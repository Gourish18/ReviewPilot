import mongoose from 'mongoose';

const { Schema, model, models } = mongoose;

/**
 * Interface representing the structure of a User document in MongoDB.
 */
export interface IUser {
  githubId: number;
  username: string;
  email?: string;
  avatarUrl?: string;
  accessToken?: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    // githubId uniquely identifies the user's GitHub identity.
    // Index allows fast lookups during OAuth authentication.
    githubId: {
      type: Number,
      required: [true, 'GitHub ID is required'],
      unique: true,
      index: true,
    },
    // username is the user's primary GitHub username.
    username: {
      type: String,
      required: [true, 'Username is required'],
      trim: true,
    },
    // email is optional since some users hide their emails on GitHub.
    email: {
      type: String,
      trim: true,
    },
    // avatarUrl stores the link to GitHub profile photo for frontend display.
    avatarUrl: {
      type: String,
      trim: true,
    },
    // accessToken is stored for repository and PR sync API requests.
    accessToken: {
      type: String,
      trim: true,
    },
  },
  {
    // Timestamps automatically manage createdAt and updatedAt fields.
    timestamps: true,
  }
);

// Prevent model overwrite errors during development/hot-reloading in TSX/Next.js
export const User = models.User || model<IUser>('User', userSchema);
