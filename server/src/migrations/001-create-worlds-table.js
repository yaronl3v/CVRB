#!/usr/bin/env node

/**
 * Migration to create the worlds table
 * Usage: node src/migrations/001-create-worlds-table.js
 */

import db from '../db.js';

async function createWorldsTable() {
  try {
    console.log('Creating worlds table...');
    
    // Test database connection
    const connected = await db.testConnection();
    if (!connected) {
      console.error('Failed to connect to database');
      process.exit(1);
    }

    const sequelize = db.getSequelize();
    
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS worlds (
        id SERIAL PRIMARY KEY,
        creator VARCHAR(255) NOT NULL,
        is_valid BOOLEAN DEFAULT NULL,
        validation_notes JSONB DEFAULT '{}',
        world_info JSONB NOT NULL,
        world_code TEXT NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
      
      -- Create indexes for better performance
      CREATE INDEX IF NOT EXISTS idx_worlds_creator ON worlds(creator);
      CREATE INDEX IF NOT EXISTS idx_worlds_is_valid ON worlds(is_valid);
      CREATE INDEX IF NOT EXISTS idx_worlds_created_at ON worlds("createdAt");
    `;
    
    await sequelize.query(createTableSQL);
    
    console.log('✅ Worlds table created successfully!');
    
    // Show table structure
    const [tableInfo] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'worlds' 
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

createWorldsTable();