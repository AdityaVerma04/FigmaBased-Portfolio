/**
 * Vercel Web Analytics Integration
 * 
 * This file initializes Vercel Web Analytics for the portfolio.
 * The inject function automatically tracks page views and sets up the analytics script.
 * 
 * Learn more: https://vercel.com/docs/analytics/quickstart
 */

import { inject } from '@vercel/analytics';

// Initialize Vercel Web Analytics
// The 'auto' mode automatically detects the environment
// - In production: sends events to Vercel
// - In development: logs events to the console
inject({ mode: 'auto' });
