#!/usr/bin/env node

/**
 * SQL execution tool for CVRB project
 * Usage: node src/tools/execute-sql.js "SELECT * FROM worlds;"
 */

import db from '../db.js';

async function executeSql() {
  const sqlCommand = process.argv[2];
  
  if (!sqlCommand) {
    console.error('Usage: node src/tools/execute-sql.js "SQL COMMAND"');
    process.exit(1);
  }

  try {
    // Test database connection
    const connected = await db.testConnection();
    if (!connected) {
      console.error('Failed to connect to database');
      process.exit(1);
    }

    console.log(`Executing SQL: ${sqlCommand}`);
    console.log('----------------------------------------');
    
    const sequelize = db.getSequelize();
    const [results, metadata] = await sequelize.query(sqlCommand);
    
    if (Array.isArray(results) && results.length > 0) {
      console.table(results);
      console.log(`\n✅ Query executed successfully. ${results.length} rows returned.`);
    } else {
      console.log('✅ Query executed successfully. No rows returned.');
    }
    
  } catch (error) {
    console.error('❌ Error executing SQL:', error.message);
    if (error.original) {
      console.error('Database error:', error.original.message);
    }
  } finally {
    await db.close();
  }
}

executeSql();