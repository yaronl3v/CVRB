import { CreatorController } from './create/creator_controller.js';
import { SolverController } from './solve/solver_controller.js';
import { WorldHelpers } from '../models/World.js';
import db from '../db.js';

/**
 * Main CVRB class - clean parent class for CVRB operations
 */
class CVRB {
  /** Default number of worlds generated when batch creation is requested */
  static DEFAULT_WORLD_COUNT = 2;

  constructor() {
    this.createWorlds = new CreatorController();
    this.solverController = new SolverController();
    this.db = db;
  }

  /**
   * Initialize database connection
   */
  async init() {
    const connected = await this.db.testConnection();
    if (!connected) {
      throw new Error('Failed to connect to database');
    }
    return true;
  }

  /**
   * Create a new CVRB with the specified model and parameters + validation code
   * 
   * @param {string|Object} model - Model API name string or ModelsConfig object to use for creation
   * @param {Object} params - Parameters for CVRB creation
   * @param {Array} params.validatorModels - Array of validator model API names or ModelsConfig objects to create code from description
   * @param {boolean} params.saveToDb - Whether to save to database (default: true)
   * @param {boolean} params.runValidation - Whether to run validation (default: true)
   * @returns {Promise<Object>} - Created CVRB data with database record
   */
  async createWorld(model, params = {}) {
    await this.init();
    return await this.createWorlds.createWorld(model, params);
  }

  /**
   * Generate multiple worlds concurrently using a single DB connection.
   *
   * @param {number} [count=CVRB.DEFAULT_WORLD_COUNT] - Number of worlds to create.
   * @param {string|Object} model - Model to use for creation.
   * @param {Object} params - Parameters forwarded to createWorld.
   * @returns {Promise<Array>} - Array of creation results.
   */
  async generateWorlds(count = CVRB.DEFAULT_WORLD_COUNT, model, params = {}) {
    await this.init();

    // Reuse the same DB connection; avoid repeated authentication tests.
    const tasks = Array.from({ length: count }, () =>
      this.createWorlds.createWorld(model, params)
    );

    // Wait for all tasks to settle so that one failure doesn't abort the others
    const results = await Promise.allSettled(tasks);

    // Log any errors to the console but allow the process to continue
    results
      .filter(r => r.status === 'rejected')
      .forEach(r => console.error('World creation failed:', r.reason));

    // Return only the successful CVRB creation results
    return results
      .filter(r => r.status === 'fulfilled')
      .map(r => r.value);
  }

  /**
   * Solve one or many CVRB worlds by ID(s) with the specified solver models.
   *
   * @param {number|number[]} worldIds - Single world ID or array of IDs.
   * @param {Object} params - Parameters forwarded to the solver controller.
   * @param {Array} params.solverModels - Array of solver model API names or ModelsConfig objects.
   * @param {boolean} [params.parallelModels=false] - Run all requested models concurrently.
   * @returns {Promise<Object>} - Mapping of worldId -> solution records keyed by model.
   */
  async solveWorlds(worldIds, params = {}) {
    await this.init();

    const ids = Array.isArray(worldIds) ? worldIds : [worldIds];
    if (!ids.length) return {};

    const aggregated = {};
    for (const id of ids) {
      try {
        aggregated[id] = await this.solverController.solveWorld(id, params);
      } catch (err) {
        console.error(`World solving failed for id=${id}:`, err);
      }
    }

    return aggregated;
  }

  /**
   * Solve all worlds in a given set or all worlds if setId is null/undefined.
   *
   * @param {number|null|undefined} setId - The set identifier to filter worlds by, or null/undefined for all worlds
   * @param {Object} params - Parameters forwarded to the solver controller
   * @param {Array} params.solverModels - Array of solver model API names or ModelsConfig objects
   * @param {boolean} [params.parallelModels=true] - Run requested models concurrently
   * @returns {Promise<Object>} - Mapping of worldId -> solution records keyed by model
   */
  async solveSet(setId, params = {}) {
    await this.init();

    let worldIds = [];
    if (setId === null || setId === undefined) {
      worldIds = await WorldHelpers.getAllWorldIds();
    } else {
      worldIds = await WorldHelpers.getWorldIdsBySet(setId);
    }

    if (!worldIds.length) return {};

    return await this.solveWorlds(worldIds, params);
  }

  /**
   * Test validation process for debugging
   * 
   * @param {number} worldId - Database ID of CVRB to validate
   * @returns {Promise<Object>} - Validation result
   */
  async testValidation(worldId) {
    await this.init();
    const dbRecord = await WorldHelpers.getWorldById(worldId);
    
    if (!dbRecord) {
      throw new Error(`World with ID ${worldId} not found`);
    }
    
    return await this.createWorlds._runValidation(dbRecord.creator, dbRecord);
  }

  /**
   * Close database connection
   */
  async close() {
    await this.db.close();
  }
}

export { CVRB };