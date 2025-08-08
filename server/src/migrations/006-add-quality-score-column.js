#!/usr/bin/env node

/**
 * Migration to add quality_score column to worlds table
 * Usage: node src/migrations/006-add-quality-score-column.js
 */

import db from '../db.js';

async function addQualityScoreColumn() {
  try {
    console.log('Adding quality_score column to worlds table...');
    
    // Test database connection
    const connected = await db.testConnection();
    if (!connected) {
      console.error('Failed to connect to database');
      process.exit(1);
    }

    const sequelize = db.getSequelize();
    
    const addColumnSQL = `
      ALTER TABLE worlds 
      ADD COLUMN IF NOT EXISTS quality_score REAL DEFAULT 0.0;
      
      -- Add comment for the new column
      COMMENT ON COLUMN worlds.quality_score IS 'Quality score for the CVRB as a float, default value is 0.0';
    `;
    
    await sequelize.query(addColumnSQL);
    
    console.log('✅ quality_score column added successfully!');
    
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

addQualityScoreColumn();