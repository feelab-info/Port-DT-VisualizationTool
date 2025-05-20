import { MongoClient, Db } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

// MongoDB connection
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const client = new MongoClient(mongoUri);
let db: Db | null = null;

/**
 * Connect to MongoDB and return the database instance
 */
export async function connectToMongo(): Promise<Db> {
  try {
    if (db) {
      // Return cached connection if exists
      return db;
    }
    
    await client.connect();
    console.log('Connected to MongoDB');
    db = client.db('enerspectrumSamples');
    return db;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}

/**
 * Get the MongoDB client instance
 */
export function getMongoClient(): MongoClient {
  return client;
}

/**
 * Close the MongoDB connection
 */
export async function closeMongoConnection(): Promise<void> {
  try {
    await client.close();
    console.log('MongoDB connection closed');
  } catch (error) {
    console.error('Error closing MongoDB connection:', error);
  }
} 