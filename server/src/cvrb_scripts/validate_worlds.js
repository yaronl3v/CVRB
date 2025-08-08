import { Validator } from '../CVRB/validate/validator.js';
import { ValidationReporter } from '../CVRB/validate/validation_reporter.js';
import fs from 'fs/promises';
import path from 'path';

// List of worlds to validate - add more as needed
const worldsToValidate = [
  'google_gemini-2_5-pro-preview-03-25'
];

/**
 * Main function to validate all specified worlds
 */
async function validateWorlds() {
  console.log('Starting CVRB validation');
  
  // Create validator instance
  const validator = new Validator();
  
  // Create reporter instance
  const reporter = new ValidationReporter();
  
  // Track results
  const results = [];
  
  // Process each CVRB
  for (const worldName of worldsToValidate) {
    console.log(`\n======= Processing world: ${worldName} =======\n`);
    
    try {
      // Validate CVRB
      const result = await validator.validateWorld(worldName);
      results.push(result);
      
      // Log basic result
      if (result.success) {
        console.log(`✅ Validation successful for ${worldName}`);
        console.log(`Agreement: ${result.agreement.agreed}/${result.agreement.total} questions (${result.agreement.percentage.toFixed(2)}%)`);
      } else {
        console.log(`❌ Validation failed for ${worldName}`);
        if (result.error) {
          console.log(`Error: ${result.error}`);
        } else if (result.agreement) {
          console.log(`Agreement: ${result.agreement.agreed}/${result.agreement.total} questions (${result.agreement.percentage.toFixed(2)}%)`);
        }
      }
      
      // Generate and save detailed report
      const report = await reporter.saveValidationReport(worldName, result);
      
      // Print the summary to console
      const summaryText = reporter.generateSummary(report);
      console.log(summaryText);
      
    } catch (error) {
      console.error(`Error validating world ${worldName}:`, error);
      const errorResult = {
        worldName,
        success: false,
        error: error.message
      };
      results.push(errorResult);
      
      // Save error report
      await reporter.saveValidationReport(worldName, errorResult);
    }
  }
  
  // Summary of all worlds
  console.log('\n======= Overall Validation Summary =======\n');
  
  let successCount = 0;
  
  for (const result of results) {
    const status = result.success ? '✅ Success' : '❌ Failed';
    console.log(`${status}: ${result.worldName || result.modelName}`);
    
    if (result.success) {
      successCount++;
    }
  }
  
  console.log(`\nTotal worlds: ${results.length}, Successful: ${successCount}, Failed: ${results.length - successCount}`);
}

// Run the validation
validateWorlds().catch(error => {
  console.error('Fatal error during validation:', error);
  process.exit(1);
}); 