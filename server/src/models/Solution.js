import { DataTypes } from 'sequelize';
import db from '../db.js';

const sequelize = db.getSequelize();

const Solution = sequelize.define('Solution', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  model: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Model name that generated this solution'
  },
  world_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'worlds',
      key: 'id'
    },
    onDelete: 'CASCADE',
    comment: 'Foreign key reference to the CVRB being solved'
  },
  score: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Score achieved by the model for this CVRB'
  },
  raw_responses: {
    type: DataTypes.JSONB,
    defaultValue: [],
    comment: 'Array of raw responses from the model'
  },
  results: {
    type: DataTypes.JSONB,
    defaultValue: {},
    comment: 'JSON containing detailed results and analysis'
  }
}, {
  tableName: 'solutions',
  timestamps: true, // Adds createdAt and updatedAt
  indexes: [
    {
      unique: true,
      fields: ['model', 'world_id']
    }
  ]
});

// Model helper functions
export const SolutionHelpers = {
  /**
   * Create a new solution record
   */
  async createSolution(solutionData) {
    try {
      const solution = await Solution.create({
        model: solutionData.model,
        world_id: solutionData.world_id,
        score: solutionData.score || null,
        raw_responses: solutionData.raw_responses || [],
        results: solutionData.results || {}
      });
      
      return solution.dataValues;
    } catch (error) {
      console.error('Error creating solution:', error);
      throw error;
    }
  },

  /**
   * Update solution score and results
   */
  async updateSolution(solutionId, updateData) {
    try {
      const [updatedRowsCount] = await Solution.update(
        {
          score: updateData.score,
          raw_responses: updateData.raw_responses,
          results: updateData.results
        },
        {
          where: { id: solutionId }
        }
      );
      
      if (updatedRowsCount === 0) {
        throw new Error(`Solution with id ${solutionId} not found`);
      }
      
      const updatedSolution = await Solution.findByPk(solutionId);
      return updatedSolution.dataValues;
    } catch (error) {
      console.error('Error updating solution:', error);
      throw error;
    }
  },

  /**
   * Get solution by ID
   */
  async getSolutionById(solutionId) {
    try {
      const solution = await Solution.findByPk(solutionId);
      return solution ? solution.dataValues : null;
    } catch (error) {
      console.error('Error getting solution by ID:', error);
      throw error;
    }
  },

  /**
   * Get solutions by CVRB ID - one solution per model (latest by createdAt)
   */
  async getSolutionsByWorldId(worldId) {
    try {
      const solutions = await sequelize.query(`
        SELECT * FROM (
          SELECT *,
                 ROW_NUMBER() OVER (PARTITION BY model ORDER BY "updatedAt" DESC) as rn
          FROM solutions 
          WHERE world_id = :worldId
        ) ranked_solutions
        WHERE rn = 1
        ORDER BY score DESC NULLS LAST, "updatedAt" DESC
      `, {
        replacements: { worldId },
        type: sequelize.QueryTypes.SELECT
      });
      
      // Remove the row number column and maintain same response structure as before
      return solutions.map(solution => {
        const { rn, ...solutionData } = solution;
        return solutionData;
      });
    } catch (error) {
      console.error('Error getting solutions by CVRB ID:', error);
      throw error;
    }
  },

  /**
   * Get solutions by model
   */
  async getSolutionsByModel(model) {
    try {
      const solutions = await Solution.findAll({
        where: { model },
        order: [['score', 'DESC'], ['createdAt', 'DESC']]
      });
      
      return solutions.map(solution => solution.dataValues);
    } catch (error) {
      console.error('Error getting solutions by model:', error);
      throw error;
    }
  },

  /**
   * Get top solutions across all models for a CVRB
   */
  async getTopSolutionsForWorld(worldId, limit = 10) {
    try {
      const solutions = await Solution.findAll({
        where: { world_id: worldId },
        order: [['score', 'DESC'], ['createdAt', 'DESC']],
        limit
      });
      
      return solutions.map(solution => solution.dataValues);
    } catch (error) {
      console.error('Error getting top solutions for CVRB:', error);
      throw error;
    }
  },

  /**
   * Get solution by model and CVRB (unique combination)
   */
  async getSolutionByModelAndWorld(model, worldId) {
    try {
      const solution = await Solution.findOne({
        where: { 
          model: model,
          world_id: worldId 
        }
      });
      
      return solution ? solution.dataValues : null;
    } catch (error) {
      console.error('Error getting solution by model and CVRB:', error);
      throw error;
    }
  },

  /**
   * Get recent solutions with optional limit
   */
  async getRecentSolutions(limit = 20) {
    try {
      const solutions = await Solution.findAll({
        order: [['createdAt', 'DESC']],
        limit
      });
      
      return solutions.map(solution => solution.dataValues);
    } catch (error) {
      console.error('Error getting recent solutions:', error);
      throw error;
    }
  },

  /**
   * Get model performance statistics
   */
  async getModelStats(model) {
    try {
      const [stats] = await sequelize.query(`
        SELECT 
          COUNT(*) as total_solutions,
          AVG(score) as avg_score,
          MAX(score) as max_score,
          MIN(score) as min_score,
          COUNT(CASE WHEN score IS NOT NULL THEN 1 END) as scored_solutions
        FROM solutions 
        WHERE model = :model
      `, {
        replacements: { model },
        type: sequelize.QueryTypes.SELECT
      });
      
      return stats;
    } catch (error) {
      console.error('Error getting model stats:', error);
      throw error;
    }
  }
};

export default Solution;