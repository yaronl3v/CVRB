#!/usr/bin/env node

/**
 * CVRB Batch World Creator
 *
 * Generates one or more CVRB worlds in parallel using the new
 * CVRB.generateWorlds API.
 *
 * Creates the amount of worlds specified in WORLDS_COUNT below.
 */

import { CVRB } from '../CVRB/CVRB.js';
import { ModelsConfig } from '../openrouter/models.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// ----------------------------------------------------------------------------
// Environment
// ----------------------------------------------------------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Load environment variables from the server root (.env file alongside package.json)
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });




// ----------------------------------------------------------------------------
// Configuration
// ----------------------------------------------------------------------------
const WORLDS_COUNT = 2; // Default number of worlds to create
const CREATOR_MODEL = ModelsConfig.CLAUDE_4_OPUS;
const VALIDATOR_MODELS = [ModelsConfig.O3];

// ----------------------------------------------------------------------------
// Main
// ----------------------------------------------------------------------------
async function main() {
 
  const cvrb = new CVRB();

  try {
    await cvrb.generateWorlds(WORLDS_COUNT, CREATOR_MODEL, {
      validatorModels: VALIDATOR_MODELS,
      saveToDb: true,
      runValidation: true,
    });

    console.log(`Finished creating ${WORLDS_COUNT} worlds.`);
  } catch (error) {
    console.error('Batch CVRB creation failed:', error);
    process.exit(1);
  } finally {
    // Only close the DB connection once, after all worlds are created
    await cvrb.close();
  }
}

main();