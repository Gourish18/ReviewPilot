import { Request, Response } from 'express';
import { UserSettings } from '../models/UserSettings.js';

/**
 * Retrieves the authenticated user's settings. Creates default settings if none exist.
 */
export const getUserSettings = async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    let settings = await UserSettings.findOne({ userId });
    if (!settings) {
      settings = await UserSettings.create({ userId });
    }

    res.status(200).json({ success: true, settings });
  } catch (error: any) {
    console.error('Failed to retrieve user settings:', error);
    res.status(500).json({ error: 'Failed to retrieve settings from the database' });
  }
};

/**
 * Updates the authenticated user's settings.
 */
export const updateUserSettings = async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const settings = await UserSettings.findOneAndUpdate(
      { userId },
      { ...req.body },
      { new: true, upsert: true, runValidators: true }
    );

    res.status(200).json({ success: true, settings });
  } catch (error: any) {
    console.error('Failed to update user settings:', error);
    res.status(500).json({ error: 'Failed to update settings in the database' });
  }
};
