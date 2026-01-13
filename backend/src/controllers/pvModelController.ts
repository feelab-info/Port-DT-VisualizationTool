import { Request, Response } from 'express';
import axios from 'axios';

// PV Model API service URL
const PV_MODEL_API_URL = process.env.PV_MODEL_API || 'http://localhost:5004';

/**
 * Configure PV system
 */
export async function configurePVSystem(req: Request, res: Response): Promise<void> {
  try {
    const pvModelApiUrl = `${PV_MODEL_API_URL}/pv_model/configure`;
    const response = await axios.post(pvModelApiUrl, req.body);
    res.json(response.data);
  } catch (error) {
    console.error('PV Model configuration error:', error);
    res.status(500).json({ 
      error: 'Failed to configure PV system',
      details: (error as any).response?.data || (error as Error).message 
    });
  }
}

/**
 * Get PV system status
 */
export async function getPVSystemStatus(req: Request, res: Response): Promise<void> {
  try {
    const pvModelApiUrl = `${PV_MODEL_API_URL}/pv_model/status`;
    const response = await axios.get(pvModelApiUrl);
    res.json(response.data);
  } catch (error) {
    console.error('PV Model status error:', error);
    res.status(500).json({ 
      error: 'Failed to get PV system status',
      details: (error as any).response?.data || (error as Error).message 
    });
  }
}

/**
 * Calculate power series
 */
export async function calculatePowerSeries(req: Request, res: Response): Promise<void> {
  try {
    const pvModelApiUrl = `${PV_MODEL_API_URL}/pv_model/power-series`;
    const response = await axios.post(pvModelApiUrl, req.body);
    res.json(response.data);
  } catch (error) {
    console.error('PV Model power series error:', error);
    res.status(500).json({ 
      error: 'Failed to calculate power series',
      details: (error as any).response?.data || (error as Error).message 
    });
  }
}

/**
 * Get PV Model health status
 */
export async function getPVModelHealth(req: Request, res: Response): Promise<void> {
  try {
    const pvModelApiUrl = `${PV_MODEL_API_URL}/health`;
    const response = await axios.get(pvModelApiUrl);
    res.json(response.data);
  } catch (error) {
    console.error('PV Model health check error:', error);
    res.status(500).json({ 
      error: 'Failed to check PV Model health',
      details: (error as any).response?.data || (error as Error).message 
    });
  }
}

