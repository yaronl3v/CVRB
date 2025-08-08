#!/usr/bin/env node

/**
 * Migration to create the solutions table
 * Usage: node src/migrations/004-create-solutions-table.js
 */

import db from '../db.js';

async function createSolutionsTable() {
  try {
    console.log('Creating solutions table...');
    
    // Test database connection
    const connected = await db.testConnection();
    if (!connected) {
      console.error('Failed to connect to database');
      process.exit(1);
    }

    const sequelize = db.getSequelize();
    
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS solutions (
        id SERIAL PRIMARY KEY,
        model VARCHAR(255) NOT NULL,
        world_id INTEGER NOT NULL REFERENCES worlds(id) ON DELETE CASCADE,
        score INTEGER,
        raw_responses JSONB DEFAULT '[]',
        results JSONB DEFAULT '{}',
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
      
      -- Create indexes for better performance
      CREATE INDEX IF NOT EXISTS idx_solutions_model ON solutions(model);
      CREATE INDEX IF NOT EXISTS idx_solutions_world_id ON solutions(world_id);
      CREATE INDEX IF NOT EXISTS idx_solutions_score ON solutions(score);
      CREATE INDEX IF NOT EXISTS idx_solutions_created_at ON solutions("createdAt");
      
      -- Create unique constraint to prevent duplicate model solutions for same world
      CREATE UNIQUE INDEX IF NOT EXISTS idx_solutions_unique_model_world 
      ON solutions(model, world_id);
    `;
    
    await sequelize.query(createTableSQL);
    
    console.log('✅ Solutions table created successfully!');
    
    // Show table structure
    const [tableInfo] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'solutions' 
      ORDER BY ordinal_position;
    `);
    
    console.log('\n📋 Table structure:');
    console.table(tableInfo);
    
  } catch (error) {
    console.error('❌ Error creating table:', error.message);
    if (error.original) {
      console.error('Database error:', error.original.message);
    }
  } finally {
    await db.close();
  }
}

createSolutionsTable();