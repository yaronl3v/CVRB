import { Creator } from './creator.js';
import { ValidationReporter } from '../validate/validation_reporter.js';
import { Validator } from '../validate/validator.js';
import { WorldHelpers } from '../../models/World.js';
import { ModelsConfig } from '../../openrouter/models.js';
import World from '../../models/World.js';

/**
 * Helper class for CVRB creation operations
 */
export class CreatorController {
  constructor() {
    this.creator = new Creator();
    this.reporter = new ValidationReporter();
    this.validator = new Validator();
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
   * Create a new CVRB with the specified model and parameters
   * 
   * @param {string|Object} model - Model API name string or ModelsConfig object to use for creation
   * @param {Object} params - Parameters for CVRB creation
   * @param {Array} params.validatorModels - Array of validator model API names or ModelsConfig objects
   * @param {boolean} params.runValidation - Whether to run validation (default: true)
   * @returns {Promise<Object>} - Created CVRB data with database record
   */
  async createWorld(model, params = {}) {
    try {
      // Extract API names from model configs
      const creatorApiName = this._extractApiName(model);
      const validatorApiNames = params.validatorModels 
        ? params.validatorModels.map(model => this._extractApiName(model))
        : [ModelsConfig.O3.apiName];

      // Set default parameters
      const options = {
        validatorModels: validatorApiNames,
        runValidation: params.runValidation !== false // Default to true
      };

      console.log('🌍 Creating new CVRB...');
      console.log(`📝 Model: ${creatorApiName}`);
      console.log(`🔍 Validators: ${options.validatorModels.join(', ')}`);

      // Step 1: Create the CVRB using the Creator
      const createdWorlds = await this.creator.createWorlds([creatorApiName], {
        validatorModels: options.validatorModels
      });

      if (!createdWorlds || createdWorlds.length === 0) {
        throw new Error('Failed to create CVRB');
      }

      const world = createdWorlds[0];
      
      // 💡 Normalize questions – handle both possible placements from LLM (root or under CVRB)
      const normalizedQuestions = world.questions ?? (world.world ? world.world.questions : undefined) ?? [];

      // Step 2: Prepare CVRB data for database
      const worldData = {
        creator: creatorApiName,
        is_valid: null, // Will be set after validation
        validation_notes: {},

        world_info: {
          name: world.world.name,
          description: world.world.description,
          spec: world.world.spec,
          questions: normalizedQuestions
        },
        world_code: world.world.code,
        validation_code: {
          codes: world.validationCode || [],
          models: options.validatorModels
        },
        world_name: world.world.name
      };

      // Step 3: Save to database (always save)
      console.log('💾 Saving CVRB to database...');
      const dbRecord = await WorldHelpers.createWorld(worldData);
      console.log(`✅ World saved to database with ID: ${dbRecord.id}`);

      // Step 4: run the validation code vs CVRB creator code
      let validationResult = null;
      if (options.runValidation) {
        validationResult = await this._runValidation(model, dbRecord);
      }

      // Return comprehensive result
      const result = {
        world: world,
        dbRecord: dbRecord,
        validation: validationResult,
        success: true
      };

      console.log('🎉 World creation completed successfully!');
      return result;

    } catch (error) {
      console.error('❌ Error creating CVRB:', error.message);
      throw error;
    }
  }

  /**
   * Private method to handle validation using the Validator class
   */
  async _runValidation(model, dbRecord) {
    console.log('🔍 Running validation...');
    
    try {
      // Use the Validator class to perform validation
      const validationResult = await this.validator.validateWorldFromDB(dbRecord);
      
      if (!validationResult) {
        throw new Error('Validation failed to return results');
      }

      // Generate validation report using the reporter
      const worldName = dbRecord.world_name;
      const report = this.reporter.generateValidationReport(worldName, validationResult);
      
      // Update validation results in database
      if (dbRecord) {
        // Store both the validation result and the generated report
        const validationNotes = {
          ...validationResult,
          report: report
        };
        
        const updatedRecord = await WorldHelpers.updateValidation(
          dbRecord.id,
          validationResult.success,
          validationNotes
        );
        // Update the dbRecord reference
        Object.assign(dbRecord, updatedRecord);
      }

      // Generate validation report
      if (validationResult.success) {
        console.log(`✅ Validation successful`);
        console.log(`Agreement: ${validationResult.agreement.agreed}/${validationResult.agreement.total} questions (${validationResult.agreement.percentage.toFixed(2)}%)`);
      } else {
        console.log(`❌ Validation failed`);
        if (validationResult.agreement) {
          console.log(`Agreement: ${validationResult.agreement.agreed}/${validationResult.agreement.total} questions (${validationResult.agreement.percentage.toFixed(2)}%)`);
        }
      }

      console.log(`📊 Validation report generated and saved to database`);

      // 👉 Append answers to each question in world_info
      const agreedAnswers = validationResult.agreedAnswers || {};
      if (Array.isArray(dbRecord.world_info?.questions)) {
        const questionsWithAnswers = dbRecord.world_info.questions.map((q) => {
          const answerData = agreedAnswers[q.id];
          return {
            ...q,
            answer: answerData ? answerData.expectedResult : 'n/a',
          };
        });
        const updatedInfo = { ...dbRecord.world_info, questions: questionsWithAnswers };
        await World.update({ world_info: updatedInfo }, { where: { id: dbRecord.id } });
        dbRecord.world_info = updatedInfo;
        console.log('📝 Answers appended to world_info.questions');
      }

      return validationResult;

    } catch (validationError) {
      console.error(`❌ Validation error: ${validationError.message}`);
      
      // Update database with validation error
      if (dbRecord) {
        const updatedRecord = await WorldHelpers.updateValidation(
          dbRecord.id,
          false,
          { error: validationError.message }
        );
        Object.assign(dbRecord, updatedRecord);
      }
      
      return {
        success: false,
        error: validationError.message
      };
    }
  }

}