import { Server, Socket } from 'socket.io';
import { connectToMongo } from './databaseService';
import { ObjectId } from 'mongodb';
import { getDeviceMappings, findDeviceIdByName } from './deviceDataService';

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
    socket.on('fetch_historical_data', async (params: { deviceId: string, date: string, endDate?: string }, callback) => {
      try {
        // Set the historical view flag
        isInHistoricalView = true;
        
        // Validate parameters
        if (!params.date) {
          callback({ success: false, error: 'Missing date parameter' });
          return;
        }
        
        console.log(`Received historical data request for deviceId: "${params.deviceId}", date: "${params.date}", endDate: "${params.endDate || 'N/A'}"`);
        
        // Parse the start date
        const requestedDate = new Date(params.date);
        requestedDate.setHours(0, 0, 0, 0);
        
        // Parse the end date (if provided, otherwise use next day)
        let endDate: Date;
        if (params.endDate) {
          endDate = new Date(params.endDate);
          endDate.setHours(23, 59, 59, 999);
        } else {
          endDate = new Date(requestedDate);
          endDate.setDate(endDate.getDate() + 1);
        }
        
        // Connect to MongoDB
        const db = await connectToMongo();
        const eGaugeCollection = db.collection('eGauge');
        
        // Build query based on parameters
        const query: any = {
          timestamp: {
            $gte: requestedDate,
            $lte: endDate
          }
        };
        
        // Add device filter if provided
        if (params.deviceId) {
          // The frontend should ALWAYS send the database device ID (hash)
          // We should NOT attempt to convert it from a friendly name
          const deviceMappings = getDeviceMappings();
          let actualDeviceId = params.deviceId;
          
          // Verify this device ID exists in our mappings
          if (deviceMappings[params.deviceId]) {
            // It's a valid database device ID from our mappings
            actualDeviceId = params.deviceId;
            const deviceName = deviceMappings[params.deviceId].name;
            console.log(`Querying for device ID: "${actualDeviceId}" (Name: "${deviceName}")`);
          } else {
            // Not in mappings - check if it exists in database directly
            console.log(`Device ID "${params.deviceId}" not found in producer mappings, checking database...`);
            const deviceExists = await eGaugeCollection.findOne({ device: params.deviceId });
            if (!deviceExists) {
              console.log(`Device "${params.deviceId}" not found in database or mappings`);
              callback({ success: false, error: `Device "${params.deviceId}" not found` });
              return;
            }
            actualDeviceId = params.deviceId;
            console.log(`Using device ID directly from database: "${actualDeviceId}"`);
          }
          
          query.device = actualDeviceId;
        }
        
        console.log('Query:', JSON.stringify(query, null, 2));
        
        // Query for the specific device and date with optimization
        // Calculate appropriate limit based on date range
        const daysDiff = Math.ceil((endDate.getTime() - requestedDate.getTime()) / (1000 * 60 * 60 * 24));
        const recordLimit = Math.max(100000, daysDiff * 50000); // At least 100k, scale with days
        
        console.log(`Date range: ${daysDiff} days, using limit: ${recordLimit}`);
        
        // Add limit and use lean query (only fetch needed fields if possible)
        const historicalData = await eGaugeCollection
          .find(query)
          .sort({ timestamp: 1 }) // Sort by timestamp ascending for chronological order
          .limit(recordLimit)
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
        
        const dateRangeText = params.endDate 
          ? `from ${params.date} to ${params.endDate}` 
          : `on ${params.date}`;
        console.log(`Sent ${enrichedData.length} historical records for ${params.deviceId ? `device ${params.deviceId}` : 'all devices'} ${dateRangeText}`);
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
        // Default limit optimized for fast initial load (15-30 minutes)
        // Additional data will be fetched on-demand when user selects longer periods
        const todayDocs = await eGaugeCollection
          .find({ timestamp: { $gte: queryStartDate } })
          .sort({ timestamp: -1 })  // Sort by timestamp descending
          .limit(1000)  // Fast initial load: ~15-30 minutes of data with 33 devices
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