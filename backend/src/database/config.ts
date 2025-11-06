import { Pool, PoolClient, QueryResult } from 'pg';

interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  max?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

class Database {
  private pool: Pool | null = null;
  private config: DatabaseConfig;

  constructor() {
    this.config = {
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      database: process.env.POSTGRES_DB || 'port_digital_twin',
      user: process.env.POSTGRES_USER || 'portadmin',
      password: process.env.POSTGRES_PASSWORD || 'portpass123',
      max: 20, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
      connectionTimeoutMillis: 10000, // Return an error after 10 seconds if connection could not be established
    };
  }

  async connect(): Promise<void> {
    if (this.pool) {
      console.log('Database pool already exists');
      return;
    }

    try {
      this.pool = new Pool(this.config);

      // Test the connection
      const client = await this.pool.connect();
      console.log('✅ PostgreSQL connected successfully');
      console.log(`   Database: ${this.config.database}`);
      console.log(`   Host: ${this.config.host}:${this.config.port}`);
      
      client.release();

      // Handle pool errors
      this.pool.on('error', (err: Error) => {
        console.error('❌ Unexpected error on idle client', err);
      });

    } catch (error: any) {
      console.error('❌ Failed to connect to PostgreSQL:', error.message);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      console.log('PostgreSQL connection pool closed');
    }
  }

  getPool(): Pool {
    if (!this.pool) {
      throw new Error('Database pool not initialized. Call connect() first.');
    }
    return this.pool;
  }

  async query(text: string, params?: any[]): Promise<QueryResult> {
    if (!this.pool) {
      throw new Error('Database pool not initialized. Call connect() first.');
    }
    
    try {
      const start = Date.now();
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      
      if (duration > 100) {
        console.warn(`⚠️ Slow query (${duration}ms): ${text.substring(0, 100)}...`);
      }
      
      return result;
    } catch (error: any) {
      console.error('Database query error:', error.message);
      throw error;
    }
  }

  async getClient(): Promise<PoolClient> {
    if (!this.pool) {
      throw new Error('Database pool not initialized. Call connect() first.');
    }
    return await this.pool.connect();
  }

  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.getClient();
    
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.query('SELECT 1');
      return true;
    } catch (error) {
      return false;
    }
  }
}

// Export singleton instance
export const db = new Database();
export default db;


