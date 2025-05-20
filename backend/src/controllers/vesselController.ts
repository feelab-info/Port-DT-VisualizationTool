import { Request, Response } from 'express';
import axios from 'axios';

// Vessel API service URL
const VESSEL_API_URL = process.env.VESSEL_API_URL || 'http://localhost:5003';

/**
 * Process registered vessel request
 */
export async function processRegisteredVessel(req: Request, res: Response): Promise<void> {
  try {
    const vesselApiUrl = `${VESSEL_API_URL}/api/registered-vessel`;
    const response = await axios.post(vesselApiUrl, req.body);
    res.json(response.data);
  } catch (error) {
    console.error('Vessel modeling error:', error);
    res.status(500).json({ 
      error: 'Failed to process registered vessel',
      details: (error as any).response?.data || (error as Error).message 
    });
  }
}

/**
 * Process custom vessel request
 */
export async function processCustomVessel(req: Request, res: Response): Promise<void> {
  try {
    const vesselApiUrl = `${VESSEL_API_URL}/api/custom-vessel`;
    const response = await axios.post(vesselApiUrl, req.body);
    res.json(response.data);
  } catch (error) {
    console.error('Vessel modeling error:', error);
    res.status(500).json({ 
      error: 'Failed to process custom vessel',
      details: (error as any).response?.data || (error as Error).message 
    });
  }
}

/**
 * Get available vessels
 */
export async function getAvailableVessels(req: Request, res: Response): Promise<void> {
  try {
    const vesselApiUrl = `${VESSEL_API_URL}/api/available-vessels`;
    const response = await axios.get(vesselApiUrl);
    res.json(response.data);
  } catch (error) {
    console.error('Vessel modeling error:', error);
    res.status(500).json({ 
      error: 'Failed to get available vessels',
      details: (error as any).response?.data || (error as Error).message 
    });
  }
}

/**
 * Get vessel simulations
 */
export async function getVesselSimulations(req: Request, res: Response): Promise<void> {
  try {
    
    const date = "2025-04-28" as string;
    /**
    * const date = req.query.date as string;
    */
    let vesselApiUrl = `${VESSEL_API_URL}/api/simulations`;
    
    if (date) {
      vesselApiUrl += `?date=${date}`;
    }
    
    const response = await axios.get(vesselApiUrl);
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching vessel simulations:', error);
    res.status((error as any).response?.status || 500).json({ 
      error: 'Failed to fetch vessel simulations',
      details: (error as any).response?.data || (error as Error).message 
    });
  }
}

/**
 * Get vessel simulations by date
 */
export async function getVesselSimulationsByDate(req: Request, res: Response): Promise<void> {
  try {

    const { date } = req.params;
    const vesselApiUrl = `${VESSEL_API_URL}/api/simulations/${date}`;
    
    const response = await axios.get(vesselApiUrl);
    res.json(response.data);
  } catch (error) {
    console.error(`Error fetching vessel simulations for date ${req.params.date}:`, error);
    res.status((error as any).response?.status || 500).json({ 
      error: 'Failed to fetch vessel simulations for date',
      details: (error as any).response?.data || (error as Error).message 
    });
  }
}

/**
 * Get current vessel simulations
 */
export async function getCurrentVesselSimulations(req: Request, res: Response): Promise<void> {
  try {
    const vesselApiUrl = `${VESSEL_API_URL}/api/current-simulations`;
    
    const response = await axios.get(vesselApiUrl);
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching current vessel simulations:', error);
    res.status((error as any).response?.status || 500).json({ 
      error: 'Failed to fetch current vessel simulations',
      details: (error as any).response?.data || (error as Error).message 
    });
  }
} 