#!/usr/bin/env node

/**
 * Migration to add world_name column to worlds table
 * Usage: node src/migrations/003-add-CVRB-name-column.js
 */

import db from '../db.js';

async function addWorldNameColumn() {
  try {
    console.log('Adding world_name column to worlds table...');
    
    // Test database connection
    const connected = await db.testConnection();
    if (!connected) {
      console.error('Failed to connect to database');
      process.exit(1);
    }

    const sequelize = db.getSequelize();
    
    const addColumnSQL = `
      ALTER TABLE worlds 
      ADD COLUMN IF NOT EXISTS world_name VARCHAR(255);
      
      -- Add comment for the new column
      COMMENT ON COLUMN worlds.world_name IS 'The name of the CVRB from the LLM response';
    `;
    
    await sequelize.query(addColumnSQL);
    
    console.log('✅ world_name column added successfully!');
    
    // Show updated table structure
    const [tableInfo] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'worlds' 
      ORDER BY ordinal_position;
    `);
    
    console.log('\n📋 Updated table structure:');
    console.table(tableInfo);
    
  } catch (error) {
    console.error('❌ Error adding column:', error.message);
    if (error.original) {
      console.error('Database error:', error.original.message);
    }
  } finally {
    await db.close();
  }
}

addWorldNameColumn();