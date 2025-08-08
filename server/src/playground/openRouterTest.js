import axios from 'axios';
import dotenv from 'dotenv';
import { ModelsConfig } from '../openrouter/models.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize environment variables - look for .env file in server root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
// Initialize environment variables


/**
 * Simple test to check OpenRouter API connectivity with OpenAI O3 model
 */
async function testOpenRouterWithO3() {
  try {
    console.log('Starting OpenRouter test with OpenAI O3 model...');
    
    // Check if API key is available
    if (!process.env.OPENROUTER_API_KEY) {
      console.error('Error: OPENROUTER_API_KEY is not set in environment variables');
      process.exit(1);
    }
    
    // Create a simple message for testing
    const message = "Hello! This is a simple test. Please respond with 'Hello World' and nothing else.";
    
    console.log('Sending request to OpenAI O3 model...');



    
    // Make direct API request to OpenRouter
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: ModelsConfig.CLAUDE_4_OPUS.apiName,
        messages: [{ role: 'user', content: message }],
        reasoning: {
          effort: 'high'
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    // Check for errors in response
    if (response.data.error) {
      throw new Error(`OpenRouter API Error: ${response.data.error.message}`);
    }
    
    if (!response.data.choices || !response.data.choices[0]) {
      throw new Error('API response missing choices');
    }
    
    // Get the response text
    const responseText = response.data.choices[0].message.content;
    
    // Output response
    console.log('Response from OpenAI O3:');
    console.log(responseText);
    
    console.log('Test completed successfully!');
  } catch (error) {
    console.error('Test failed with error:', error.message);
    if (error.response) {
      console.error('Error details:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Run the test
testOpenRouterWithO3(); 