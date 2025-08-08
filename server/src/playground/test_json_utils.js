import fs from 'fs';
import { JSONUtils } from '../tools/json_utils.js';

const filePath = 'server/llm_requests/20250804-19-29-23.response';

try {
  const fileContent = fs.readFileSync(filePath, 'utf8');
  console.log('yay');
  
  const parsed = JSONUtils.tryParseJson(fileContent);
} catch (error) {
  console.log('nay');
}