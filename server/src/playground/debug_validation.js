import { CVRB } from '../CVRB/CVRB.js';

/**
 * Simple script to debug CVRB validation process
 */
async function debugValidation() {
  // Hardcode CVRB ID for debugging
  const worldId =5; // Change this to the CVRB ID you want to test
  
  const cvrb = new CVRB();
  
  try {
    console.log(`Testing validation for world ID: ${worldId}`);
    const result = await cvrb.testValidation(worldId);
    
    console.log('Validation Result:');
    console.log(JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await cvrb.close();
  }
}

debugValidation();