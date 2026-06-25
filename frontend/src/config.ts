/**
 * Centralized API configuration for ReviewPilot.
 * Dynamically resolves the backend API URL from the environment,
 * sanitizes trailing slashes, and falls back to localhost:8000 if unset.
 */
const rawApiUrl = process.env.NEXT_PUBLIC_API_URL;

export const API_URL = (rawApiUrl && rawApiUrl.trim() !== '' && rawApiUrl.trim() !== '/')
  ? rawApiUrl.trim().replace(/\/$/, '')
  : 'http://localhost:8000';
