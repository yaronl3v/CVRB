#!/usr/bin/env node

/**
 * Build DB Tables
 *
 * Creates or updates the `worlds` and `solutions` tables to match the Sequelize
 * models. Runs `sync({ alter: true })` which will add any missing columns or
 * indexes without dropping data.
 *
 * Usage: node src/cvrb_scripts/build_db.js
 */

import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

import db from '../db.js';
import World from '../models/World.js';
import Solution from '../models/Solution.js';

// -----------------------------------------------------------------------------
// Environment
// -----------------------------------------------------------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

// -----------------------------------------------------------------------------
// Builder
// -----------------------------------------------------------------------------
class DBBuilder {
  async run() {
    const connected = await db.testConnection();
    if (!connected) {
      console.error('Exiting: could not establish DB connection');
      process.exit(1);
    }

    // Create/update tables – run worlds first so FK on solutions is satisfied
    await World.sync({ alter: true });
    await Solution.sync({ alter: true });

    console.log('✅ Tables are in sync with Sequelize models.');

    await db.close();
  }
}

// -----------------------------------------------------------------------------
// Main
// -----------------------------------------------------------------------------
async function main() {
  const builder = new DBBuilder();
  try {
    await builder.run();
  } catch (err) {
    console.error('Build failed:', err);
    process.exit(1);
  }
}

main();
