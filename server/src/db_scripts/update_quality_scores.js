#!/usr/bin/env node

/**
 * Retroactive World Quality-Score Updater
 *
 * Scans every world in the database, gathers the latest score of each solver
 * model for that world, computes the quality score using `quality()` and
 * persists the result to the `worlds` table (`quality_score` column).
 *
 * Run:  node src/cvrb_scripts/update_quality_scores.js
 */

import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

import db from '../db.js';
import { quality } from '../CVRB/helpers/quality.js';
import { WorldHelpers } from '../models/World.js';
import { SolutionHelpers } from '../models/Solution.js';
import World from '../models/World.js';

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Load .env from project root
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

/**
 * Fetch unique per-model scores for the given world.
 * @param {number} worldId
 * @returns {Promise<number[]>} Array of numeric scores (0-100)
 */
async function fetchWorldScores (worldId) {
  const solutions = await SolutionHelpers.getSolutionsByWorldId(worldId);
  return solutions
    .map((s) => {
      // Convert to numeric; treat null/undefined/NaN as 0 (worst score)
      let numeric = typeof s.score === 'string' ? parseFloat(s.score) : s.score;
      if (!Number.isFinite(numeric)) numeric = 0;
      return numeric;
    });
}

/**
 * Compute quality score and persist if it differs from current value.
 * Uses Q = 100 because stored scores are percentages.
 *
 * @param {Object} world Sequelize world row (dataValues)
 */
async function updateWorldQuality (world) {

  const scores = await fetchWorldScores(world.id);

  // Need at least two scores to compute separation – quality() will return 0 otherwise.
  if (scores.length < 2) {
    console.log(`World ${world.id}: skipped – only ${scores.length} score(s).`);
    return;
  }

  
  const newQuality = quality(scores, 100);

  // Only update when quality actually changed to avoid unnecessary writes.
  if (Math.abs((world.quality_score || 0) - newQuality) < 1e-6) {
    console.log(`World ${world.id}: quality unchanged (${newQuality.toFixed(3)}).`);
    return;
  }

  await WorldHelpers.updateQualityScore(world.id, newQuality);
  console.log(`World ${world.id}: quality_score updated → ${newQuality.toFixed(3)}`);
}

// ---------------------------------------------------------------------------
// Main execution
// ---------------------------------------------------------------------------

(async function main () {
  try {
    const worlds = await World.findAll({ order: [['id', 'ASC']] });

    for (const worldInstance of worlds) {
      const world = worldInstance.dataValues || worldInstance;
      // eslint-disable-next-line no-await-in-loop
      await updateWorldQuality(world);
    }

    console.log('\n✅  Quality-score update complete.');
  } catch (err) {
    console.error('❌  Failed to update quality scores:', err);
  } finally {
    await db.close();
  }
})();

