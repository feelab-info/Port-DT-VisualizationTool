import { Request, Response } from 'express';
import axios from 'axios';
import { collectDeviceData, sendDeviceDataToSimulation } from '../services/deviceDataService';

// DC Power Flow Simulation API proxy
const DC_POWER_FLOW_API = process.env.DC_POWER_FLOW_API || 'http://localhost:5002';

/**
 * Run a simulation with provided parameters
 */
export async function runSimulation(req: Request, res: Response): Promise<void> {
  try {
    const response = await axios.post(`${DC_POWER_FLOW_API}/run-simulation`, req.body);
    res.json(response.data);
  } catch (error: any) {
    console.error('Simulation error:', error);
    res.status(500).json({ 
      error: 'Failed to run simulation',
      details: error.response?.data || error.message 
    });
  }
}

/**
 * Get simulation results for a specific scenario
 */
export async function getSimulationResults(req: Request, res: Response): Promise<void> {
  try {
    const { scenarioId } = req.params;
    const response = await axios.get(`${DC_POWER_FLOW_API}/get-results/${scenarioId}`);
    res.json(response.data);
  } catch (error: any) {
    console.error('Error fetching simulation results:', error);
    res.status(error.response?.status || 500).json({
      error: 'Failed to fetch simulation results',
      details: error.response?.data || error.message
    });
  }
}

/**
 * Get the latest simulation results
 */
export async function getLatestResults(req: Request, res: Response): Promise<void> {
  try {
    const response = await axios.get(`${DC_POWER_FLOW_API}/get-latest-results`);
    res.json(response.data);
  } catch (error: any) {
    console.error('Error forwarding request to DC Power Flow API:', error);
    res.status(500).json({ 
      error: 'Failed to fetch simulation results',
      details: error.message
    });
  }
}

/**
 * Get sizing results
 */
export async function getSizingResults(req: Request, res: Response): Promise<void> {
  try {
    const response = await axios.get(`${DC_POWER_FLOW_API}/get-sizing-results`);
    res.json(response.data);
  } catch (error: any) {
    console.error('Error fetching sizing results:', error);
    res.status(500).json({ 
      error: 'Failed to fetch sizing results',
      details: error.message
    });
  }
}

/**
 * Get timesteps results
 */
export async function getTimestepsResults(req: Request, res: Response): Promise<void> {
  try {
    // Explicitly use the full URL to avoid path confusion
    const fullUrl = `${DC_POWER_FLOW_API}/get-timesteps-results`;
    console.log(`Attempting to fetch timesteps results from ${fullUrl}`);
    const response = await axios.get(fullUrl);
    console.log(`Successfully received timesteps results with status ${response.status}`);
    res.json(response.data);
  } catch (error: any) {
    console.error('Error fetching timesteps load flow results:', error);
    if (error.response) {
      console.error(`Response status: ${error.response.status}`);
      console.error(`Response data:`, error.response.data);
    }
    res.status(500).json({ 
      error: 'Failed to fetch timesteps load flow results',
      details: error.message
    });
  }
}

/**
 * Start the simulation service
 */
export async function startSimulationService(req: Request, res: Response): Promise<void> {
  try {
    const response = await axios.post(`${DC_POWER_FLOW_API}/start-simulation-service`);
    res.json(response.data);
  } catch (error: any) {
    console.error('Error starting simulation service:', error);
    res.status(500).json({ 
      error: 'Failed to start simulation service',
      details: error.message
    });
  }
}

/**
 * Manually trigger a device data update
 */
export async function updateDeviceData(req: Request, res: Response): Promise<void> {
  try {
    console.log('Manually triggering device data update for DC power flow simulation');
    const deviceData = await collectDeviceData();
    
    if (deviceData.length > 0) {
      const success = await sendDeviceDataToSimulation(deviceData);
      res.json({
        status: success ? 'success' : 'failed',
        message: `Updated ${deviceData.length} devices`,
        data: deviceData
      });
    } else {
      res.status(400).json({
        status: 'failed',
        message: 'No device data available to send'
      });
    }
  } catch (error: any) {
    console.error('Error manually updating device data:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update device data',
      details: error.message
    });
  }
}

/**
 * Get current Excel device data
 */
export async function getExcelDeviceData(req: Request, res: Response): Promise<void> {
  try {
    const response = await axios.get(`${DC_POWER_FLOW_API}/get-excel-device-data`);
    res.json(response.data);
  } catch (error: any) {
    console.error('Error fetching Excel device data:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch Excel device data',
      details: error.message
    });
  }
}

/**
 * Get all available devices with their friendly names
 */
export async function getAllDevices(req: Request, res: Response): Promise<void> {
  try {
    // Return all available devices D1-D31 with their friendly names
    const devices = [];
    for (let i = 1; i <= 31; i++) {
      devices.push({
        id: `D${i}`,
        name: `Device D${i}`,
        friendlyName: `Device D${i}`
      });
    }
    
    // Add other known devices
    devices.push({
      id: 'F9',
      name: 'Device F9',
      friendlyName: 'Device F9'
    });
    
    devices.push({
      id: 'Entrada de energia',
      name: 'Entrada de energia',
      friendlyName: 'Entrada de energia'
    });
    
    res.json({
      status: 'success',
      devices: devices
    });
  } catch (error: any) {
    console.error('Error fetching all devices:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch all devices',
      details: error.message
    });
  }
} 