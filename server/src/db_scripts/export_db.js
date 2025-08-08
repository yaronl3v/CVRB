#!/usr/bin/env node

/**
 * DB Exporter
 *
 * Dumps the `worlds` and `solutions` tables to JSON files that can be re-imported
 * later. The JSON files are saved under `server/src/db_exports` by default.
 *
 * Usage: node src/cvrb_scripts/export_db.js [outputDir]
 *   outputDir (optional) – relative directory name (default: db_exports)
 */

import fs from 'fs-extra';
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
// Helper class
// -----------------------------------------------------------------------------
class DBExporter {
  constructor(dirName = 'db_exports') {
    this.outputDir = path.join(__dirname, '..', dirName);
  }

  async run() {
    const connected = await db.testConnection();
    if (!connected) {
      console.error('Exiting: could not establish DB connection');
      process.exit(1);
    }

    await fs.ensureDir(this.outputDir);

    const [worlds, solutions] = await Promise.all([
      World.findAll({ raw: true }),
      Solution.findAll({ raw: true })
    ]);

    await Promise.all([
      this._writeJSON('worlds.json', worlds),
      this._writeJSON('solutions.json', solutions)
    ]);

    console.log(`✅ Export completed. Files are located at ${this.outputDir}`);

    await db.close();
  }

  async _writeJSON(fileName, data) {
    const fullPath = path.join(this.outputDir, fileName);
    await fs.writeJson(fullPath, data, { spaces: 2 });
    console.log(`  • Wrote ${data.length} records to ${fileName}`);
  }
}

// -----------------------------------------------------------------------------
// Main
// -----------------------------------------------------------------------------
async function main() {
  const [, , customDir] = process.argv;
  const exporter = new DBExporter(customDir);
  try {
    await exporter.run();
  } catch (err) {
    console.error('Export failed:', err);
    process.exit(1);
  }
}

main();
