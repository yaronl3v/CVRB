#!/usr/bin/env node

/**
 * CVRB Solver – Slim entry point that delegates to the SolverController via the
 * main CVRB facade. This script runs with hardcoded configuration values and:
 *  1. Uses a hardcoded CVRB ID to solve
 *  2. Uses a hardcoded array of solver models (currently just O3)
 *  3. Calls `CVRB.solveWorld` which handles everything – solving, evaluation
 *     and persisting the results in the `solutions` table.
 */

import { CVRB } from '../CVRB/CVRB.js';
import { ModelsConfig } from '../openrouter/models.js';
import { WorldHelpers } from '../models/World.js';
import { quality } from '../CVRB/helpers/quality.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load env from project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

// ----------------------------- CONFIGURATION ------------------------------ //

// Configure these settings directly in the code
// 1. Provide default CVRB IDs here (used when no CLI args supplied)
const DEFAULT_WORLD_IDS = [81,79,73,74,75,76,65,67,69,64]
// Optionally override defaults via CLI: `node solve_world.js 5 6 7`
const cliWorldIds = process.argv.slice(2).map(Number).filter(Boolean);
const worldIds = cliWorldIds.length ? cliWorldIds : DEFAULT_WORLD_IDS;

// quick test
// const solverModels = [
//   ModelsConfig.GROK_4,
//   ModelsConfig.O3,
//   ModelsConfig.O4_MINI_HIGH,
//   ModelsConfig.GEMINI_2_5_PRO,
//   ModelsConfig.GEMINI_2_5_FLASH,  
//   ModelsConfig.CLAUDE_4_OPUS,
//   ModelsConfig.CLAUDE_4_SONNET,
//   ModelsConfig.DEEPSEEK_R1,
//   ModelsConfig.QWEN3_THINKING,
// ]; 

const solverModels = [
  ModelsConfig.GPT_4o,  
  // ModelsConfig.CLAUDE_4_SONNET,  
  // ModelsConfig.CLAUDE_4_OPUS,  
]; 

// ------------------------------ EXECUTION ------------------------------- //

(async () => {
  const cvrb = new CVRB();
  try {

    const resultsByWorld = await cvrb.solveWorlds(worldIds, { solverModels, parallelModels: true });
    console.log('🎯  Solving complete – stored solution records:');

  } catch (err) {
    console.error('Fatal error:', err);
    process.exit(1);
  } finally {
    await cvrb.close();
  }
})();
