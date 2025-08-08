import axios from 'axios';
import dotenv from 'dotenv';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { JSONUtils } from '../tools/json_utils.js';
import { ModelsConfig } from './models.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize environment variables - look for .env file in server root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Check if API key is available
if (!process.env.OPENROUTER_API_KEY) {
  console.error('Error: OPENROUTER_API_KEY is not set in environment variables');
  process.exit(1);
}

/**
 * Logs LLM request and response to a file
 * 
 * @param {string} prompt - The prompt sent to the LLM
 * @param {string} response - The LLM response text
 * @param {string} model - The model used
 * @param {Object} params - Parameters used for the request
 * @param {Error|null} error - Error object if request failed
 */
async function logRequest(prompt, response, model, params, error = null) {
  try {
    // Create log directory if it doesn't exist
    const logDir = path.join(path.resolve(__dirname, '../../'), 'llm_requests');
    await fs.ensureDir(logDir);
    
    // Generate unique filename with timestamp in format yyyymmdd-hour-minute-second
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    const baseFilename = `${year}${month}${day}-${hours}-${minutes}-${seconds}`;
    const jsonFilename = path.join(logDir, `${baseFilename}.json`);
    const responseFilename = path.join(logDir, `${baseFilename}.response`);
    
    // Create log data
    const logData = {
      timestamp: new Date().toISOString(),
      model,
      params,
      prompt,
      response,
      error: error ? {
        message: error.message,
        stack: error.stack
      } : null
    };
    
    // Write JSON data to file
    await fs.writeJson(jsonFilename, logData, { spaces: 2 });
    
    // Write raw response text to .response file
    if (response) {
      await fs.writeFile(responseFilename, response, 'utf8');
    }
    
    console.log(`LLM request logged to ${jsonFilename}`);
  } catch (logError) {
    console.error('Failed to log LLM request:', logError);
  }
}



/**
 * Calls the OpenRouter API with a prompt
 * 
 * @param {string} promptFile - Path to the prompt file relative to src/prompts
 * @param {Object} variables - Variables to inject into the prompt
 * @param {string} model - Model API name to use (e.g. 'x-ai/grok-3-beta')
 * @param {Object} params - Additional parameters for the API call
 * @returns {Promise<string>} - The LLM response
 */
export async function callLLM(
  promptFile,
  variables = {},
  model = null,
  params = {}
) {
  let promptTemplate = '';
  let responseText = '';

  if (!model) {
    throw new Error('Fatal Error: model parameter is null or undefined.');
  }

  // Resolve model configuration
  let modelConfig = {};
  let modelToUse = '';

  if (typeof model === 'string') {
    modelToUse = model;
    modelConfig = Object.values(ModelsConfig).find(cfg => cfg.apiName === model) || {};
  } else if (typeof model === 'object' && model.apiName) {
    modelConfig = model;
    modelToUse = model.apiName;
  } else {
    throw new Error('Invalid model parameter. Expect string or model config.');
  }

  try {
    // Read prompt template
    // Determine prompts directory – moved from world/prompts to CVRB/prompts
    const promptPath = path.join(
      path.dirname(__dirname),
      'CVRB',
      'prompts',
      promptFile
    );

    if (!fs.existsSync(promptPath)) {
      throw new Error(`Prompt file not found: ${promptPath}`);
    }

    promptTemplate = await fs.readFile(promptPath, 'utf8');

    // Replace variables in prompt if any
    for (const [key, value] of Object.entries(variables)) {
      promptTemplate = promptTemplate.replace(new RegExp(`%%${key}%%`, 'g'), value);
    }

    // Build request body
    const requestBody = {
      model: modelToUse,
      messages: [{ role: 'user', content: promptTemplate }]
    };

    // Add reasoning if effort specified in config
    if (modelConfig.effort) {
      requestBody.reasoning = { effort: modelConfig.effort };
    }

    // Add temperature if specified either in modelConfig or params
    if (typeof modelConfig.temperature !== 'undefined') {
      requestBody.temperature = modelConfig.temperature;
    } else if (typeof params.temperature !== 'undefined') {
      requestBody.temperature = params.temperature;
    }

    // Merge any additional params (excluding duplicate keys)
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && key !== 'temperature' && !(key in requestBody)) {
        requestBody[key] = value;
      }
    }

    // Make API request
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      requestBody,
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // Check if response contains an error
    if (response.data.error) {
      console.error('OpenRouter API Error:', response.data.error.message);
      console.error('Error Code:', response.data.error.code);
      throw new Error(`OpenRouter API Error: ${response.data.error.message}`);
    }

    if (response.data.message && response.data.code && !response.data.choices) {
      console.error('OpenRouter API Error:', response.data.message);
      console.error('Error Code:', response.data.code);
      throw new Error(`OpenRouter API Error: ${response.data.message}`);
    }

    if (!response.data.choices || !response.data.choices[0]) {
      console.error('Invalid API response structure:');
      throw new Error('API response missing choices');
    }

    responseText = response.data.choices[0].message.content;

    // Log request and response
    await logRequest(promptTemplate, responseText, modelToUse, requestBody);

    return responseText;
  } catch (error) {
    console.error('LLM Request Error:', error.message);

    // Log the error
    await logRequest(promptTemplate, responseText, modelToUse, params, error);

    throw error;
  }
}