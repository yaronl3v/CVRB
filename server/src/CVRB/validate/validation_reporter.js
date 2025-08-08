/**
 * ValidationReporter class for generating detailed validation reports
 */
export class ValidationReporter {
  /**
   * Generate detailed validation report from validation results
   * 
   * @param {string} worldName - Name of the CVRB
   * @param {Object} result - Validation result from validator
   * @returns {Object} - Generated validation report
   */
  generateValidationReport(worldName, result) {
    try {
      // Extract validator details
      const validatorDetails = this.extractValidatorDetails(result);
      
      // Create report structure with validTask flag on top
      const report = {
        validTask: result.success === true,
        worldName,
        timestamp: new Date().toISOString(),
        summary: {
          success: result.success,
          totalValidators: validatorDetails.validators.length,
          agreementPercentage: result.agreement ? result.agreement.percentage : 0,
          agreementRatio: result.agreement ? `${result.agreement.agreed}/${result.agreement.total}` : '0/0'
        },
        validators: validatorDetails.validators,
        questionResults: validatorDetails.questionResults,
        rawResult: result
      };
      
      console.log(`Generated validation report for ${worldName}`);
      return report;
    } catch (error) {
      console.error(`Error generating validation report for ${worldName}:`, error);
      throw error;
    }
  }
  
  /**
   * Extract validator details from the validation result
   * 
   * @param {Object} result - Validation result
   * @returns {Object} Extracted validator details
   */
  extractValidatorDetails(result) {
    // Default empty structure
    const details = {
      validators: [],
      questionResults: {}
    };
    
    // If there's an error or no validation data, return empty details
    if (!result.success && !result.validatorResults) {
      return details;
    }
    
    try {
      // Extract validators information from validatorResults
      if (result.validatorResults && Array.isArray(result.validatorResults)) {
        result.validatorResults.forEach((validation, index) => {
          details.validators.push({
            modelName: validation.validatorModel || `Validator ${index + 1}`,
            apiName: validation.validatorModel || `validator_${index + 1}`,
            success: !validation.error
          });
        });
      }
      
      // Extract per-question results if available from comparisonResults
      if (result.comparisonResults && result.comparisonResults.questions) {
        Object.keys(result.comparisonResults.questions).forEach(questionId => {
          const questionData = result.comparisonResults.questions[questionId];
          
          details.questionResults[questionId] = {
            agreed: questionData.agreement,
            expected: questionData.creatorResult,
            question: questionData.question,
            validators: []
          };
          
          // Add per-validator results for this question
          if (questionData.validatorResults) {
            questionData.validatorResults.forEach(validatorResult => {
              details.questionResults[questionId].validators.push({
                modelName: validatorResult.validatorModel || `Validator ${validatorResult.validatorId}`,
                result: validatorResult.result || validatorResult.error,
                matches: validatorResult.matches,
                error: validatorResult.error
              });
            });
          }
        });
      }
      
      return details;
    } catch (error) {
      console.error('Error extracting validator details:', error);
      return details;
    }
  }
  
  /**
   * Generate a human-readable summary of validation results
   * 
   * @param {Object} report - The validation report
   * @returns {string} Human-readable summary
   */
  generateSummary(report) {
    if (!report) return 'No report data available';
    
    let summary = `\n===== Validation Summary for ${report.worldName} =====\n\n`;
    
    // Add overall status
    summary += `Status: ${report.validTask ? '✅ VALID' : '❌ INVALID'}\n`;
    summary += `Agreement: ${report.summary.agreementRatio} (${report.summary.agreementPercentage.toFixed(2)}%)\n\n`;
    
    // List validators
    summary += `Validators (${report.validators.length}):\n`;
    report.validators.forEach((validator, index) => {
      summary += `${index + 1}. ${validator.modelName}: ${validator.success ? '✅ Success' : '❌ Failed'}\n`;
    });
    
    // Question-by-question results
    if (Object.keys(report.questionResults).length > 0) {
      summary += '\nQuestion Results:\n';
      Object.keys(report.questionResults).forEach(questionId => {
        const question = report.questionResults[questionId];
        summary += `- ${questionId}: ${question.agreed ? '✅ Agreement' : '❌ Disagreement'} (Expected: ${question.expected})\n`;
        
        // Per-validator results for this question
        question.validators.forEach(v => {
          summary += `  - ${v.modelName}: ${v.matches ? '✓' : '✗'} (${v.result})\n`;
        });
      });
    }
    
    return summary;
  }
} 