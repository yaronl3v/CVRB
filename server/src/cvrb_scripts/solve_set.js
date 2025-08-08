#!/usr/bin/env node

/**
 * CVRB Solve Set – Delegates to the CVRB facade to solve a set (or all) worlds
 * using the provided solver models. Keeps configuration in-code for simplicity.
 */

import { CVRB } from '../CVRB/CVRB.js';
import { ModelsConfig } from '../openrouter/models.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load env from project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

// ----------------------------- CONFIGURATION ------------------------------ //

// Default set to solve; change here when needed
const setId = 1;

// Choose solver models here
const solverModels = [
  ModelsConfig.GPT_4o,
  ModelsConfig.GPT_5,
];

// ------------------------------ EXECUTION ------------------------------- //

(async () => {
  const cvrb = new CVRB();
  try {
    const results = await cvrb.solveSet(setId, { solverModels, parallelModels: true });
    console.log('🎯  Solve set complete');
    const worldCount = Object.keys(results).length;
    console.log(`Processed worlds: ${worldCount}`);
  } catch (err) {
    console.error('Fatal error:', err);
    process.exit(1);
  } finally {
    await cvrb.close();
  }
})();


