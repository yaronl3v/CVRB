/**
 * Manages the list of top LLM models from research
 */
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Configuration for all available LLM models
 * @enum {Object}
 */


//"effort": "high", // Can be "high", "medium", or "low" (OpenAI-style)
//Open ai / Grok / Anthropic / Gemini

export const ModelsConfig = {
  CLAUDE_4_OPUS: {
    apiName: 'anthropic/claude-opus-4',
    effort: 'high'
  },
  CLAUDE_4_SONNET: {
    apiName: 'anthropic/claude-sonnet-4',
    effort: 'high'
  },
  GEMINI_2_5_PRO: {
    apiName: 'google/gemini-2.5-pro'
  },
  GEMINI_2_5_FLASH: {
    apiName: 'google/gemini-2.5-flash'
  },
  DEEPSEEK_R1: {
    apiName: 'deepseek/deepseek-r1-0528'
  },
  GROK_4: {
    apiName: 'x-ai/grok-4'
  },
  O3: {
    apiName: 'openai/o3'
  },
  O4_MINI_HIGH: {
    apiName: 'openai/o4-mini-high',  
  },
  GPT_5: {
    apiName: 'openai/gpt-5',  
  },
  
  QWEN3_THINKING: {
    apiName: 'qwen/qwen3-235b-a22b-thinking-2507'
  },
  GPT_4o: {
    apiName: 'openai/gpt-4o'
  },

};