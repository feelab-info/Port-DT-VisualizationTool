import { Request, Response } from 'express';
import axios from 'axios';
import { collectDeviceData, sendDeviceDataToSimulation, getDeviceMappings, loadDeviceMappings } from '../services/deviceDataService';

const DC_POWER_FLOW_API = process.env.DC_POWER_FLOW_API || 'http://localhost:5002';

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

export async function getTimestepsResults(req: Request, res: Response): Promise<void> {
  try {
    const response = await axios.get(`${DC_POWER_FLOW_API}/get-timesteps-results`);
    res.json(response.data);
  } catch (error: any) {
    console.error('Error fetching timesteps results:', error);
    res.status(500).json({ 
      error: 'Failed to fetch timesteps results',
      details: error.message
    });
  }
}

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

export async function updateDeviceData(req: Request, res: Response): Promise<void> {
  try {
    const deviceData = await collectDeviceData();
    if (deviceData.length > 0) {
      const success = await sendDeviceDataToSimulation(deviceData);
      res.json({
        status: success ? 'success' : 'failed',
        message: `Updated ${deviceData.length} devices`
      });
    } else {
      res.status(400).json({ status: 'failed', message: 'No device data available' });
    }
  } catch (error: any) {
    console.error('Error updating device data:', error);
    res.status(500).json({ status: 'error', message: 'Failed to update device data' });
  }
}

export async function getAllDevices(req: Request, res: Response): Promise<void> {
  try {
    let deviceMappings = getDeviceMappings();
    if (Object.keys(deviceMappings).length === 0) {
      await loadDeviceMappings();
      deviceMappings = getDeviceMappings();
    }
    
    const devices = [];
    for (const [deviceId, deviceInfo] of Object.entries(deviceMappings)) {
      devices.push({
        id: deviceId,
        name: deviceInfo.name,
        friendlyName: deviceInfo.name,
        databaseId: deviceId
      });
    }
    
    if (devices.length === 0) {
      for (let i = 1; i <= 31; i++) {
        devices.push({ id: `D${i}`, name: `d${i}`, friendlyName: `d${i}` });
      }
    }
    
    res.json({ status: 'success', devices });
  } catch (error: any) {
    console.error('Error fetching devices:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch devices' });
  }
} 