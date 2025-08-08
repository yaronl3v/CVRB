import JSON5 from 'json5';

/**
 * Utility class for JSON parsing and cleaning operations
 */
export class JSONUtils {
  /**
   * Cleans JSON string by removing markdown code blocks and newlines
   * 
   * @param {string} response - Raw response containing JSON
   * @returns {string} - Cleaned JSON string
   */
  static cleanJson(response) {
    return response.replace(/```json\n?/g, '')
                  .replace(/```\n?/g, '');
  }

  /**
   * Cleans JavaScript code by removing markdown code blocks and optional javascript header
   * 
   * @param {string} response - Raw response containing JavaScript code
   * @returns {string} - Cleaned JavaScript code
   */
  static cleanJavaScriptCode(response) {
    let cleaned = response;
    
    // Remove ```javascript markers if they exist
    cleaned = cleaned.replace(/```javascript\n?/g, '');
    
    // Remove closing ``` if they exist
    cleaned = cleaned.replace(/```\n?/g, '');
    
    // Check if string starts with "javascript\n" and remove it
    if (cleaned.startsWith('javascript\n')) {
      cleaned = cleaned.substring('javascript\n'.length);
    }
    
    return cleaned;
  }

  /**
   * Attempts to parse JSON with fallback to handle common LLM output issues
   * 
   * @param {string} str - String containing JSON to parse
   * @returns {Object|null} - Parsed JSON object or null if parsing failed
   */
  /**
   * Safely parse a JSON string using JSON5. Returns null instead of throwing.
   *
   * @private
   * @param {string} candidate - String that should contain valid JSON
   * @returns {object|null} Parsed object or null when parsing fails
   */
  static safeParse(candidate) {
    try {
      //console.log(candidate);
      return JSON5.parse(candidate);
    } catch {
      return null;
    }
  }

  /**
   * Extracts the most plausible JSON block from an arbitrary string.
   * It looks for the first opening brace and then walks backwards from the
   * last closing brace until a parsable block is found.
   *
   * @private
   * @param {string} str - Text that may contain a JSON object with surrounding text
   * @returns {string|null} The extracted JSON substring or null when not found
   */
  /**
   * Returns the outer-most JSON object in the string while being
   * robust to braces that live inside quoted substrings.
   * The algorithm performs a single forward scan keeping track of
   * string state and brace depth, returning as soon as the depth
   * reaches zero.
   *
   * @private
   * @param {string} str
   * @returns {string|null}
   */
  static extractJsonBlock(str) {
    const firstOpen = str.indexOf('{');
    if (firstOpen === -1) return null;

    let inString = false;
    let escaped = false;
    let depth = 0;

    for (let i = firstOpen; i < str.length; i++) {
      const ch = str[i];

      if (escaped) {
        escaped = false;
        continue;
      }

      if (ch === '\\') {
        escaped = true;
        continue;
      }

      if (ch === '"') {
        inString = !inString;
        continue;
      }

      if (inString) continue;

      if (ch === '{') {
        depth++;
      } else if (ch === '}') {
        depth--;
        if (depth === 0) {
          const candidate = str.slice(firstOpen, i + 1);
          if (this.safeParse(candidate)) return candidate;
        }
      }
    }

    return null;
  }

  /**
   * Extracts JSON content from the end of the string when it is wrapped in a
   * markdown fence that starts with ```json and ends with ``` at the very end
   * of the string. The search is performed backwards from the end so it is
   * resilient to additional ```json blocks that may appear earlier.
   *
   * The returned content does NOT include the fence markers themselves.
   *
   * @private
   * @param {string} str
   * @returns {string|null}
   */
  static extractJsonFenceBlockFromEnd(str) {
    const trimmed = str.trim();
    if (!trimmed.endsWith('```')) return null;

    const startMarker = '```json';
    const startIdx = trimmed.lastIndexOf(startMarker);
    if (startIdx === -1) return null;

    const contentStart = startIdx + startMarker.length;
    const endIdx = trimmed.lastIndexOf('```');
    if (endIdx === -1 || endIdx <= contentStart) return null;

    return trimmed.slice(contentStart, endIdx).trim();
  }

  /**
   * Attempts to parse JSON from LLM responses that may include surrounding text
   * or be wrapped in markdown code blocks. The function progressively tries:
   *  1. Direct parse after removing markdown wrappers
   *  2. Parsing a detected JSON block inside the text
   *  3. Parsing again after appending a missing closing brace (common LLM issue)
   *
   * @param {string} str - Raw response potentially containing JSON
   * @returns {object|null} Parsed object or null when all attempts fail
   */
  static tryParseJson(str) {
    // Attempt a direct parse after basic cleanup
    const cleaned = this.cleanJson(str);
    const direct = this.safeParse(cleaned);
    if (direct) return direct;
    //console.log("direct json parsing failed");

    // Next, check for a fenced ```json block that appears at the end
    const fencedBlock = this.extractJsonFenceBlockFromEnd(str);
    if (fencedBlock) {
      const cleanedFence = this.cleanJson(fencedBlock);
      const parsedFence = this.safeParse(cleanedFence);      
      if (parsedFence) return parsedFence;      
    }

    // Attempt after stripping any remaining backticks
    const removedTicks = cleaned.replace(/```/g, '');
    const parsedNoTicks = this.safeParse(removedTicks);
    if (parsedNoTicks) return parsedNoTicks;

    // Finally, fall back to brace-matching extraction
    const block = this.extractJsonBlock(cleaned);
    if (block) {
      const parsedBlock = this.safeParse(block);
      if (parsedBlock) return parsedBlock;
      console.log("extracted block parsing failed");

      // Single missing brace is a common LLM error – try to fix
      const fixed = this.safeParse(block + '}');
      if (fixed) return fixed;
      console.log("fixed block parsing failed");
    }

    // Add more detailed error logging
    // console.error('JSONUtils: Failed to parse JSON from provided string');
    // console.error('String length:', str.length);
    // console.error('First 200 chars:', str.substring(0, 200));
    // console.error('Last 200 chars:', str.substring(str.length - 200));
    return null;
  }
}