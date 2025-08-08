import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './db.js';
import WorldController from './controllers/world_controller.js';
import adminGuard from './middleware/admin_guard.js';

// Load environment variables
dotenv.config();

class Server {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || 3000;
    this.clientDistPath = this.resolveClientDistPath();
    console.log('Serving client from:', this.clientDistPath);
    this.setupMiddleware();
    this.setupRoutes();
  }

  resolveClientDistPath() {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    // Resolve to monorepo root -> client/dist
    return path.resolve(__dirname, '../../client/dist');
  }

  setupMiddleware() {
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    // Serve static assets from Vite build when available
    this.app.use(express.static(this.clientDistPath));
  }

  setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // World routes
    this.app.get('/api/worlds', WorldController.getWorlds);
    this.app.get('/api/worlds/:id/solutions', WorldController.getWorldSolutions);
    this.app.delete('/api/worlds/:id', adminGuard, WorldController.deleteWorld);
    this.app.patch('/api/worlds/:id/set', adminGuard, WorldController.updateWorldSet);
    
    // Statistics routes
    this.app.get('/api/solver-stats', WorldController.getSolverStats);
    this.app.get('/api/creator-stats', WorldController.getCreatorStats);
    
    // SPA fallback: for non-API GET requests, serve index.html from client build
    this.app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) {
        return next();
      }
      return res.sendFile(path.join(this.clientDistPath, 'index.html'));
    });
    
    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({ error: 'Route not found' });
    });
  }

  async start() {
    try {
      // Test database connection
      const isConnected = await db.testConnection();
      if (!isConnected) {
        console.error('Failed to connect to database');
        process.exit(1);
      }

      this.app.listen(this.port, () => {
        console.log(`🚀 Server running on port ${this.port}`);
        console.log(`📊 Health check: http://localhost:${this.port}/health`);
        console.log(`🌍 Worlds API: http://localhost:${this.port}/api/worlds`);
        console.log(`📦 Serving client from: ${this.clientDistPath}`);
      });
    } catch (error) {
      console.error('Failed to start server:', error);
      process.exit(1);
    }
  }
}

// Start server
const server = new Server();
server.start();