import { WorldHelpers } from '../models/World.js';
import { SolutionHelpers } from '../models/Solution.js';
import db from '../db.js';

const sequelize = db.getSequelize();

class WorldController {
  /**
   * GET /api/worlds
   * Returns list of worlds with their data
   */
  static async getWorlds(req, res) {
    try {
      const { creator, valid_only, limit } = req.query;
      let worlds;

      // Early return for creator filter
      if (creator) {
        worlds = await WorldHelpers.getWorldsByCreator(creator);
        return res.json({
          success: true,
          count: worlds.length,
          data: worlds
        });
      }

      // Early return for valid worlds only
      if (valid_only === 'true') {
        worlds = await WorldHelpers.getValidWorlds();
        return res.json({
          success: true,
          count: worlds.length,
          data: worlds
        });
      }

      // Get recent worlds with optional limit
      const worldLimit = limit ? parseInt(limit) : 10;
      worlds = await WorldHelpers.getRecentWorlds(worldLimit);

      return res.json({
        success: true,
        count: worlds.length,
        data: worlds
      });

    } catch (error) {
      console.error('Error getting worlds:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve worlds',
        message: error.message
      });
    }
  }

  /**
   * GET /api/worlds/:id/solutions
   * Returns list of solutions for a specific CVRB
   */
  static async getWorldSolutions(req, res) {
    try {
      const { id } = req.params;
      const worldId = parseInt(id);

      if (!worldId || isNaN(worldId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid CVRB ID'
        });
      }

      const solutions = await SolutionHelpers.getSolutionsByWorldId(worldId);

      return res.json({
        success: true,
        count: solutions.length,
        data: solutions
      });

    } catch (error) {
      console.error('Error getting CVRB solutions:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve solutions',
        message: error.message
      });
    }
  }

  /**
   * DELETE /api/worlds/:id
   * Deletes a CVRB and all its solutions
   */
  static async deleteWorld(req, res) {
    try {
      const { id } = req.params;
      const worldId = parseInt(id);

      if (!worldId || isNaN(worldId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid CVRB ID'
        });
      }

      const result = await WorldHelpers.deleteWorld(worldId);

      return res.json({
        success: true,
        message: 'World and all associated solutions deleted successfully',
        deletedRows: result.deletedRows
      });

    } catch (error) {
      console.error('Error deleting CVRB:', error);
      
      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: 'World not found'
        });
      }

      return res.status(500).json({
        success: false,
        error: 'Failed to delete CVRB',
        message: error.message
      });
    }
  }

  /**
   * PATCH /api/worlds/:id/set
   * Updates the set number for a CVRB
   */
  static async updateWorldSet(req, res) {
    try {
      const { id } = req.params;
      const { set } = req.body;
      const worldId = parseInt(id);

      if (!worldId || isNaN(worldId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid CVRB ID'
        });
      }

      if (set === undefined || set === null || isNaN(parseInt(set))) {
        return res.status(400).json({
          success: false,
          error: 'Invalid set number'
        });
      }

      const setNumber = parseInt(set);
      if (setNumber < 0 || setNumber > 10) {
        return res.status(400).json({
          success: false,
          error: 'Set number must be between 0 and 10'
        });
      }

      const updatedWorld = await WorldHelpers.updateWorldSet(worldId, setNumber);

      return res.json({
        success: true,
        message: 'World set updated successfully',
        data: updatedWorld
      });

    } catch (error) {
      console.error('Error updating CVRB set:', error);
      
      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: 'World not found'
        });
      }

      return res.status(500).json({
        success: false,
        error: 'Failed to update CVRB set',
        message: error.message
      });
    }
  }

  /**
   * GET /api/creator-stats
   * Returns simple pass/fail status for models that can create valid worlds
   */
  static async getCreatorStats(req, res) {
    try {
      const { set } = req.query;
      
      // Import models config to get all available models
      const { ModelsConfig } = await import('../openrouter/models.js');
      const allModels = Object.values(ModelsConfig).map(config => config.apiName);
      
      // Build the WHERE clause based on set filter
      let whereClause = '1=1';
      const replacements = {};
      
      if (set !== undefined && set !== 'all') {
        whereClause += ' AND set = :setFilter';
        replacements.setFilter = parseInt(set);
      }

      // Get models that have created valid worlds
      const passedModels = await sequelize.query(`
        SELECT DISTINCT creator
        FROM worlds
        WHERE is_valid = true AND ${whereClause}
        ORDER BY creator
      `, {
        type: sequelize.QueryTypes.SELECT,
        replacements
      });

      const passedModelNames = passedModels.map(row => row.creator);
      const failedModelNames = allModels.filter(model => !passedModelNames.includes(model));

      return res.json({
        success: true,
        data: {
          passed: passedModelNames.sort(),
          failed: failedModelNames.sort()
        }
      });

    } catch (error) {
      console.error('Error getting creator stats:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve creator statistics',
        message: error.message
      });
    }
  }

  /**
   * GET /api/solver-stats
   * Returns aggregated solver statistics across all worlds
   * Calculates stats by examining raw_responses and validating against expected answers
   */
  static async getSolverStats(req, res) {
    try {
      const { set } = req.query;

      // Delegated to shared stats helper to avoid duplicate logic
      const { calculateSolverStats } = await import('../CVRB/stats/solver_stats.js');
      const { stats: solverStats, detailedStats: solverDetails } = await calculateSolverStats({ set });
      return res.json({
        success: true,
        count: solverStats.length,
        data: solverStats,
        detailedStats: solverDetails
      });

    } catch (error) {
      console.error('Error getting solver stats:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve solver statistics',
        message: error.message
      });
    }
  }
}

export default WorldController;