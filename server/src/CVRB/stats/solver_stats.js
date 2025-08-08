import db from '../../db.js';

/**
 * Calculate aggregated solver statistics across worlds.
 * Returns the same structure previously handled in world_controller.getSolverStats
 * so that both API and offline scripts can share the exact same logic.
 *
 * @param {Object} options
 * @param {number|string} [options.set='all'] - set number to filter by or 'all' to include every set
 * @returns {Promise<{stats: Array, detailedStats: Object}>}
 */
export async function calculateSolverStats({ set = 'all' } = {}) {
  const sequelize = db.getSequelize();

  // Build the WHERE clause based on set filter
  let whereClause = 's.raw_responses IS NOT NULL';
  const replacements = {};

  if (set !== undefined && set !== 'all') {
    whereClause += ' AND w.set = :setFilter';
    replacements.setFilter = parseInt(set, 10);
  }

  // Fetch all solutions joined with their world metadata
  const solutions = await sequelize.query(`
    SELECT 
      s.model,
      s.world_id,
      s.raw_responses,
      w.world_info,
      w.world_name
    FROM solutions s
    JOIN worlds w ON s.world_id = w.id
    WHERE ${whereClause}
    ORDER BY s.model, s.world_id
  `, {
    type: sequelize.QueryTypes.SELECT,
    replacements
  });

  const modelStats = {};
  const detailedStats = {};

  for (const solution of solutions) {
    const model = solution.model;
    const worldId = solution.world_id;
    const worldName = solution.world_name || `World ${worldId}`;
    const rawResponses = solution.raw_responses || {};
    const worldInfo = solution.world_info || {};
    const questions = worldInfo.questions || [];

    // Extract expected answers for this CVRB
    const expectedAnswers = {};
    for (const q of questions) {
      if (!q.id) continue;
      expectedAnswers[q.id] = q.expectedAnswer ?? q.expected_result ?? q.expected_answer ?? q.answer ?? q.expected ?? null;
    }

    // Initialize model stats if not exists
    if (!modelStats[model]) {
      modelStats[model] = {
        total_attempts: 0,
        correct_answers: 0
      };
    }

    // Initialize detailed stats structure
    if (!detailedStats[model]) {
      detailedStats[model] = {};
    }

    let worldCorrect = 0;
    let worldTotal = 0;

    // Validate each question in raw_responses
    for (const [qId, responseData] of Object.entries(rawResponses)) {
      if (!Object.prototype.hasOwnProperty.call(expectedAnswers, qId)) continue;

      modelStats[model].total_attempts += 1;
      worldTotal += 1;

      const expected = expectedAnswers[qId];
      let provided = responseData?.answer;

      // Handle object answers with value property
      if (provided && typeof provided === 'object' && 'value' in provided) {
        provided = provided.value;
      }

      const isCorrect = expected !== undefined &&
                        provided !== undefined &&
                        String(provided).trim().toLowerCase() === String(expected).trim().toLowerCase();

      if (isCorrect) {
        modelStats[model].correct_answers += 1;
        worldCorrect += 1;
      }
    }

    // Store per-CVRB performance
    if (worldTotal > 0) {
      detailedStats[model][worldId] = {
        worldId,
        worldName,
        correct: worldCorrect,
        total: worldTotal,
        percent: (worldCorrect / worldTotal) * 100
      };
    }
  }

  // Convert to array format, calculate percentages and Wilson 95% confidence intervals
  const stats = Object.entries(modelStats).map(([model, data]) => {
    // Early return when there are no attempts
    if (data.total_attempts === 0) {
      return {
        model,
        total_attempts: '0',
        correct_answers: '0',
        percent_correct: '0.00',
        ci_lower: '0.00',
        ci_upper: '0.00',
        ci_margin: '0.00'
      };
    }

    const z = 1.96; // 95% confidence
    const n = data.total_attempts;
    const p = data.correct_answers / n;

    const denom = 1 + ((z ** 2) / n);
    const center = (p + ((z ** 2) / (2 * n))) / denom;
    const margin = (z * Math.sqrt((p * (1 - p)) / n + ((z ** 2) / (4 * n ** 2)))) / denom;

    const lower = Math.max(0, center - margin);
    const upper = Math.min(1, center + margin);

    return {
      model,
      total_attempts: n.toString(),
      correct_answers: data.correct_answers.toString(),
      percent_correct: (p * 100).toFixed(2),
      ci_lower: (lower * 100).toFixed(2),
      ci_upper: (upper * 100).toFixed(2),
      ci_margin: (margin * 100).toFixed(2)
    };
  });

  // Sort by percentage correct (desc), then by total attempts (desc)
  stats.sort((a, b) => {
    const percentDiff = parseFloat(b.percent_correct) - parseFloat(a.percent_correct);
    if (percentDiff !== 0) return percentDiff;
    return parseInt(b.total_attempts, 10) - parseInt(a.total_attempts, 10);
  });

  // Compute probability that each model beats the next best model
  const normalCdf = (zScore) => {
    // Abramowitz and Stegun formula 7.1.26 approximation
    const t = 1 / (1 + 0.3275911 * Math.abs(zScore));
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const erf = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-zScore * zScore);
    const sign = zScore >= 0 ? 1 : -1;
    return 0.5 * (1 + sign * erf);
  };

  for (let i = 0; i < stats.length; i += 1) {
    if (i === stats.length - 1) {
      stats[i].beats_next_percent = '-';
      continue;
    }

    const a = stats[i];
    const b = stats[i + 1];

    const p1 = parseFloat(a.percent_correct) / 100;
    const p2 = parseFloat(b.percent_correct) / 100;

    const n1 = parseInt(a.total_attempts, 10);
    const n2 = parseInt(b.total_attempts, 10);

    if (n1 === 0 || n2 === 0) {
      stats[i].beats_next_percent = '-';
      continue;
    }

    const sigma = Math.sqrt(
      (p1 * (1 - p1) / n1) +
      (p2 * (1 - p2) / n2)
    );

    if (sigma === 0) {
      stats[i].beats_next_percent = p1 > p2 ? '100.0' : '0.0';
      continue;
    }

    const zScore = (p1 - p2) / sigma;
    stats[i].beats_next_percent = (normalCdf(zScore) * 100).toFixed(1);
  }

  return { stats, detailedStats };
}

