import { MongoClient, Db, Collection, Document } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

// MongoDB connection with optimized connection pool settings
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const client = new MongoClient(mongoUri, {
  maxPoolSize: 50, // Maximum number of connections in the pool
  minPoolSize: 10, // Minimum number of connections to maintain
  maxIdleTimeMS: 30000, // Close connections idle for 30 seconds
  connectTimeoutMS: 10000, // 10 second connection timeout
  socketTimeoutMS: 45000, // 45 second socket timeout
  serverSelectionTimeoutMS: 10000, // 10 second server selection timeout
  compressors: ['zlib'], // Enable compression for network traffic
});

let db: Db | null = null;
let metadataDb: Db | null = null;

// Collection cache to avoid repeated collection() calls
const collectionCache: Map<string, Collection<any>> = new Map();

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
    
    // Create indexes for eGauge collection on first connection
    await ensureIndexes();
    
    return db;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}

/**
 * Get metadata database instance
 */
export async function getMetadataDb(): Promise<Db> {
  if (!metadataDb) {
    await client.connect();
    metadataDb = client.db('enerspectrumMetadata');
  }
  return metadataDb;
}

/**
 * Get a cached collection instance
 */
export function getCachedCollection<T extends Document = any>(dbName: string, collectionName: string): Collection<T> {
  const cacheKey = `${dbName}:${collectionName}`;
  
  if (collectionCache.has(cacheKey)) {
    return collectionCache.get(cacheKey) as Collection<T>;
  }
  
  const dbInstance = dbName === 'enerspectrumMetadata' 
    ? client.db('enerspectrumMetadata')
    : (db || client.db('enerspectrumSamples'));
  
  const collection = dbInstance.collection<T>(collectionName);
  collectionCache.set(cacheKey, collection as Collection<any>);
  
  return collection;
}

/**
 * Ensure all necessary indexes exist for optimal performance
 */
async function ensureIndexes(): Promise<void> {
  try {
    console.log('🔍 Ensuring MongoDB indexes...');
    
    if (!db) {
      console.error('❌ Database not connected - cannot create indexes');
      return;
    }
    
    const eGaugeCollection = db.collection('eGauge');
    
    // List existing indexes first
    const existingIndexes = await eGaugeCollection.indexes();
    console.log(`📊 Existing indexes: ${existingIndexes.map(idx => idx.name).join(', ')}`);
    
    // Create compound index for common query patterns
    try {
      const idx1 = await eGaugeCollection.createIndex(
        { timestamp: -1, device: 1 }, 
        { background: true, name: 'timestamp_device_idx' }
      );
      console.log('✅ Created/verified index: timestamp_device_idx');
    } catch (e: any) {
      if (e.code === 85 || e.codeName === 'IndexOptionsConflict') {
        console.log('ℹ️  Index timestamp_device_idx already exists with different options');
      } else {
        console.error('❌ Failed to create timestamp_device_idx:', e.message);
      }
    }
    
    // Create index for device-only queries
    try {
      const idx2 = await eGaugeCollection.createIndex(
        { device: 1 }, 
        { background: true, name: 'device_idx' }
      );
      console.log('✅ Created/verified index: device_idx');
    } catch (e: any) {
      if (e.code === 85 || e.codeName === 'IndexOptionsConflict') {
        console.log('ℹ️  Index device_idx already exists with different options');
      } else {
        console.error('❌ Failed to create device_idx:', e.message);
      }
    }
    
    // Create index for timestamp-only queries (for polling)
    try {
      const idx3 = await eGaugeCollection.createIndex(
        { timestamp: -1 }, 
        { background: true, name: 'timestamp_desc_idx' }
      );
      console.log('✅ Created/verified index: timestamp_desc_idx');
    } catch (e: any) {
      if (e.code === 85 || e.codeName === 'IndexOptionsConflict') {
        console.log('ℹ️  Index timestamp_desc_idx already exists with different options');
      } else {
        console.error('❌ Failed to create timestamp_desc_idx:', e.message);
      }
    }
    
    console.log('✅ MongoDB index setup complete');
  } catch (error) {
    console.error('❌ Error in ensureIndexes():', error);
    // Don't throw - allow app to continue even if indexes fail
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