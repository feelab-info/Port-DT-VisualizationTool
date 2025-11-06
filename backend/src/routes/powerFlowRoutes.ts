import { Router, Request, Response } from 'express';
import { powerFlowStorageService } from '../services/powerFlowStorageService';

const router = Router();

/**
 * GET /api/powerflow/simulations
 * Get all simulations with summary data
 */
router.get('/simulations', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;

    const simulations = await powerFlowStorageService.getAllSimulations(limit, offset);
    res.json({
      success: true,
      count: simulations.length,
      data: simulations
    });
  } catch (error: any) {
    console.error('Error fetching simulations:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/powerflow/simulations/latest
 * Get the latest simulation with all timestep data
 */
router.get('/simulations/latest', async (req: Request, res: Response): Promise<any> => {
  try {
    const simulation = await powerFlowStorageService.getLatestSimulation();
    
    if (!simulation) {
      return res.status(404).json({
        success: false,
        error: 'No simulations found'
      });
    }

    res.json({
      success: true,
      data: simulation
    });
  } catch (error: any) {
    console.error('Error fetching latest simulation:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/powerflow/simulations/:id
 * Get a specific simulation by ID with all timestep data
 */
router.get('/simulations/:id', async (req: Request, res: Response): Promise<any> => {
  try {
    const simulationId = parseInt(req.params.id);
    
    if (isNaN(simulationId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid simulation ID'
      });
    }

    const simulation = await powerFlowStorageService.getSimulationById(simulationId);
    
    if (!simulation) {
      return res.status(404).json({
        success: false,
        error: 'Simulation not found'
      });
    }

    res.json({
      success: true,
      data: simulation
    });
  } catch (error: any) {
    console.error('Error fetching simulation:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/powerflow/simulations/timerange
 * Get simulations within a time range
 */
router.get('/simulations/timerange', async (req: Request, res: Response): Promise<any> => {
  try {
    const startTime = req.query.start as string;
    const endTime = req.query.end as string;

    if (!startTime || !endTime) {
      return res.status(400).json({
        success: false,
        error: 'Both start and end time parameters are required'
      });
    }

    const simulations = await powerFlowStorageService.getSimulationsByTimeRange(
      new Date(startTime),
      new Date(endTime)
    );

    res.json({
      success: true,
      count: simulations.length,
      data: simulations
    });
  } catch (error: any) {
    console.error('Error fetching simulations by time range:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/powerflow/bus/:busId/timesteps
 * Get all timesteps for a specific bus across simulations
 */
router.get('/bus/:busId/timesteps', async (req: Request, res: Response): Promise<any> => {
  try {
    const busId = parseInt(req.params.busId);
    const limit = parseInt(req.query.limit as string) || 100;

    if (isNaN(busId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid bus ID'
      });
    }

    const timesteps = await powerFlowStorageService.getTimestepsForBus(busId, limit);

    res.json({
      success: true,
      count: timesteps.length,
      data: timesteps
    });
  } catch (error: any) {
    console.error('Error fetching timesteps for bus:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/powerflow/statistics
 * Get database statistics
 */
router.get('/statistics', async (req: Request, res: Response) => {
  try {
    const statistics = await powerFlowStorageService.getStatistics();

    res.json({
      success: true,
      data: statistics
    });
  } catch (error: any) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/powerflow/simulations/cleanup
 * Delete old simulations (data retention)
 */
router.delete('/simulations/cleanup', async (req: Request, res: Response) => {
  try {
    const daysToKeep = parseInt(req.query.days as string) || 30;

    const deletedCount = await powerFlowStorageService.deleteOldSimulations(daysToKeep);

    res.json({
      success: true,
      deletedCount,
      message: `Deleted ${deletedCount} simulations older than ${daysToKeep} days`
    });
  } catch (error: any) {
    console.error('Error cleaning up old simulations:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;

