import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { setupRoutes } from './routes';
import { initSocketHandlers } from './services/socketService';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const httpServer = createServer(app);

// Configure Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Initialize socket handlers
initSocketHandlers(io);

// Setup routes
setupRoutes(app);

// Basic health check route
app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

export { app, httpServer, io }; 