import db from '../../db.js';
import { calculateSolverStats } from '../stats/solver_stats.js';

class WorldSolverCorrelation {
  constructor(setNumber = 1) {
    this.setNumber = setNumber;
    this.sequelize = db.getSequelize();
  }

  async fetchAverageQualityScores() {
    const results = await this.sequelize.query(`
      SELECT creator,
             AVG(quality_score) AS avg_quality_score,
             COUNT(*)            AS world_count
      FROM worlds
      WHERE set = :setFilter
      GROUP BY creator
    `, {
      type: this.sequelize.QueryTypes.SELECT,
      replacements: { setFilter: this.setNumber }
    });

    const map = {};
    for (const row of results) {
      map[row.creator] = {
        avg_quality_score: parseFloat(row.avg_quality_score),
        world_count: parseInt(row.world_count, 10)
      };
    }
    return map;
  }

  static computePearson(xs, ys) {
    const n = xs.length;
    if (n === 0) return null;

    const meanX = xs.reduce((a, b) => a + b, 0) / n;
    const meanY = ys.reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let denomX = 0;
    let denomY = 0;

    for (let i = 0; i < n; i += 1) {
      const dx = xs[i] - meanX;
      const dy = ys[i] - meanY;
      numerator += dx * dy;
      denomX += dx * dx;
      denomY += dy * dy;
    }

    const denominator = Math.sqrt(denomX * denomY);
    return denominator === 0 ? null : numerator / denominator;
  }

  async run() {
    console.log(`Calculating correlation for set ${this.setNumber}...\n`);

    // 1. Solver statistics (ranking / percent correct)
    const { stats } = await calculateSolverStats({ set: this.setNumber });

    // 2. Average world quality score per creator
    const qualityMap = await this.fetchAverageQualityScores();

    // 3. Combine on creator/model name
    const combined = [];

    for (const solver of stats) {
      const quality = qualityMap[solver.model];
      if (!quality) continue; // Only creators who also acted as solvers

      combined.push({
        creator: solver.model,
        percent_correct: parseFloat(solver.percent_correct),
        total_attempts: parseInt(solver.total_attempts, 10),
        avg_quality_score: quality.avg_quality_score,
        world_count: quality.world_count
      });
    }

    if (combined.length === 0) {
      console.log('No overlapping creators found between solvers and world creators for this set.');
      return;
    }

    // 4. Display combined table for inspection
    console.table(combined);

    // 5. Calculate Pearson correlation between solver accuracy and avg quality score
    const xs = combined.map(c => c.percent_correct);
    const ys = combined.map(c => c.avg_quality_score);

    const r = WorldSolverCorrelation.computePearson(xs, ys);

    if (r === null) {
      console.log('\nNot enough data to compute correlation.');
      return;
    }

    console.log(`\nPearson correlation coefficient (r): ${r.toFixed(4)}`);
    console.log(`Coefficient of determination (r^2): ${(r * r).toFixed(4)}`);

    const conclusion = Math.abs(r) >= 0.5
      ? 'Evidence suggests that higher-performing solver models tend to create higher-quality worlds.'
      : 'No strong evidence that solver performance correlates with world quality.';

    console.log(`\nConclusion: ${conclusion}`);
  }
}

async function main() {
  const setArg = process.argv[2];
  const setNumber = setArg !== undefined ? parseInt(setArg, 10) : 1;

  if (Number.isNaN(setNumber)) {
    console.error('Set argument must be a number.');
    process.exit(1);
  }

  const runner = new WorldSolverCorrelation(setNumber);
  await runner.run();
  process.exit(0);
}

// Execute only if called directly via node
if (import.meta.url === `file://${process.argv[1]}`) {
  // eslint-disable-next-line no-console
  main();
}

