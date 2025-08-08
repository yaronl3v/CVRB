import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * World class for handling saved worlds
 */
export class World {
  constructor() {
    this.worldsDir = path.join(process.cwd(), 'worlds');
    this.data = null;
    this.worldName = null;
    this.modelName = null;
    this.description = null;
    this.code = null;
    this.questions = null;
    this.validators = null;
    this.tests = null;
    this.answers = null;
    this.report = null;
  }

  /**
   * Get a list of all saved worlds
   * 
   * @returns {Promise<Array>} - List of CVRB directory names
   */
  async listWorlds() {
    try {
      // Ensure the worlds directory exists
      await fs.ensureDir(this.worldsDir);
      
      // Get all subdirectories
      const dirs = await fs.readdir(this.worldsDir);
      const worldDirs = [];
      
      for (const dir of dirs) {
        const stats = await fs.stat(path.join(this.worldsDir, dir));
        if (stats.isDirectory()) {
          worldDirs.push(dir);
        }
      }
      
      return worldDirs;
    } catch (error) {
      console.error('Error listing worlds:', error);
      return [];
    }
  }

  /**
   * Load a CVRB by model API name
   * 
   * @param {string} modelApiName - API name of the model (e.g., 'x-ai/grok-3-beta')
   * @returns {Promise<boolean>} - Whether loading was successful
   */
  async loadByModelApiName(modelApiName) {
    try {
      // Create directory name from API name
      const modelDirName = modelApiName.replace(/[^a-zA-Z0-9_-]/g, '_');
      
      // Load the CVRB
      return await this.loadByModelName(modelDirName);
    } catch (error) {
      console.error(`Error loading world by model API name ${modelApiName}:`, error);
      return false;
    }
  }

  /**
   * Load a CVRB by model name
   * 
   * @param {string} modelName - Name of the model (as used in directory name)
   * @returns {Promise<boolean>} - Whether loading was successful
   */
  async loadByModelName(modelName) {
    try {
      // Construct the directory path
      const worldDir = path.join(this.worldsDir, modelName);
      
      // Check if directory exists
      if (!await fs.pathExists(worldDir)) {
        console.error(`World directory not found: ${worldDir}`);
        return false;
      }
      
      // Load CVRB.json
      const worldJsonPath = path.join(worldDir, 'CVRB.json');
      if (!await fs.pathExists(worldJsonPath)) {
        console.error(`World JSON not found: ${worldJsonPath}`);
        return false;
      }
      
      this.data = await fs.readJSON(worldJsonPath);
      this.worldName = this.data.world.name;
      this.modelName = modelName;
      
      // Load description
      const descriptionPath = path.join(worldDir, 'description', 'description.txt');
      if (await fs.pathExists(descriptionPath)) {
        this.description = await fs.readFile(descriptionPath, 'utf8');
      }
      
      // Load code
      const codePath = path.join(worldDir, 'code', 'simulation.js');
      if (await fs.pathExists(codePath)) {
        this.code = await fs.readFile(codePath, 'utf8');
      }
      
      // Load questions
      const questionsPath = path.join(worldDir, 'questions.json');
      if (await fs.pathExists(questionsPath)) {
        this.questions = await fs.readJSON(questionsPath);
      }
      
      // Load validators
      const validatorsPath = path.join(worldDir, 'validators.json');
      if (await fs.pathExists(validatorsPath)) {
        this.validators = await fs.readJSON(validatorsPath);
      }
      
      // Load answers if available
      const answersPath = path.join(worldDir, 'answers.json');
      if (await fs.pathExists(answersPath)) {
        this.answers = await fs.readJSON(answersPath);
      }
      
      // Load validation report if available
      const reportPath = path.join(worldDir, 'report.json');
      if (await fs.pathExists(reportPath)) {
        this.report = await fs.readJSON(reportPath);
      }
      
      // Extract tests from CVRB data
      if (this.data && this.data.tests) {
        this.tests = this.data.tests;
      }
      
      console.log(`Successfully loaded world: ${this.worldName} (${modelName})`);
      return true;
    } catch (error) {
      console.error(`Error loading world by model name ${modelName}:`, error);
      return false;
    }
  }

  /**
   * Get CVRB information
   * 
   * @returns {Object} - World information
   */
  getInfo() {
    if (!this.data) {
      return null;
    }
    
    return {
      worldName: this.worldName,
      modelName: this.modelName,
      description: this.description ? this.description.substring(0, 100) + '...' : null,
      questionCount: this.questions ? this.questions.length : 0,
      validatorCount: this.validators ? this.validators.length : 0
    };
  }

  /**
   * Get full CVRB data
   * 
   * @returns {Object} - World data
   */
  getData() {
    return this.data;
  }

  /**
   * Get CVRB description
   * 
   * @returns {string} - World description
   */
  getDescription() {
    return this.description;
  }

  /**
   * Get simulation code
   * 
   * @returns {string} - Simulation code
   */
  getCode() {
    return this.code;
  }

  /**
   * Get questions
   * 
   * @returns {Array} - Questions
   */
  getQuestions() {
    return this.questions;
  }

  /**
   * Get validators
   * 
   * @returns {Array} - Validators
   */
  getValidators() {
    return this.validators;
  }

  /**
   * Get tests
   * 
   * @returns {Array} - Tests
   */
  getTests() {
    return this.tests;
  }

  /**
   * Get answers
   * 
   * @returns {Object} - Expected answers for questions
   */
  getAnswers() {
    return this.answers;
  }
  
  /**
   * Get validation report
   * 
   * @returns {Object} - Validation report
   */
  getReport() {
    return this.report;
  }
  
  /**
   * Check if CVRB is validated successfully
   * 
   * @returns {boolean} - Whether the CVRB is validated
   */
  isValidated() {
    return this.report && this.report.validTask === true;
  }
} 