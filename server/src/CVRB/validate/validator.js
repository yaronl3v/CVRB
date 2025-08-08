import vm from 'vm';

/**
 * Validator class for comparing results from creator and validators
 */
export class Validator {
  constructor() {
    this.worldData = null;
    this.creatorResults = null;
    this.validatorResults = [];
    this.success = false;
  }

  /**
 * Generic helper for running a Simulation class against a list of questions.
 * Returns the structured results so the caller can decide what to do with them.
 *
 * @param {Function} SimulationClass - The Simulation class constructor
 * @param {Array} questions - Array of question objects to run
 * @param {Object} [options] - Optional config (e.g., { timeoutMs: 5000, allowFallback: true })
 * @returns {Promise<Object>} - Results keyed by question id
 */
  async _runSimulation(SimulationClass, questions, options = {}) {
    const { timeoutMs = 10000, allowFallback = false } = options;  // Defaults: 10s timeout, no auto-fallback

    if (!SimulationClass) {
      throw new Error('SimulationClass is required');
    }

    if (!questions || questions.length === 0) {
      throw new Error('No questions provided');
    }

    const results = {};

    for (const question of questions) {
      const _startTime = Date.now();
      const questionId = question.id;
      try {
        let params = { ... (question.parameters || {}) };  // Clone to avoid mutating original

        // Preprocess params: Eval any string that looks like a function (e.g., for large arrays)
        for (const key in params) {
          if (typeof params[key] === 'string' && params[key].includes('() =>')) {
            try {
              const evalFn = new Function(`return ${params[key]};`);  // Sandboxed eval
              params[key] = evalFn();
            } catch (evalErr) {
              console.error(`Error evaluating param ${key} for question ${questionId}:`, evalErr);
              throw evalErr;  // Fail hard if param can't be processed
            }
          }
        }

        let result;
        const fnCodeRaw = question.validator_fn;
        const hasValidatorFn = typeof fnCodeRaw === 'string' && fnCodeRaw.trim().length > 0;

        if (hasValidatorFn) {
          // Strip markdown code fences
          const fnCode = fnCodeRaw.replace(/```(javascript)?\n?/g, '').replace(/```/g, '');

          /* Execute validator function inside VM with hard timeout */
          try {
            const sandboxAns = { console, Simulation: SimulationClass, parameters: params };
            const contextAns = vm.createContext(sandboxAns);
            const scriptAns = new vm.Script(`\n              ${fnCode}\n              getAnswer(parameters);\n            `);
            result = scriptAns.runInContext(contextAns, { timeout: timeoutMs });
          } catch (err) {
            if (err.code === 'ERR_SCRIPT_EXECUTION_TIMEOUT' || /Script execution timed out/.test(err.message)) {
              throw new Error('Simulation timeout');
            }
            throw err;
          }
        }

        if (result === undefined && allowFallback) {
          /* Fallback using VM timeout to safely abort long-running synchronous code */
          try {
            const sandboxSim = { Simulation: SimulationClass, parameters: params };
            const contextSim = vm.createContext(sandboxSim);
            const scriptSim = new vm.Script(`
              (() => {
                const simulation = new Simulation();
                return simulation.run(parameters);
              })()
            `);
            result = scriptSim.runInContext(contextSim, { timeout: timeoutMs });
          } catch (err) {
            /* Normalize Node's timeout error */
            if (err.code === 'ERR_SCRIPT_EXECUTION_TIMEOUT' || /Script execution timed out/.test(err.message)) {
              throw new Error('Simulation timeout');
            }
            throw err;
          }
        } else if (result === undefined) {
          throw new Error('Validator_fn failed and fallback is disabled');
        }

        results[questionId] = {
          question: question.text,
          parameters: params,  // Return processed params
          result
        };

        const _elapsed = Date.now() - _startTime;
        console.log(`Running question ${questionId} - ${_elapsed}ms`);
      } catch (error) {
        console.error(`Error running question ${questionId}:`, error);
        results[questionId] = {
          question: question.text,
          parameters: question.parameters || {},
          error: error.message
        };
        const _elapsed = Date.now() - _startTime;
        console.log(`Running question ${questionId} - ${_elapsed}ms (error)`);
      }
    }

    return results;
  }

  /**
   * Load CVRB data from database record
   *
   * @param {Object} dbRecord - Database record containing CVRB data
   * @returns {Promise<boolean>} - Whether loading was successful
   */
  async loadWorldFromDB(dbRecord) {
    try {
      if (!dbRecord) {
        throw new Error('No database record provided');
      }

      // Handle both old format (array) and new format (object with codes and models)
      let validators = [];
      let validatorModels = [];
      
      if (Array.isArray(dbRecord.validation_code)) {
        // Old format: just array of codes
        validators = dbRecord.validation_code;
        validatorModels = validators.map((_, index) => `Validator ${index + 1}`);
      } else if (dbRecord.validation_code && typeof dbRecord.validation_code === 'object') {
        // New format: object with codes and models
        validators = dbRecord.validation_code.codes || [];
        validatorModels = dbRecord.validation_code.models || [];
      }

      this.worldData = {
        worldName: dbRecord.world_name || 'Unknown World',
        modelName: dbRecord.creator,
        code: dbRecord.world_code,
        questions: dbRecord.world_info?.questions || [],
        validators: validators,
        validatorModels: validatorModels,
        worldInfo: dbRecord.world_info
      };

      console.log(`Successfully loaded world data: ${this.worldData.worldName} (${this.worldData.modelName})`);
      console.log(`Loaded ${validators.length} validators with models: ${validatorModels.join(', ')}`);
      return true;
    } catch (error) {
      console.error('Error loading CVRB from DB:', error);
      return false;
    }
  }

  /**
   * Run CVRB code to get answers to questions
   *
   * @returns {Promise<Object>} - Results from running the CVRB code
   */
  async runWorldCode() {
    if (!this.worldData || !this.worldData.code) {
      throw new Error('World code not loaded');
    }

    const { code, questions, worldName } = this.worldData;
    if (!questions || questions.length === 0) {
      throw new Error('No questions found for this CVRB');
    }

    console.log(`Running world code for ${worldName}`);
    console.log(`Processing ${questions.length} questions`);

    // Create a sandbox to run the code
    const sandbox = { console, global: {} };
    const context = vm.createContext(sandbox);

    // Execute the simulation code directly
    vm.runInContext(code, context);

    // Ensure Simulation is accessible
    const exposeSimulationCode = `
      if (typeof Simulation !== 'undefined') {
        global.Simulation = Simulation;
      }
    `;
    vm.runInContext(exposeSimulationCode, context);

    // Resolve the Simulation class from the sandbox
    let SimulationClass = sandbox.Simulation || (sandbox.global && sandbox.global.Simulation);

    if (!SimulationClass) {
      const extractCode = `
        if (typeof Simulation !== 'undefined') {
          global._SimulationClass = Simulation;
          true;
        } else {
          false;
        }
      `;
      const hasSimulation = vm.runInContext(extractCode, context);
      if (hasSimulation && sandbox.global._SimulationClass) {
        SimulationClass = sandbox.global._SimulationClass;
      }
    }

    if (!SimulationClass) {
      const availableKeys = JSON.stringify(Object.keys(sandbox));
      const availableGlobal = JSON.stringify(Object.keys(sandbox.global));
      throw new Error(`No Simulation class found in world code - available keys: ${availableKeys} global: ${availableGlobal}`);
    }

    // Run the simulation for all questions using the shared helper.
    const results = await this._runSimulation(SimulationClass, questions);

    // Preserve existing behaviour for external callers
    this.creatorResults = results;
    return results;
  }

  /**
   * Run validator code to get answers to questions
   *
   * @returns {Promise<Array>} - Results from running each validator
   */
  async runValidatorCode() {
    const { validators, questions, worldName, validatorModels } = this.worldData;

    if (!validators || validators.length === 0) {
      throw new Error('No validators found for this CVRB');
    }

    if (!questions || questions.length === 0) {
      throw new Error('No questions found for this CVRB');
    }

    console.log(`Running ${validators.length} validators for ${worldName}`);

    const validatorResults = [];

    for (let i = 0; i < validators.length; i++) {
      let validatorCode = validators[i];
      const validatorModel = validatorModels && validatorModels[i] ? validatorModels[i] : `Validator ${i + 1}`;
      console.log(`Processing validator #${i + 1} (${validatorModel})`);

      try {
        // Strip markdown code fences if present
        if (validatorCode.includes('```')) {
          validatorCode = validatorCode
            .replace(/```javascript\n?/g, '')
            .replace(/```\n?/g, '');
        }

        // Build a function wrapper around the validator code
        const wrappedFn = new Function(
          'console',
          'global',
          `${validatorCode}
            return {
              Simulation: typeof Simulation !== 'undefined' ? Simulation : undefined,
              simulation: typeof simulation !== 'undefined' ? simulation : undefined
            };`
        );

        const sandboxConsole = console;
        const sandboxGlobal = {};
        const executionResult = wrappedFn(sandboxConsole, sandboxGlobal);

        // Determine the Simulation class
        let SimulationClass;
        if (executionResult.simulation) {
          SimulationClass = executionResult.simulation.constructor;
        } else if (executionResult.Simulation) {
          SimulationClass = executionResult.Simulation;
        } else {
          throw new Error(`No Simulation class or simulation instance found in validator #${i + 1} (${validatorModel})`);
        }

        // Run the simulation for all questions using the shared helper.
        const results = await this._runSimulation(SimulationClass, questions);

        validatorResults.push({ 
          validatorId: i + 1, 
          validatorModel: validatorModel,
          results 
        });
      } catch (error) {
        console.error(`Error running validator #${i + 1} (${validatorModel}):`, error);
        validatorResults.push({ 
          validatorId: i + 1, 
          validatorModel: validatorModel,
          error: error.message 
        });
      }
    }

    this.validatorResults = validatorResults;
    return validatorResults;
  }

  /**
   * Compare creator results with validator results
   *
   * @returns {Promise<Object>} - Comparison results
   */
  async compareResults() {
    try {
      if (!this.creatorResults) {
        await this.runWorldCode();
      }

      if (!this.validatorResults || this.validatorResults.length === 0) {
        await this.runValidatorCode();
      }

      console.log('Comparing creator results with validator results');

      const comparisonResults = {
        worldName: this.worldData.worldName,
        modelName: this.worldData.modelName,
        questions: {},
        validatorAgreement: {}
      };

      const questionIds = Object.keys(this.creatorResults);

      for (const questionId of questionIds) {
        const creatorResult = this.creatorResults[questionId];
        comparisonResults.questions[questionId] = {
          question: creatorResult.question,
          creatorResult: creatorResult.result,
          validatorResults: [],
          agreement: true
        };

        for (const validator of this.validatorResults) {
          if (validator.error) {
            comparisonResults.questions[questionId].validatorResults.push({
              validatorId: validator.validatorId,
              validatorModel: validator.validatorModel,
              error: validator.error,
              matches: false
            });
            comparisonResults.questions[questionId].agreement = false;
            console.log(`❌ Question ${questionId}: ${validator.validatorModel} error: ${validator.error}`);
            continue;
          }

          const validatorResult = validator.results[questionId];
          if (!validatorResult) {
            comparisonResults.questions[questionId].validatorResults.push({
              validatorId: validator.validatorId,
              validatorModel: validator.validatorModel,
              error: 'Question not processed',
              matches: false
            });
            comparisonResults.questions[questionId].agreement = false;
            console.log(`❌ Question ${questionId}: ${validator.validatorModel} did not process this question`);
            continue;
          }

          if (validatorResult.error) {
            comparisonResults.questions[questionId].validatorResults.push({
              validatorId: validator.validatorId,
              validatorModel: validator.validatorModel,
              error: validatorResult.error,
              matches: false
            });
            comparisonResults.questions[questionId].agreement = false;
            console.log(`❌ Question ${questionId}: ${validator.validatorModel} error: ${validatorResult.error}`);
            continue;
          }

          const creatorValue = JSON.stringify(creatorResult.result);
          const validatorValue = JSON.stringify(validatorResult.result);
          const matches = creatorValue === validatorValue;

          comparisonResults.questions[questionId].validatorResults.push({
            validatorId: validator.validatorId,
            validatorModel: validator.validatorModel,
            result: validatorResult.result,
            matches
          });

          if (!matches) {
            comparisonResults.questions[questionId].agreement = false;
            console.log(`❌ Question ${questionId}: Results mismatch with ${validator.validatorModel}`);
            console.log(`   Creator result: ${creatorValue}`);
            console.log(`   Validator result: ${validatorValue}`);

            if (
              typeof creatorResult.result === 'object' &&
              typeof validatorResult.result === 'object'
            ) {
              console.log('   Detailed differences:');

              const allKeys = new Set([
                ...Object.keys(creatorResult.result || {}),
                ...Object.keys(validatorResult.result || {})
              ]);

              for (const key of allKeys) {
                const creatorHas =
                  creatorResult.result && Object.prototype.hasOwnProperty.call(creatorResult.result, key);
                const validatorHas =
                  validatorResult.result && Object.prototype.hasOwnProperty.call(validatorResult.result, key);

                if (!creatorHas) {
                  console.log(`     - Extra key in validator: "${key}" = ${JSON.stringify(validatorResult.result[key])}`);
                } else if (!validatorHas) {
                  console.log(`     - Missing key in validator: "${key}" = ${JSON.stringify(creatorResult.result[key])}`);
                } else if (
                  JSON.stringify(creatorResult.result[key]) !== JSON.stringify(validatorResult.result[key])
                ) {
                  console.log(`     - Different values for "${key}":`);
                  console.log(`       Creator: ${JSON.stringify(creatorResult.result[key])}`);
                  console.log(`       Validator: ${JSON.stringify(validatorResult.result[key])}`);
                }
              }
            }
          } else {
            console.log(`✅ Question ${questionId}: ${validator.validatorModel} result matches creator's result`);
          }
        }
      }

      let totalQuestions = questionIds.length;
      let agreedQuestions = 0;

      for (const questionId of questionIds) {
        if (comparisonResults.questions[questionId].agreement) {
          agreedQuestions++;
        }
      }

      comparisonResults.validatorAgreement = {
        total: totalQuestions,
        agreed: agreedQuestions,
        percentage: (agreedQuestions / totalQuestions) * 100
      };

      console.log(
        `Agreement: ${agreedQuestions}/${totalQuestions} questions (${comparisonResults.validatorAgreement.percentage.toFixed(
          2
        )}%)`
      );

      this.success = agreedQuestions === totalQuestions;
      return comparisonResults;
    } catch (error) {
      console.error('Error comparing results:', error);
      throw error;
    }
  }

  /**
   * Get answers if validators agree with creator
   *
   * @param {Object} comparisonResults - Comparison results
   * @returns {Object|null} - Agreed answers or null if no agreement
   */
  getAgreedAnswers(comparisonResults) {
    try {
      if (!comparisonResults) return null;
      if (!this.success) {
        console.log('No agreed answers as validators do not fully agree with creator');
        return null;
      }

      console.log('Extracting agreed answers');
      const answers = {};

      for (const [questionId, data] of Object.entries(comparisonResults.questions)) {
        answers[questionId] = {
          question: data.question,
          expectedResult: data.creatorResult
        };
      }

      return answers;
    } catch (error) {
      console.error('Error extracting agreed answers:', error);
      return null;
    }
  }

  /**
   * Run full validation for a CVRB from database record
   *
   * @param {Object} dbRecord - Database record containing CVRB data
   * @returns {Promise<Object>} - Validation results
   */
  async validateWorldFromDB(dbRecord) {
    try {
      console.log(`Starting validation for world: ${dbRecord.world_name || dbRecord.creator}`);

      const loaded = await this.loadWorldFromDB(dbRecord);
      if (!loaded) {
        throw new Error('Failed to load CVRB from database record');
      }

      await this.runWorldCode();
      await this.runValidatorCode();
      const comparisonResults = await this.compareResults();
      const agreedAnswers = this.getAgreedAnswers(comparisonResults);

      return {
        worldName: this.worldData.worldName,
        modelName: this.worldData.modelName,
        success: this.success,
        agreement: comparisonResults.validatorAgreement,
        comparisonResults,
        agreedAnswers,
        creatorResults: this.creatorResults,
        validatorResults: this.validatorResults
      };
    } catch (error) {
      console.error('Error validating CVRB:', error);
      return {
        worldName: dbRecord.world_name || 'Unknown',
        modelName: dbRecord.creator || 'Unknown',
        success: false,
        error: error.message
      };
    }
  }
}
