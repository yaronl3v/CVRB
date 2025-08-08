/**
 * Helper classes for processing and formatting visualization data
 */

export class DetailedStatsProcessor {
  /**
   * Processes raw detailed stats into a matrix format for visualization
   * @param {Object} detailedStats - Raw detailed stats from API
   * @returns {Object} Processed data with models, worlds, and matrix
   */
  static processDetailedStats(detailedStats) {
    if (!detailedStats || Object.keys(detailedStats).length === 0) {
      return {
        models: [],
        worlds: [],
        matrix: [],
        worldNames: {}
      };
    }

    // Get all unique models
    const models = Object.keys(detailedStats).sort();
    
    // Get all unique worlds across all models
    const worldSet = new Set();
    const worldNames = {};
    
    models.forEach(model => {
      Object.values(detailedStats[model]).forEach(worldData => {
        worldSet.add(worldData.worldId);
        worldNames[worldData.worldId] = worldData.worldName;
      });
    });
    
    const worlds = Array.from(worldSet).sort((a, b) => parseInt(a) - parseInt(b));

    // Create matrix: models x worlds
    const matrix = models.map(model => {
      const modelData = detailedStats[model] || {};
      return {
        model,
        worlds: worlds.map(worldId => {
          const worldData = modelData[worldId];
          return worldData ? {
            worldId,
            worldName: worldData.worldName,
            score: worldData.percent,
            correct: worldData.correct,
            total: worldData.total,
            hasData: true
          } : {
            worldId,
            worldName: worldNames[worldId] || `World ${worldId}`,
            score: null,
            correct: 0,
            total: 0,
            hasData: false
          };
        }),
        // Calculate overall model score
        totalScore: this.calculateModelScore(Object.values(modelData))
      };
    });

    return {
      models,
      worlds,
      matrix,
      worldNames
    };
  }

  /**
   * Calculates overall score for a model across all worlds
   * @param {Array} worldDataArray - Array of CVRB performance data
   * @returns {number} Overall percentage score
   */
  static calculateModelScore(worldDataArray) {
    if (!worldDataArray || worldDataArray.length === 0) return 0;
    
    let totalCorrect = 0;
    let totalQuestions = 0;
    
    worldDataArray.forEach(worldData => {
      totalCorrect += worldData.correct || 0;
      totalQuestions += worldData.total || 0;
    });
    
    return totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;
  }

  /**
   * Sorts matrix by overall model performance
   * @param {Array} matrix - Matrix data from processDetailedStats
   * @param {string} direction - 'asc' or 'desc'
   * @returns {Array} Sorted matrix
   */
  static sortMatrixByOverallScore(matrix, direction = 'desc') {
    return [...matrix].sort((a, b) => {
      const comparison = b.totalScore - a.totalScore;
      return direction === 'desc' ? comparison : -comparison;
    });
  }

  /**
   * Prepares data for chart visualization
   * @param {Object} processedData - Output from processDetailedStats
   * @returns {Object} Chart-ready data
   */
  static prepareChartData(processedData) {
    const { matrix, worlds, worldNames } = processedData;
    
    // Prepare datasets for chart (one per model)
    const datasets = matrix.map((modelData, index) => ({
      label: modelData.model,
      data: modelData.worlds.map(world => world.hasData ? world.score : null),
      borderColor: this.getColorForIndex(index),
      backgroundColor: this.getColorForIndex(index, 0.1),
      fill: false,
      tension: 0.1,
      connectNulls: false
    }));

    // Prepare labels (CVRB names)
    const labels = worlds.map(worldId => worldNames[worldId] || `World ${worldId}`);

    return {
      labels,
      datasets
    };
  }

  /**
   * Generates consistent colors for chart lines
   * @param {number} index - Index for color generation
   * @param {number} alpha - Optional alpha value for background colors
   * @returns {string} CSS color string
   */
  static getColorForIndex(index, alpha = 1) {
    const colors = [
      `rgba(59, 130, 246, ${alpha})`,   // blue
      `rgba(16, 185, 129, ${alpha})`,   // green
      `rgba(245, 101, 101, ${alpha})`,  // red
      `rgba(139, 92, 246, ${alpha})`,   // purple
      `rgba(245, 158, 11, ${alpha})`,   // amber
      `rgba(236, 72, 153, ${alpha})`,   // pink
      `rgba(14, 165, 233, ${alpha})`,   // sky
      `rgba(34, 197, 94, ${alpha})`,    // emerald
      `rgba(239, 68, 68, ${alpha})`,    // red-500
      `rgba(168, 85, 247, ${alpha})`    // violet
    ];
    
    return colors[index % colors.length];
  }
}

export class CorrelationAnalyzer {
  /**
   * Calculates correlation between individual CVRB scores and total scores
   * @param {Array} matrix - Matrix data from processDetailedStats
   * @returns {Object} Correlation analysis results
   */
  static analyzeCorrelation(matrix) {
    const results = {
      worldCorrelations: {},
      overallCorrelation: 0,
      insights: []
    };

    if (!matrix || matrix.length < 2) {
      return results;
    }

    // Get models that have at least some data
    const modelsWithData = matrix.filter(modelData => 
      modelData.worlds.some(world => world.hasData)
    );

    if (modelsWithData.length < 2) {
      return results;
    }

    // Extract total scores for correlation
    const totalScores = modelsWithData.map(modelData => modelData.totalScore);

    // Calculate correlation for each CVRB
    modelsWithData[0].worlds.forEach((_, worldIndex) => {
      const worldScores = modelsWithData
        .map(modelData => modelData.worlds[worldIndex])
        .filter(worldData => worldData.hasData)
        .map(worldData => worldData.score);

      if (worldScores.length >= 2) {
        const worldTotalScores = modelsWithData
          .filter(modelData => modelData.worlds[worldIndex].hasData)
          .map(modelData => modelData.totalScore);

        const correlation = this.calculateCorrelation(worldScores, worldTotalScores);
        const worldId = modelsWithData[0].worlds[worldIndex].worldId;
        
        results.worldCorrelations[worldId] = {
          correlation: correlation,
          worldName: modelsWithData[0].worlds[worldIndex].worldName,
          sampleSize: worldScores.length
        };
      }
    });

    // Calculate insights
    const correlationValues = Object.values(results.worldCorrelations)
      .map(data => data.correlation)
      .filter(val => !isNaN(val));

    if (correlationValues.length > 0) {
      results.overallCorrelation = correlationValues.reduce((sum, val) => sum + val, 0) / correlationValues.length;
      
      const highCorrelationWorlds = Object.entries(results.worldCorrelations)
        .filter(([_, data]) => data.correlation > 0.7)
        .length;

      const lowCorrelationWorlds = Object.entries(results.worldCorrelations)
        .filter(([_, data]) => data.correlation < 0.3)
        .length;

      results.insights = [
        `Average correlation: ${results.overallCorrelation.toFixed(3)}`,
        `${highCorrelationWorlds} worlds with high correlation (>0.7)`,
        `${lowCorrelationWorlds} worlds with low correlation (<0.3)`
      ];
    }

    return results;
  }

  /**
   * Calculates Pearson correlation coefficient
   * @param {Array} x - First data series
   * @param {Array} y - Second data series
   * @returns {number} Correlation coefficient (-1 to 1)
   */
  static calculateCorrelation(x, y) {
    if (x.length !== y.length || x.length < 2) return NaN;

    const n = x.length;
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumX2 = x.reduce((sum, val) => sum + val * val, 0);
    const sumY2 = y.reduce((sum, val) => sum + val * val, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    return denominator === 0 ? 0 : numerator / denominator;
  }
}