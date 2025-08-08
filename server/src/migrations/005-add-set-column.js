#!/usr/bin/env node

/**
 * Migration to add set column to worlds table
 * Usage: node src/migrations/005-add-set-column.js
 */

import db from '../db.js';

async function addSetColumn() {
  try {
    console.log('Adding set column to worlds table...');
    
    // Test database connection
    const connected = await db.testConnection();
    if (!connected) {
      console.error('Failed to connect to database');
      process.exit(1);
    }

    const sequelize = db.getSequelize();
    
    const addColumnSQL = `
      ALTER TABLE worlds 
      ADD COLUMN IF NOT EXISTS "set" INTEGER DEFAULT 0;
      
      -- Add comment for the new column
      COMMENT ON COLUMN worlds."set" IS 'Set identifier for grouping worlds, default value is 0';
    `;
    
    await sequelize.query(addColumnSQL);
    
    console.log('✅ set column added successfully!');
    
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

addSetColumn();