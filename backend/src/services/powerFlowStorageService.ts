import { db } from '../database/config';
import { PoolClient } from 'pg';

export interface PowerFlowSimulation {
  id?: number;
  simulation_time: Date;
  scenario: number;
  status: string;
  metadata?: any;
  created_at?: Date;
}

export interface SimulationTimestep {
  id?: number;
  simulation_id: number;
  timestep: number;
  bus_id: number;
  voltage?: number;
  power?: number;
  load?: number;
  converter_power?: number;
  converter_loading?: number;
  additional_data?: any;
  created_at?: Date;
}

export interface SimulationWithTimesteps {
  simulation: PowerFlowSimulation;
  timesteps: SimulationTimestep[];
}

class PowerFlowStorageService {
  /**
   * Store a complete simulation run with all timestep data
   */
  async storeSimulation(
    timestepData: any[],
    scenario: number = 2,
    metadata?: any
  ): Promise<number> {
    return await db.transaction(async (client: PoolClient) => {
      try {
        // Step 1: Insert simulation record
        const simulationResult = await client.query(
          `INSERT INTO power_flow_simulations (simulation_time, scenario, status, metadata)
           VALUES ($1, $2, $3, $4)
           RETURNING id`,
          [new Date(), scenario, 'completed', metadata ? JSON.stringify(metadata) : null]
        );

        const simulationId = simulationResult.rows[0].id;
        console.log(`[PowerFlow Storage] Created simulation record with ID: ${simulationId}`);

        // Step 2: Insert all timestep data
        if (timestepData && timestepData.length > 0) {
          const values: any[] = [];
          const placeholders: string[] = [];
          let paramIndex = 1;
          let skippedCount = 0;

          timestepData.forEach((data) => {
            // Skip records where bus_id is null or undefined
            if (data.bus_id === null || data.bus_id === undefined) {
              skippedCount++;
              return;
            }

            // Extract all additional data by removing the fields we're storing separately
            const additionalData = { ...data };
            delete additionalData.timestamp;
            delete additionalData.timestep;
            delete additionalData.bus_id;
            delete additionalData.voltage;
            delete additionalData.power;
            delete additionalData.load;
            delete additionalData.converter_power;
            delete additionalData.converter_loading;

            placeholders.push(
              `($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6}, $${paramIndex + 7}, $${paramIndex + 8})`
            );

            values.push(
              simulationId,
              data.timestep !== undefined && data.timestep !== null ? data.timestep : 1,
              data.bus_id,
              data.voltage !== undefined && data.voltage !== null ? data.voltage : null,
              data.power !== undefined && data.power !== null ? data.power : null,
              data.load !== undefined && data.load !== null ? data.load : null,
              data.converter_power !== undefined && data.converter_power !== null ? data.converter_power : null,
              data.converter_loading !== undefined && data.converter_loading !== null ? data.converter_loading : null,
              Object.keys(additionalData).length > 0 ? JSON.stringify(additionalData) : null
            );

            paramIndex += 9;
          });

          if (values.length > 0) {
            const insertQuery = `
              INSERT INTO simulation_timesteps 
              (simulation_id, timestep, bus_id, voltage, power, load, converter_power, converter_loading, additional_data)
              VALUES ${placeholders.join(', ')}
            `;

            await client.query(insertQuery, values);
            console.log(`[PowerFlow Storage] Inserted ${values.length / 9} timestep records${skippedCount > 0 ? ` (skipped ${skippedCount} records with null bus_id)` : ''}`);
          } else if (skippedCount > 0) {
            console.warn(`[PowerFlow Storage] All ${skippedCount} records had null bus_id and were skipped`);
          }
        }

        return simulationId;
      } catch (error: any) {
        console.error('[PowerFlow Storage] Error storing simulation:', error.message);
        throw error;
      }
    });
  }

  /**
   * Get the latest simulation with all its timestep data
   */
  async getLatestSimulation(): Promise<SimulationWithTimesteps | null> {
    try {
      const simulationResult = await db.query(
        `SELECT id, simulation_time, scenario, status, metadata, created_at
         FROM power_flow_simulations
         ORDER BY simulation_time DESC
         LIMIT 1`
      );

      if (simulationResult.rows.length === 0) {
        return null;
      }

      const simulation = simulationResult.rows[0];
      const timestepsResult = await db.query(
        `SELECT id, simulation_id, timestep, bus_id, voltage, power, load, 
                converter_power, converter_loading, additional_data, created_at
         FROM simulation_timesteps
         WHERE simulation_id = $1
         ORDER BY timestep, bus_id`,
        [simulation.id]
      );

      return {
        simulation,
        timesteps: timestepsResult.rows
      };
    } catch (error: any) {
      console.error('[PowerFlow Storage] Error getting latest simulation:', error.message);
      throw error;
    }
  }

  /**
   * Get simulation by ID with all timestep data
   */
  async getSimulationById(simulationId: number): Promise<SimulationWithTimesteps | null> {
    try {
      const simulationResult = await db.query(
        `SELECT id, simulation_time, scenario, status, metadata, created_at
         FROM power_flow_simulations
         WHERE id = $1`,
        [simulationId]
      );

      if (simulationResult.rows.length === 0) {
        return null;
      }

      const simulation = simulationResult.rows[0];
      const timestepsResult = await db.query(
        `SELECT id, simulation_id, timestep, bus_id, voltage, power, load,
                converter_power, converter_loading, additional_data, created_at
         FROM simulation_timesteps
         WHERE simulation_id = $1
         ORDER BY timestep, bus_id`,
        [simulationId]
      );

      return {
        simulation,
        timesteps: timestepsResult.rows
      };
    } catch (error: any) {
      console.error('[PowerFlow Storage] Error getting simulation by ID:', error.message);
      throw error;
    }
  }

  /**
   * Get all simulations with summary data (without full timestep details)
   */
  async getAllSimulations(limit: number = 100, offset: number = 0): Promise<any[]> {
    try {
      const result = await db.query(
        `SELECT id, simulation_time, scenario, status, timestep_count, bus_count, created_at
         FROM simulation_summary
         ORDER BY created_at DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      );

      return result.rows;
    } catch (error: any) {
      console.error('[PowerFlow Storage] Error getting all simulations:', error.message);
      throw error;
    }
  }

  /**
   * Get simulations within a time range
   */
  async getSimulationsByTimeRange(startTime: Date, endTime: Date): Promise<any[]> {
    try {
      const result = await db.query(
        `SELECT id, simulation_time, scenario, status, created_at
         FROM power_flow_simulations
         WHERE simulation_time BETWEEN $1 AND $2
         ORDER BY simulation_time DESC`,
        [startTime, endTime]
      );

      return result.rows;
    } catch (error: any) {
      console.error('[PowerFlow Storage] Error getting simulations by time range:', error.message);
      throw error;
    }
  }

  /**
   * Get timesteps for a specific bus across all simulations
   */
  async getTimestepsForBus(busId: number, limit: number = 100): Promise<any[]> {
    try {
      const result = await db.query(
        `SELECT st.*, s.simulation_time, s.scenario
         FROM simulation_timesteps st
         JOIN power_flow_simulations s ON st.simulation_id = s.id
         WHERE st.bus_id = $1
         ORDER BY s.simulation_time DESC, st.timestep
         LIMIT $2`,
        [busId, limit]
      );

      return result.rows;
    } catch (error: any) {
      console.error('[PowerFlow Storage] Error getting timesteps for bus:', error.message);
      throw error;
    }
  }

  /**
   * Delete old simulations (data retention policy)
   */
  async deleteOldSimulations(daysToKeep: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const result = await db.query(
        `DELETE FROM power_flow_simulations
         WHERE created_at < $1
         RETURNING id`,
        [cutoffDate]
      );

      const deletedCount = result.rows.length;
      if (deletedCount > 0) {
        console.log(`[PowerFlow Storage] Deleted ${deletedCount} simulations older than ${daysToKeep} days`);
      }

      return deletedCount;
    } catch (error: any) {
      console.error('[PowerFlow Storage] Error deleting old simulations:', error.message);
      throw error;
    }
  }

  /**
   * Get database statistics
   */
  async getStatistics(): Promise<any> {
    try {
      const stats = await db.query(
        `SELECT 
          COUNT(*) as total_simulations,
          COUNT(DISTINCT DATE(simulation_time)) as unique_days,
          MIN(simulation_time) as first_simulation,
          MAX(simulation_time) as last_simulation,
          (SELECT COUNT(*) FROM simulation_timesteps) as total_timesteps
         FROM power_flow_simulations`
      );

      return stats.rows[0];
    } catch (error: any) {
      console.error('[PowerFlow Storage] Error getting statistics:', error.message);
      throw error;
    }
  }
}

export const powerFlowStorageService = new PowerFlowStorageService();
export default powerFlowStorageService;

