#!/usr/bin/env node

/**
 * Database creation tool for CVRB project
 * Creates the database if it doesn't exist
 */

import { Client } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory of this file and load environment variables from server root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

async function createDatabase() {
  let client;
  
  try {
    // Parse the database URL to get connection details
    const dbUrl = process.env.PG_DATABASE_URL;

    const url = new URL(dbUrl);
    
    const dbName = url.pathname.slice(1); // Remove leading slash
    const connectionConfig = {
      host: url.hostname,
      port: url.port || 5432,
      user: url.username,
      password: url.password,
      database: 'postgres' // Connect to default postgres database first
    };
    
    console.log(`Attempting to create database: ${dbName}`);
    console.log(`Host: ${connectionConfig.host}:${connectionConfig.port}`);
    
    // Connect to postgres database
    client = new Client(connectionConfig);
    await client.connect();
    
    // Check if database exists
    const checkResult = await client.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [dbName]
    );
    
    if (checkResult.rows.length > 0) {
      console.log(`✅ Database '${dbName}' already exists.`);
    } else {
      // Create the database
      await client.query(`CREATE DATABASE "${dbName}"`);
      console.log(`✅ Database '${dbName}' created successfully!`);
    }
    
  } catch (error) {
    console.error('❌ Error creating database:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Hint: Make sure PostgreSQL is running and accessible.');
      console.error('   Check your PG_DATABASE_URL environment variable.');
    }
  } finally {
    if (client) {
      await client.end();
    }
  }
}

createDatabase();