import { callLLM } from '../../openrouter/openRouter.js';
import { JSONUtils } from '../../tools/json_utils.js';


/**
 * Creator class for generating CVRB worlds
 */
export class Creator {
  constructor() {
    
    // Default validator models
    this.validatorModels = ['anthropic/claude-3-7-sonnet'];
  }

  /**
   * Main entry point to create tasks using an array of models
   * 
   * @param {Array} models - Array of model apinames to use
   * @param {Object} options - Options for task creation
   * @param {Array} options.validatorModels - Array of validator model apinames to use
   * @returns {Promise<Array>} - Array of created worlds
   */
  async createWorlds(models = [], options = {}) {
    try {

      if (!models || models.length === 0) {
        console.error('Fatal error: No models provided to createTasks. Exiting.');
        process.exit(1);
      }
      
      console.log(`Creating tasks using ${models.length} models: ${models.join(', ')}`);
      
      // Use validator models from options if provided, otherwise use default
      const validatorModels = options.validatorModels || this.validatorModels;
      
      console.log(`Using validator models: ${validatorModels.join(', ')}`);
      
      // Store created worlds
      const createdWorlds = [];
      
      // Generate a CVRB for each model
      for (const modelApiName of models) {
        //console.log(`Generating CVRB using API model: ${modelApiName}`);
        
        // Generate CVRB
        const world = await this.generateWorld({
          modelApiName
        });
        
        // create validation code for CVRB
        // Add validation code to CVRB object
        world.validationCode = await this.createValidationWorldCode(world, validatorModels);
        
        createdWorlds.push(world);
      }
      
      console.log('Tasks created successfully');
      return createdWorlds;
    } catch (error) {
      console.error('Error creating tasks:', error);
      throw error;
    }
  }

  /**
   * Generate a new CVRB using LLM
   * 
   * @param {Object} options - Configuration options
   * @param {string} options.modelApiName - Model API name to use
   * @returns {Promise<Object>} - The generated CVRB
   */
  async generateWorld(options = {}) {
    try {
      console.log('Generating new World...');
      
      // Use the provided model apiname or default to Grok 3
      let modelApiName = options.modelApiName || null;
      if (!modelApiName) {
        console.error('Fatal Error: modelApiName is null or undefined.');
        process.exit(1);
      }
      
    
      // Call LLM to create CVRB
      const worldResponse = await callLLM('world-creation.txt', {}, modelApiName);
      
      console.log('Raw CVRB received, parsing...');
      
      // Parse the response using the utility method
      const parsedWorld = JSONUtils.tryParseJson(worldResponse);
      
      if (!parsedWorld) {
        throw new Error('Failed to parse CVRB response into valid JSON');
      }

      parsedWorld.world.code = JSONUtils.cleanJavaScriptCode(parsedWorld.world.code);
      
      return parsedWorld;
    } catch (error) {
      console.error('Error generating CVRB:', error);
      throw error;
    }
  }

  /**
   * Generate validation code using independent LLM validators
   * 
   * @param {Object} world - The CVRB to create validation code for
   * @param {Array} validatorModels - Array of validator model apinames to use
   * @returns {Promise<Array>} - Array of validation code strings
   */
  async createValidationWorldCode(world, validatorModels = []) {
    try {
      // Use provided validator models or default to class validators
      if (!validatorModels || validatorModels.length === 0) {
        validatorModels = this.validatorModels;
      }
      
      console.log(`Creating validation code for world "${world.world.name}" with ${validatorModels.length} validator models: ${validatorModels.join(', ')}`);
      
      const validators = [];
      
      // Generate implementations for each validator model
      for (let i = 0; i < validatorModels.length; i++) {
        const validatorApiName = validatorModels[i];
        
        console.log(`Creating validator implementation #${i+1} using ${validatorApiName}...`);
        
        // Prepare variables for prompt with snake_case names
        const promptVars = {
          world_name: world.world.name,
          world_description: world.world.description,
          world_spec: JSON.stringify(world.world.spec, null, 2),
          return_schema: JSON.stringify(world.world.return_schema || {}, null, 2),
        };
        
        console.log(`Sending validation code generation request with variables:`, promptVars);
        
        const validatorResponse = await callLLM('validation-setup.txt', promptVars, validatorApiName);
        console.log('Validation code generated');
        
        validators.push(validatorResponse);
      }
      
      console.log(`Generated ${validators.length} validation implementations`);
      
      return validators;
    } catch (error) {
      console.error('Error creating validation code:', error);
      throw error;
    }
  }

} 