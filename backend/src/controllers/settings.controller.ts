import { Request, Response } from 'express';
import { UserSettings } from '../models/UserSettings.js';
import { PROVIDERS_REGISTRY } from '../config/providers.js';

/**
 * Retrieves the supported providers and models registry configurations.
 */
export const getSupportedProviders = async (req: Request, res: Response): Promise<void> => {
  res.status(200).json({ success: true, providers: PROVIDERS_REGISTRY });
};

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

  const { preferredLLMProvider, preferredModel, temperature, maxTokens } = req.body;

  // 1. Strict LLM Provider and Model validations
  if (preferredLLMProvider !== undefined) {
    const provider = PROVIDERS_REGISTRY.find(p => p.id === preferredLLMProvider);
    if (!provider) {
      res.status(400).json({ error: `Invalid provider: '${preferredLLMProvider}' is not supported.` });
      return;
    }
    if (!provider.enabled) {
      res.status(400).json({ error: `Provider '${provider.displayName}' is coming soon and cannot be selected.` });
      return;
    }
    
    if (preferredModel !== undefined) {
      const model = provider.models.find(m => m.id === preferredModel);
      if (!model) {
        res.status(400).json({ error: `Invalid model: '${preferredModel}' is not supported for provider '${provider.displayName}'.` });
        return;
      }
    }
  }

  // 2. Temperature boundary validation
  if (temperature !== undefined) {
    const tempNum = Number(temperature);
    if (isNaN(tempNum) || tempNum < 0.0 || tempNum > 1.0) {
      res.status(400).json({ error: 'Temperature must be a number between 0.0 and 1.0.' });
      return;
    }
  }

  // 3. Max Tokens boundary validation
  if (maxTokens !== undefined) {
    const tokensNum = Number(maxTokens);
    if (isNaN(tokensNum) || tokensNum < 1 || tokensNum > 100000) {
      res.status(400).json({ error: 'Max Tokens must be a positive integer.' });
      return;
    }
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
