import { Server, Socket } from 'socket.io';
import { connectToMongo } from './databaseService';
import { ObjectId } from 'mongodb';
import { getDeviceMappings } from './deviceDataService';

/**
 * Initialize Socket.IO event handlers
 * @param io Socket.IO server instance
 */
export function initSocketHandlers(io: Server): void {
  io.on('connection', (socket: Socket) => {
    console.log('Client connected');

    // Add a flag to track if the client is in historical view mode
    let isInHistoricalView = false;
    
    // Handle historical data requests
    socket.on('fetch_historical_data', async (params: { deviceId: string, date: string }, callback) => {
      try {
        // Set the historical view flag
        isInHistoricalView = true;
        
        // Validate parameters
        if (!params.date) {
          callback({ success: false, error: 'Missing date parameter' });
          return;
        }
        
        console.log(`Received historical data request for deviceId: "${params.deviceId}", date: "${params.date}"`);
        
        // Parse the date
        const requestedDate = new Date(params.date);
        requestedDate.setHours(0, 0, 0, 0);
        
        const nextDay = new Date(requestedDate);
        nextDay.setDate(nextDay.getDate() + 1);
        
        // Connect to MongoDB
        const db = await connectToMongo();
        const eGaugeCollection = db.collection('eGauge');
        
        // Build query based on parameters
        const query: any = {
          timestamp: {
            $gte: requestedDate,
            $lt: nextDay
          }
        };
        
        // Add device filter if provided
        if (params.deviceId) {
          // Get device mappings to convert friendly name to actual device ID
          const deviceMappings = getDeviceMappings();
          
          // Find the actual device ID by matching the friendly name
          let actualDeviceId = params.deviceId; // Default to the provided ID
          
          for (const [deviceId, deviceInfo] of Object.entries(deviceMappings)) {
            if (deviceInfo.name === params.deviceId) {
              actualDeviceId = deviceId;
              console.log(`Converted friendly name "${params.deviceId}" to actual device ID: "${actualDeviceId}"`);
              break;
            }
          }
          
          // If no conversion found, check if the provided ID is already an actual device ID
          if (actualDeviceId === params.deviceId && !deviceMappings[params.deviceId]) {
            console.log(`No device mapping found for "${params.deviceId}". Checking if it's an actual device ID...`);
            // Check if this deviceId exists in the database
            const deviceExists = await eGaugeCollection.findOne({ device: params.deviceId });
            if (!deviceExists) {
              console.log(`Device "${params.deviceId}" not found in database`);
              callback({ success: false, error: `Device "${params.deviceId}" not found` });
              return;
            }
          }
          
          query.device = actualDeviceId;
          console.log(`Querying for device: "${actualDeviceId}"`);
        }
        
        console.log('Query:', JSON.stringify(query, null, 2));
        
        // Query for the specific device and date with optimization
        // Add limit and use lean query (only fetch needed fields if possible)
        const historicalData = await eGaugeCollection
          .find(query)
          .sort({ timestamp: 1 }) // Sort by timestamp ascending for chronological order
          .limit(10000) // Prevent fetching too much data at once
          .toArray();
        
        console.log(`Found ${historicalData.length} historical records`);
        
        // Enrich the data with device names
        const deviceMappings = getDeviceMappings();
        const enrichedData = historicalData.map(doc => {
          const deviceInfo = deviceMappings[doc.device] || { name: 'Unknown', owner: 'Unknown' };
          return {
            ...doc,
            deviceName: deviceInfo.name,
            ownerName: deviceInfo.owner
          };
        });
        
        // Acknowledge the request
        callback({ success: true });
        
        // Send the data
        socket.emit('historical_data_response', enrichedData);
        
        console.log(`Sent ${enrichedData.length} historical records for ${params.deviceId ? `device ${params.deviceId}` : 'all devices'} on ${params.date}`);
      } catch (error) {
        console.error('Error fetching historical data:', error);
        callback({ success: false, error: 'Server error fetching historical data' });
      }
    });
    
    // Add a handler for switching back to live data mode
    socket.on('switch_to_live_data', () => {
      isInHistoricalView = false;
      console.log('Client switched to live data mode');
    });
    
    // Store the historical view state in socket data for access in watchMongoChanges
    socket.data.isInHistoricalView = () => isInHistoricalView;
    socket.data.setHistoricalView = (value: boolean) => { isInHistoricalView = value; };
    
    // In the fetch_initial_data handler, modify the enrichment code:
    socket.on('fetch_initial_data', async (params) => {
      try {
        const { startDate } = params;
        const db = await connectToMongo();
        const eGaugeCollection = db.collection('eGauge');
        
        // Parse the start date
        const queryStartDate = new Date(startDate);
        
        // Query for documents from today - optimized
        // Note: hint removed temporarily - will auto-use index if it exists
        const todayDocs = await eGaugeCollection
          .find({ timestamp: { $gte: queryStartDate } })
          .sort({ timestamp: -1 })  // Sort by timestamp descending
          .limit(100)  // Limit to 100 most recent documents
          .toArray();
        
        if (todayDocs.length > 0) {
          // Use device mappings
          const deviceMappings = getDeviceMappings();
          
          // Enrich documents with device names
          const enrichedDocs = todayDocs
          .map(doc => {
            // Skip documents with invalid structure
            if (!doc.L1 || !doc.L2 || !doc.L3 || doc.L1_frequency === undefined || doc.measure_cons === undefined) {
              console.log(`Skipping document with invalid structure: ${doc._id}`);
              return null;
            }
            
            const deviceInfo = deviceMappings[doc.device] || { name: 'Unknown', owner: 'Unknown' };
            return {
              ...doc,
              deviceName: deviceInfo.name,
              ownerName: deviceInfo.owner
            };
          })
          .filter(doc => doc !== null); // Remove null entries
          
          // Send the initial data to the client
          socket.emit('initial_data', enrichedDocs);
          console.log(`Sent ${enrichedDocs.length} initial documents to client (filtered out ${todayDocs.length - enrichedDocs.length} invalid documents)`);
        } else {
          console.log('No documents found for today');
          socket.emit('initial_data', []);
        }
      } catch (error) {
        console.error('Error fetching initial data:', error);
        socket.emit('initial_data', []);
      }
    });
    
    socket.on('disconnect', () => {
      console.log('Client disconnected');
    });

    // Client-specific preferences for simulation updates
    socket.on('toggle_simulation_updates', (isPaused: boolean) => {
      socket.data.pauseSimulationUpdates = isPaused;
      console.log(`Client ${socket.id} ${isPaused ? 'paused' : 'resumed'} simulation updates`);
    });
  });
} 