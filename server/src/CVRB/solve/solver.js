import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { callLLM } from '../../openrouter/openRouter.js';
import { JSONUtils } from '../../tools/json_utils.js';
import { World } from '../world/world.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Solver class for solving CVRB worlds
 */
export class Solver {
  /**
   * Create a new Solver instance and load the specified CVRB
   * 
   * @param {string} worldModelName - Name of the CVRB model to load
   */
  constructor(worldModelName) {
    
    this.world = new World();
    this.solutions = {};
    this.solutionDir = null;
    this.worldModelName = worldModelName;
    
    // Load the CVRB immediately
    this.loadWorldSync();
  }

  /**
   * Load the CVRB synchronously during construction
   * This is a sync wrapper for the async loadWorld method
   */
  loadWorldSync() {
    // Log that we're loading the CVRB
    console.log(`Loading world: ${this.worldModelName}`);
  }

  /**
   * Ensure CVRB is loaded before proceeding with any operations
   * 
   * @returns {Promise<boolean>} - Whether loading was successful
   */
  async ensureWorldLoaded() {
    if (!this.world.getData()) {
      return await this.world.loadByModelName(this.worldModelName);
    }
    return true;
  }

  /**
   * Initialize the solution directory for the current solver/CVRB combination
   * 
   * @param {string} solverModelApiName - API name of the model used for solving
   * @returns {Promise<string>} - Path to the solution directory
   */
  async initSolutionDir(solverModelApiName) {
    // Ensure CVRB is loaded
    const loaded = await this.ensureWorldLoaded();
    if (!loaded) {
      throw new Error(`Failed to load world: ${this.worldModelName}`);
    }
    
    // Create directory name from API name
    const solverModelDirName = solverModelApiName.replace(/[^a-zA-Z0-9_-]/g, '_');
    
    // Get the CVRB directory
    const worldsDir = path.join(process.cwd(), 'worlds');
    const worldDir = path.join(worldsDir, this.world.modelName);
    
    // Create solutions directory inside CVRB directory
    const solutionsBaseDir = path.join(worldDir, 'solutions');
    await fs.ensureDir(solutionsBaseDir);
    
    // Create specific solver solution directory
    this.solutionDir = path.join(solutionsBaseDir, solverModelDirName);
    await fs.ensureDir(this.solutionDir);
    
    console.log(`Solution directory initialized at: ${this.solutionDir}`);
    
    // Initialize the solution file with an empty answers array if it doesn't exist
    const solutionPath = path.join(this.solutionDir, 'solution.json');
    if (!await fs.pathExists(solutionPath)) {
      await fs.writeFile(
        solutionPath,
        JSON.stringify({ answers: [] }, null, 2)
      );
    }
    
    return this.solutionDir;
  }

  /**
   * Get the question with the given ID
   * 
   * @param {string} questionId - ID of the question to get
   * @returns {Object|null} - The question object or null if not found
   */
  getQuestion(questionId) {
    const questions = this.world.getQuestions();
    if (!questions) {
      return null;
    }
    
    return questions.find(q => q.id === questionId) || null;
  }

  /**
   * Save a single solution to the solution file
   * 
   * @param {Object} solution - The solution to save
   * @returns {Promise<void>}
   */
  async saveSolution(solution) {
    if (!this.solutionDir) {
      throw new Error('Solution directory not initialized. Call initSolutionDir first.');
    }
    
    try {
      const solutionPath = path.join(this.solutionDir, 'solution.json');
      
      // Read current solutions
      let solutionData = { answers: [] };
      if (await fs.pathExists(solutionPath)) {
        solutionData = await fs.readJSON(solutionPath);
      }
      
      // Check if this question already has an answer
      const existingIndex = solutionData.answers.findIndex(a => a.id === solution.id);
      if (existingIndex >= 0) {
        // Replace existing answer
        solutionData.answers[existingIndex] = solution;
      } else {
        // Add new answer
        solutionData.answers.push(solution);
      }
      
      // Save updated solutions
      await fs.writeFile(
        solutionPath,
        JSON.stringify(solutionData, null, 2)
      );
      
      console.log(`Solution for question ${solution.id} saved to ${solutionPath}`);
    } catch (error) {
      console.error(`Error saving solution for question ${solution.id}:`, error);
      throw error;
    }
  }

  /**
   * Record a failed solution attempt for a question
   *
   * @param {string} questionId - ID of the question that failed
   * @param {string} errorMessage - The error message from the failure
   * @param {number} solutionTimeSeconds - Time spent on the failed attempt
   * @returns {Promise<void>}
   */
  async recordFailedSolution(questionId, errorMessage, solutionTimeSeconds) {
    const failedSolution = {
      id: questionId,
      status: 'failed',
      error: errorMessage,
      solutionTimeSeconds,
      failed: true
    };
    
    // Add to solutions collection (in-memory)
    this.solutions[questionId] = failedSolution;
    
    // Save the failed solution
    await this.saveSolution(failedSolution);
    
    console.log(`Recorded failure for question ${questionId}`);
  }

  /**
   * Solve a specific question using an LLM
   * 
   * @param {string} questionId - ID of the question to solve
   * @param {string} solverModelApiName - API name of the model to use for solving
   * @returns {Promise<Object|null>} - The solution data or null if question not found
   */
  async solveQuestion(questionId, solverModelApiName) {
    try {
      // Ensure CVRB is loaded
      const loaded = await this.ensureWorldLoaded();
      if (!loaded) {
        throw new Error(`Failed to load world: ${this.worldModelName}`);
      }

      // Initialize solution directory if not done yet
      if (!this.solutionDir) {
        await this.initSolutionDir(solverModelApiName);
      }

      // Get the CVRB data
      const worldDescription = this.world.getDescription();
      const worldCode = this.world.getCode();
      const worldSpec = this.world.spec ?? {};
      
      if (!worldDescription) {
        throw new Error('World data incomplete. Missing description.');
      }

      // Get the specific question
      const question = this.getQuestion(questionId);
      if (!question) {
        console.error(`Question with ID ${questionId} not found.`);
        return null;
      }

      // Format the question for the prompt
      const formattedQuestion = `Question ${question.id}: ${question.text}\nParameters: ${JSON.stringify(question.parameters, null, 2)}`;

      console.log(`Solving question "${question.id}" for world "${this.world.worldName}" using model: ${solverModelApiName}`);
      
      // Record start time
      const startTime = Date.now();
      
      // Call LLM to solve the question
      const promptVars = {
        world_description: worldDescription,
        world_spec: JSON.stringify(worldSpec, null, 2),
        question: formattedQuestion,
        question_id: question.id
      };

      // Include world_code only if it exists and was intentionally provided
      if (worldCode) {
        promptVars.world_code = worldCode;
      }

      const solverResponse = await callLLM('solver.txt', promptVars, solverModelApiName);
      
      // Calculate solution time
      const solutionTimeMs = Date.now() - startTime;
      const solutionTimeSeconds = (solutionTimeMs / 1000).toFixed(2);
      
      console.log(`Solution received in ${solutionTimeSeconds} seconds, parsing...`);
      
      // Parse the response
      const parsedSolution = JSONUtils.tryParseJson(solverResponse);
      
      if (!parsedSolution) {
        throw new Error(`Failed to parse solution response for question ${questionId} into valid JSON`);
      }
      
      // Add solution time to the solution data
      parsedSolution.solutionTimeSeconds = solutionTimeSeconds;
      
      // Add to solutions collection (in-memory)
      this.solutions[questionId] = parsedSolution;
      
      // Save the solution immediately
      await this.saveSolution(parsedSolution);
      
      return parsedSolution;
    } catch (error) {
      console.error(`Error solving question ${questionId}:`, error);
      throw error;
    }
  }

  /**
   * Solve specific questions or all questions in the CVRB
   * 
   * @param {string[]} [questionIds=null] - Array of question IDs to solve, if null will solve all questions
   * @param {string} solverModelApiName - API name of the model to use for solving
   * @returns {Promise<Object>} - All solutions
   */
  async solveQuestions(questionIds, solverModelApiName, runParallel = true) {
    try {
      // Ensure CVRB is loaded
      const loaded = await this.ensureWorldLoaded();
      if (!loaded) {
        throw new Error(`Failed to load world: ${this.worldModelName}`);
      }

      // Initialize solution directory
      await this.initSolutionDir(solverModelApiName);

      // Get all CVRB questions
      const allQuestions = this.world.getQuestions();
      if (!allQuestions || allQuestions.length === 0) {
        throw new Error('No questions found in the CVRB.');
      }

      // Determine which questions to solve
      let questionsToSolve = allQuestions;
      if (questionIds && questionIds.length > 0) {
        questionsToSolve = allQuestions.filter(q => questionIds.includes(q.id));
        
        if (questionsToSolve.length === 0) {
          throw new Error('None of the specified question IDs were found in the CVRB.');
        }
        
        console.log(`Solving ${questionsToSolve.length} specific questions in world "${this.world.worldName}"`);
      } else {
        console.log(`Solving all ${questionsToSolve.length} questions in world "${this.world.worldName}"`);
      }
      
      // Solve each question (solutions are saved individually as they're solved)
      const attemptSolve = async (question) => {
        const startTime = Date.now();
        try {
          await this.solveQuestion(question.id, solverModelApiName);
        } catch (error) {
          console.error(`Error solving question ${question.id}, continuing:`, error);
          const solutionTimeMs = Date.now() - startTime;
          const solutionTimeSeconds = (solutionTimeMs / 1000).toFixed(2);
          await this.recordFailedSolution(
            question.id,
            error.message || 'Unknown error occurred',
            solutionTimeSeconds
          );
        }
      };

      if (runParallel) {
        await Promise.all(questionsToSolve.map(q => attemptSolve(q)));
      } else {
        for (const q of questionsToSolve) {
          await attemptSolve(q);
        }
      }
      
      // Generate comparison report after all questions are solved
      await this.generateComparisonReport();
      
      return this.solutions;
    } catch (error) {
      console.error('Error solving questions:', error);
      throw error;
    }
  }
  
  /**
   * Generate comparison report with expected answers
   */
  async generateComparisonReport() {
    if (!this.solutionDir) {
      console.warn('No solution directory initialized.');
      return;
    }
    
    try {
      // Read the current solutions
      const solutionPath = path.join(this.solutionDir, 'solution.json');
      if (!await fs.pathExists(solutionPath)) {
        console.warn('No solutions found to compare.');
        return;
      }
      
      const solutionData = await fs.readJSON(solutionPath);
      const solutions = solutionData.answers;
      
      // Compare with expected answers if available
      const expectedAnswers = this.world.getAnswers();
      if (expectedAnswers) {
        const comparison = this.compareWithExpected(solutions, expectedAnswers);
        
        await fs.writeFile(
          path.join(this.solutionDir, 'comparison.json'),
          JSON.stringify(comparison, null, 2)
        );
        
        console.log(`Comparison saved to ${path.join(this.solutionDir, 'comparison.json')}`);
      }
    } catch (error) {
      console.error('Error generating comparison report:', error);
    }
  }
  
  /**
   * Compare solution answers with expected answers
   * 
   * @param {Array} solutions - The solutions provided by the solver
   * @param {Object} expectedAnswers - The expected answers from the CVRB
   * @returns {Object} - Comparison results
   */
  compareWithExpected(solutions, expectedAnswers) {
    const comparison = {
      correct: 0,
      failed: 0,
      total: solutions.length,
      details: []
    };
    
    solutions.forEach(solution => {
      // Handle failed solutions differently
      if (solution.failed === true) {
        comparison.failed++;
        
        comparison.details.push({
          id: solution.id,
          status: 'failed',
          error: solution.error,
          expectedAnswer: expectedAnswers[solution.id],
          correct: false,
          solutionTimeSeconds: solution.solutionTimeSeconds
        });
        
        return;
      }
      
      const expected = expectedAnswers[solution.id];
      
      // Handle different expected answer formats
      let expectedValue = expected;
      if (expected && typeof expected === 'object') {
        if (expected.hasOwnProperty('expectedResult')) {
          expectedValue = expected.expectedResult;
        }
      }
      
      const isCorrect = expectedValue !== undefined && 
                      String(solution.answer).trim() === String(expectedValue).trim();
      
      comparison.details.push({
        id: solution.id,
        providedAnswer: solution.answer,
        expectedAnswer: expected,
        correct: isCorrect,
        status: 'completed',
        solutionTimeSeconds: solution.solutionTimeSeconds
      });
      
      if (isCorrect) {
        comparison.correct++;
      }
    });
    
    comparison.score = comparison.total > 0 ? 
      (comparison.correct / comparison.total * 100).toFixed(2) + '%' : '0%';
    
    // Add failure rate
    comparison.failureRate = comparison.total > 0 ?
      (comparison.failed / comparison.total * 100).toFixed(2) + '%' : '0%';
    
    return comparison;
  }
} 