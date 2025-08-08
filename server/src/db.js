import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory of this file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from server root directory
dotenv.config({ path: path.join(__dirname, '..', '.env') });

class Database {
  constructor() {
    if (!Database.instance) {
      this.sequelize = new Sequelize(process.env.PG_DATABASE_URL, {
        dialect: 'postgres',
        logging: false, // Set to console.log to see SQL queries
        pool: {
          max: 5,
          min: 0,
          acquire: 30000,
          idle: 10000
        }
      });
      
      Database.instance = this;
    }
    
    return Database.instance;
  }

  getSequelize() {
    return this.sequelize;
  }

  async testConnection() {
    try {
      await this.sequelize.authenticate();
      console.log('✅ Database connection established successfully.');
      return true;
    } catch (error) {
      console.error('❌ Unable to connect to the database:', error);
      return false;
    }
  }

  async close() {
    await this.sequelize.close();
  }
}

// Create singleton instance
const db = new Database();

export default db;