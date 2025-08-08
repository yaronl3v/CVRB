import { Solver } from './solver.js';
import { SolutionHelpers } from '../../models/Solution.js';
import { WorldHelpers } from '../../models/World.js';
import { quality } from '../helpers/quality.js';
import { ModelsConfig } from '../../openrouter/models.js';

/**
 * SolverController – orchestrates solving a CVRB with one or more LLM models
 * and persists the aggregated results into the `solutions` database table.
 *
 * NOTES:
 * 1. This controller does not write anything to the local filesystem. All
 *    persistence happens via Sequelize models.
 * 2. The public API intentionally mirrors the CreatorController so that the
 *    parent `CVRB` class can provide a uniform interface.
 */
export class SolverController {
  constructor () {
    this.defaultSolverModels = [ModelsConfig.O3.apiName];
  }

  /**
   * Extract API name from model config object or return string as-is
   * @param {string|Object} model - Model API name string or ModelsConfig object
   * @returns {string} - API name
   */
  _extractApiName(model) {
    return typeof model === 'string' ? model : model.apiName;
  }

  /**
   * Solve an existing CVRB.
   *
   * @param {number} worldId - Primary key of the CVRB record in the DB
   * @param {Object} params
   * @param {Array} [params.solverModels] - Array of model API names or ModelsConfig objects to use.
   *                                        Defaults to `this.defaultSolverModels`.
   * @returns {Promise<Object>} - Object keyed by model => solution DB record
   */
  async solveWorld (worldId, params = {}) {
    const solverModels = params.solverModels && params.solverModels.length > 0
      ? params.solverModels
      : this.defaultSolverModels;

    const runParallelQuestions = params.runParallel !== false; // default true
    const runParallelModels = params.parallelModels === true;  // default false

    const solverApiNames = solverModels.map(m => this._extractApiName(m));

    console.log('🧩 Solving CVRB');
    console.log(`🌍 world_id: ${worldId}`);
    console.log(`🤖 solver models: ${solverApiNames.join(', ')}`);
    console.log(`🔀 parallel models: ${runParallelModels}`);

    const dbWorld = await WorldHelpers.getWorldById(worldId);
    if (!dbWorld) throw new Error(`World with id ${worldId} not found`);

    const {
      world_info: {
        description: worldDescription = '',
        spec: worldSpec = {},
        questions: worldQuestions = []
      } = {}
    } = dbWorld;

    if (!worldQuestions.length) throw new Error('World has no questions – nothing to solve');

    const expectedAnswers = {};
    for (const q of worldQuestions) {
      if (!q.id) continue;
      expectedAnswers[q.id] = q.expectedAnswer ?? q.expected_result ?? q.expected_answer ?? q.answer ?? q.expected ?? null;
    }

    const solveWithModel = async (modelApiName) => {
      console.log(`\n🚀 Solving with model: ${modelApiName}`);

      const solver = new Solver(dbWorld.world_name);

      // inject CVRB data – keep memory-only
      solver.world.worldName = dbWorld.world_name;
      solver.world.modelName = dbWorld.world_name;
      solver.world.description = worldDescription;
      solver.world.spec = worldSpec;
      solver.world.code = undefined; // do not expose code
      solver.world.questions = worldQuestions.map(q => ({ id: q.id, text: q.text, parameters: q.parameters }));
      solver.world.answers = expectedAnswers;
      solver.world.data = { injected: true };

      solver.initSolutionDir = async () => { solver.solutionDir = null; };
      solver.saveSolution = async () => {};
      solver.generateComparisonReport = async () => {};

      const solverOutput = await solver.solveQuestions(null, modelApiName, runParallelQuestions);

      const rawResponses = {};
      const cleanedBreakdown = {};
      let correct = 0;

      for (const [qId, data] of Object.entries(solverOutput)) {
        rawResponses[qId] = { answer: data.answer ?? data, explanation: data.explanation || 'No explanation provided' };

        const expected = expectedAnswers[qId];
        let provided = data.answer;
        if (provided && typeof provided === 'object' && 'value' in provided) provided = provided.value;

        const isCorrect = expected !== undefined && provided !== undefined && String(provided).trim().toLowerCase() === String(expected).trim().toLowerCase();
        cleanedBreakdown[qId] = isCorrect;
        if (isCorrect) correct++;
      }

      const totalQuestions = worldQuestions.length;
      const scorePercentage = !totalQuestions ? 0 : Math.round((correct / totalQuestions) * 100);

      const results = {
        total_questions: totalQuestions,
        total_correct_answers: correct,
        error_count: totalQuestions - correct,
        score_percentage: scorePercentage,
        breakdown: cleanedBreakdown
      };

      let solutionRecord = await SolutionHelpers.getSolutionByModelAndWorld(modelApiName, worldId);
      if (!solutionRecord) {
        solutionRecord = await SolutionHelpers.createSolution({ model: modelApiName, world_id: worldId, score: scorePercentage, raw_responses: rawResponses, results });
      } else {
        solutionRecord = await SolutionHelpers.updateSolution(solutionRecord.id, { score: scorePercentage, raw_responses: rawResponses, results });
      }

      console.log(`✅ Saved solution for model ${modelApiName} with score ${scorePercentage}%`);
      return solutionRecord;
    };

    const resultsByModel = {};

    if (runParallelModels) {
      const records = await Promise.all(solverApiNames.map(solveWithModel));
      records.forEach(rec => { resultsByModel[rec.model] = rec; });
    } else {
      for (const apiName of solverApiNames) {
        const rec = await solveWithModel(apiName);
        resultsByModel[apiName] = rec;
      }
    }

    // ---------------------------------------------------------------------
    // Quality score computation & persistence
    // ---------------------------------------------------------------------
    // Use ALL existing solver scores for this world (including previous runs) –
    // not just the models executed in the current call.
    const solutionRecords = await SolutionHelpers.getSolutionsByWorldId(worldId);
    const scores = solutionRecords.map(sol => {
      let numeric = typeof sol.score === 'string' ? parseFloat(sol.score) : sol.score;
      if (!Number.isFinite(numeric)) numeric = 0;
      return numeric;
    });

    // Need at least two scores for a meaningful separation metric; the helper
    // returns 0 when input array has < 2 scores.
    const qualityScore = scores.length >= 2 ? quality(scores, 100) : 0;

    try {
      await WorldHelpers.updateQualityScore(worldId, qualityScore);
      console.log(`📈 World ${worldId} quality_score updated → ${qualityScore.toFixed(3)}`);
    } catch (err) {
      console.error(`Error updating quality_score for world ${worldId}:`, err);
    }

    return resultsByModel;
  }
}
