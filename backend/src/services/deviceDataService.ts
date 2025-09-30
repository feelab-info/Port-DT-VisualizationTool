import axios from 'axios';
import { connectToMongo } from './databaseService';

// Configuration
const DEVICE_DATA_UPDATE_INTERVAL = 60000; // 1 minute in milliseconds
const DC_POWER_FLOW_API = process.env.DC_POWER_FLOW_API || 'http://localhost:5002';

// Device mappings (global variable extracted from original code)
let deviceMappings: Record<string, { name: string; owner: string }> = {};

/**
 * Set device mappings from external source
 * @param mappings Device mappings object
 */
export function setDeviceMappings(mappings: Record<string, { name: string; owner: string }>): void {
  deviceMappings = mappings;
}

/**
 * Get current device mappings
 */
export function getDeviceMappings(): Record<string, { name: string; owner: string }> {
  return deviceMappings;
}

/**
 * Collect device data from MongoDB
 */
export async function collectDeviceData(): Promise<any[]> {
  try {
    const db = await connectToMongo();
    const eGaugeCollection = db.collection('eGauge');
    
    // Get the actual device IDs for D1-D31 from our device mappings
    const targetDeviceIds: string[] = [];
    const deviceNameMap: Record<string, string> = {}; // Map real ID -> friendly name (D1, etc.)
    
    // Loop through deviceMappings to find our target devices
    for (const [deviceId, deviceInfo] of Object.entries(deviceMappings)) {
      // Check if the device name follows the pattern we want (D1-D31)
      if (deviceInfo.name.match(/^D([1-9]|[1-2][0-9]|3[0-1])$/)) {
        targetDeviceIds.push(deviceId);
        deviceNameMap[deviceId] = deviceInfo.name;
      }
    }
    
    console.log(`Found ${targetDeviceIds.length} matching device IDs from device mappings`);
    
    // If we don't have any target devices, return empty
    if (targetDeviceIds.length === 0) {
      console.warn('No matching device IDs found in deviceMappings. Check device naming convention.');
      return [];
    }
    
    // Optimized approach: Get latest readings for each device with time constraint
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const latestReadings = await eGaugeCollection.aggregate([
      // Match only recent documents for our target devices to reduce data size
      { $match: { 
          device: { $in: targetDeviceIds },
          timestamp: { $gte: oneDayAgo } // Only look at last 24 hours
      }},
      
      // Sort within each device group (limited dataset now)
      { $sort: { device: 1, timestamp: -1 } },
      
      // Group by device and get only the first (most recent) document
      { $group: {
          _id: "$device",
          latestDoc: { $first: "$$ROOT" }
      }},
      
      // Replace the root to get the original document structure
      { $replaceRoot: { newRoot: "$latestDoc" } }
    ]).toArray();
    
    console.log(`Retrieved ${latestReadings.length} device readings out of ${targetDeviceIds.length} targets`);
    
    // Map the readings to our required format
    const formattedData = latestReadings.map((reading) => {
      // Get the friendly name (e.g., D1) from our mapping
      const deviceName = deviceNameMap[reading.device] || `Unknown-${reading.device.substring(0, 8)}`;
      
      // Extract the device number from the friendly name
      const deviceMatch = deviceName.match(/^D(\d+)$/);
      const deviceNum = deviceMatch ? parseInt(deviceMatch[1]) : 0;
      
      // Calculate total power
      const activePower = calculateTotalPower(reading);
      
      return {
        device_id: reading.device,
        friendly_name: deviceName,
        bus_id: deviceNum, // Use the number from the D{n} pattern
        value: activePower,
        timestamp: reading.timestamp
      };
    });
    
    // Sort by bus_id to ensure proper order in Excel file
    formattedData.sort((a, b) => a.bus_id - b.bus_id);
    
    console.log(`Formatted data for ${formattedData.length} devices`);
    return formattedData;
  } catch (error) {
    console.error('Error collecting device data:', error);
    return [];
  }
}

/**
 * Calculate total power from device readings
 * @param reading Device reading object
 */
export function calculateTotalPower(reading: any): number {
  // Initialize total power as float
  let totalPower = 0.0;
  
  // Sum power from different phases and convert to kW
  if (reading.L1 && typeof reading.L1.P === 'number') {
    totalPower += reading.L1.P;
  }
  
  if (reading.L2 && typeof reading.L2.P === 'number') {
    totalPower += reading.L2.P;
  }
  
  if (reading.L3 && typeof reading.L3.P === 'number') {
    totalPower += reading.L3.P;
  }
  
  // Convert from watts to kilowatts
  totalPower = totalPower / 1000.0;
  
  return totalPower;
}

/**
 * Send device data to the DC power flow API
 * @param deviceData Device data array
 */
export async function sendDeviceDataToSimulation(deviceData: any[]): Promise<boolean> {
  try {
    const response = await axios.post(
      `${DC_POWER_FLOW_API}/update-device-data`,
      deviceData,
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );
    
    console.log('Device data sent to DC power flow simulation:', response.data);
    return true;
  } catch (error) {
    console.error('Error sending device data to DC power flow simulation:', error);
    return false;
  }
}

/**
 * Start periodic device data updates
 */
export function startDeviceDataUpdates(): void {
  console.log('Starting periodic device data updates for DC power flow simulation');
  
  // Initial update
  updateDeviceData();
  
  // Set up periodic updates
  setInterval(updateDeviceData, DEVICE_DATA_UPDATE_INTERVAL);
}

/**
 * Collect and send device data in one step
 */
export async function updateDeviceData(): Promise<void> {
  try {
    console.log('Collecting device data for DC power flow simulation...');
    const deviceData = await collectDeviceData();
    
    if (deviceData.length > 0) {
      console.log(`Sending data for ${deviceData.length} devices to DC power flow simulation...`);
      await sendDeviceDataToSimulation(deviceData);
    } else {
      console.log('No device data available to send');
    }
  } catch (error) {
    console.error('Error updating device data:', error);
  }
} 