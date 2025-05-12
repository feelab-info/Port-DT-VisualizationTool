import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { MongoClient, Db, ObjectId } from 'mongodb'; // Add ObjectId import
import axios from 'axios';
import { io as ioClient } from 'socket.io-client';


dotenv.config();

// MongoDB connection
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/your_database';
const client = new MongoClient(mongoUri);


async function connectToMongo(): Promise<Db> {
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    return client.db('enerspectrumSamples');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}


const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

// DC Power Flow Simulation API proxy
const DC_POWER_FLOW_API = process.env.DC_POWER_FLOW_API || 'http://localhost:5002';

// Forward the latest results request to the DC Power Flow API
app.get('/api/simulation/latest-results', async (req, res) => {
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
});

// Add a route to get sizing results
app.get('/api/simulation/sizing-results', async (req, res) => {
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
});

// Start the simulation service
app.post('/api/simulation/start-service', async (req, res) => {
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
});

// Stop the simulation service - Deprecated: Keep for compatibility but clients should use pause locally
app.post('/api/simulation/stop-service', async (req, res) => {
  console.warn('DEPRECATED: Client used /api/simulation/stop-service which affects all users. Clients should pause locally.');
  try {
    // Return success but don't actually stop the simulation
    res.json({ 
      status: 'Simulation updates paused for your client only',
      note: 'For a better experience, update your client to use local pausing instead of stopping the simulation service.'
    });
  } catch (error: any) {
    console.error('Error handling deprecated stop request:', error);
    res.status(500).json({ 
      error: 'Failed to process request',
      details: error.message
    });
  }
});

// Forward Socket.IO events from DC Power Flow API to clients
const dcPowerFlowSocket = ioClient(DC_POWER_FLOW_API);
dcPowerFlowSocket.on('simulation_update', (data) => {
  // Forward the update to all connected clients
  io.emit('simulation_update', data);
  console.log('Forwarded simulation update to clients');
});

dcPowerFlowSocket.on('simulation_stopped', (data) => {
  // Forward simulation stopped event to all clients
  io.emit('simulation_stopped', data);
  console.log('Forwarded simulation stopped event to clients');
});

// Add a route for admins to stop the simulation service (not exposed in regular UI)
app.post('/api/admin/simulation/stop-service', async (req, res) => {
  try {
    // Add basic auth check here in a real application
    // if (!isAuthorizedAdmin(req)) return res.status(403).json({ error: 'Unauthorized' });
    
    const response = await axios.post(`${DC_POWER_FLOW_API}/stop-simulation-service`);
    res.json(response.data);
    console.log('Admin stopped simulation service');
  } catch (error: any) {
    console.error('Error stopping simulation service:', error);
    res.status(500).json({ 
      error: 'Failed to stop simulation service',
      details: error.message
    });
  }
});

// Add a route for admins to restart the simulation service
app.post('/api/admin/simulation/restart-service', async (req, res) => {
  try {
    // Add basic auth check here in a real application
    // if (!isAuthorizedAdmin(req)) return res.status(403).json({ error: 'Unauthorized' });
    
    // First stop the service
    await axios.post(`${DC_POWER_FLOW_API}/stop-simulation-service`);
    
    // Wait a moment for it to stop completely
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Then start it again
    const response = await axios.post(`${DC_POWER_FLOW_API}/start-simulation-service`);
    res.json(response.data);
    console.log('Admin restarted simulation service');
  } catch (error: any) {
    console.error('Error restarting simulation service:', error);
    res.status(500).json({ 
      error: 'Failed to restart simulation service',
      details: error.message
    });
  }
});

// Basic health check route
app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

let deviceMappings: Record<string, { name: string; owner: string }> = {};

// Socket.IO connection handling
io.on('connection', (socket) => {
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
        query.device = params.deviceId;
      }
      
      // Query for the specific device and date
      const historicalData = await eGaugeCollection.find(query).toArray();
      
      // Enrich the data with device names
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
      const clientMongo = await connectToMongo();
      const eGaugeCollection = clientMongo.collection('eGauge');
      const producersCollection = client.db('enerspectrumMetadata').collection('producers');
      
      // Parse the start date
      const queryStartDate = new Date(startDate);
      
      // Query for documents from today
      const todayDocs = await eGaugeCollection
        .find({ timestamp: { $gte: queryStartDate } })
        .sort({ timestamp: -1 })  // Sort by timestamp descending
        .limit(100)  // Limit to 100 most recent documents
        .toArray();
      
      if (todayDocs.length > 0) {
        // Load device mappings if needed
        
        try {
          const producer = await producersCollection.findOne({ _id: new ObjectId("672357cdcb0b0c7c0f7eb6b4") });
          
          if (producer && producer.devices && Array.isArray(producer.devices)) {
            producer.devices.forEach((device: any) => {
              deviceMappings[device.deviceId] = {
                name: device.name || 'Unnamed Device',
                owner: producer.username || producer.name || 'Unknown Owner'
              };
            });
          }
        } catch (error) {
          console.error('Error loading device mappings for initial data:', error);
        }
        
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
        console.log(`Sent ${enrichedDocs.length} initial documents to client (filtered out ${todayDocs.length - enrichedDocs.length} invalid documents)`);      } else {
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

async function watchMongoChanges(io: Server) {
  const clientMongo = await connectToMongo();
  const eGaugeCollection = clientMongo.collection('eGauge');
  const producersCollection = client.db('enerspectrumMetadata').collection('producers');
    
  // Initial load of device mappings - specifically targeting the producer with ID "672357cdcb0b0c7c0f7eb6b4"
  try {
    // Find the specific producer by ID - convert string to ObjectId
    const producer = await producersCollection.findOne({ _id: new ObjectId("672357cdcb0b0c7c0f7eb6b4") });
    
    if (producer && producer.devices && Array.isArray(producer.devices)) {
      producer.devices.forEach((device: any) => {
        deviceMappings[device.deviceId] = {
          name: device.name || 'Unnamed Device',
          owner: producer.username || producer.name || 'Unknown Owner'
        };
      });
      console.log(`Loaded ${Object.keys(deviceMappings).length} device mappings for producer 672357cdcb0b0c7c0f7eb6b4`);
      console.log('Sample mapping:', Object.entries(deviceMappings)[0]);
    } else {
      console.log('Specific producer not found or has no devices');
    }
  } catch (error) {
    console.error('Error loading device mappings:', error);
  }
  
  let lastUpdate = new Date();
  let lastSentDocIds = new Set<string>(); // Track recently sent document IDs

  setInterval(async () => {
    try {
      // Query for documents newer than last update
      const newDocs = await eGaugeCollection
        .find({ timestamp: { $gt: lastUpdate } })
        .limit(33)  // Limit to 33 documents per update
        .toArray();

      if (newDocs.length > 0) {
        lastUpdate = new Date();
        
        // Filter out documents we've already sent recently
        const uniqueDocs = newDocs.filter(doc => {
          const docId = doc._id.toString();
          if (lastSentDocIds.has(docId)) {
            return false;
          }
          
          // Add to tracking set
          lastSentDocIds.add(docId);
          return true;
        });
        
        // Limit the size of our tracking set to avoid memory issues
        if (lastSentDocIds.size > 1000) {
          // Convert to array, remove oldest entries, convert back to set
          const idsArray = Array.from(lastSentDocIds);
          lastSentDocIds = new Set(idsArray.slice(-500));
        }
        
        if (uniqueDocs.length > 0) {
          // Enrich documents with device names and validate data structure
          const enrichedDocs = uniqueDocs
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
          
          if (enrichedDocs.length > 0) {
            // Send updates to all clients
            // For clients in historical view, send as 'background_update'
            // For clients not in historical view, send as 'db_update'
            io.sockets.sockets.forEach((socket) => {
              const isHistorical = socket.data.isInHistoricalView && socket.data.isInHistoricalView();
              
              if (isHistorical) {
                // Send as background update that won't replace historical view
                socket.emit('background_update', enrichedDocs);
              } else {
                // Send as regular update
                socket.emit('db_update', enrichedDocs);
              }
            });
            
            // Only log the count, not all the details
            if (enrichedDocs.length < 50) {
              console.log(`Sent update to clients: ${enrichedDocs.length} documents (filtered out ${uniqueDocs.length - enrichedDocs.length} invalid documents)`);
            } else {
              console.log(`Sent large update to clients: ${enrichedDocs.length} documents (filtered out ${uniqueDocs.length - enrichedDocs.length} invalid documents)`);
            }
          }
        }
      }
    } catch (error) {
      console.error('Polling error:', error);
    }
  }, 30000); // Poll every 30 seconds

  // Refresh device mappings periodically (every hour)
  setInterval(async () => {
    try {
      // Also update this part to use ObjectId
      const producer = await producersCollection.findOne({ _id: new ObjectId("672357cdcb0b0c7c0f7eb6b4") });
      const newMappings: Record<string, { name: string; owner: string }> = {};
      
      if (producer && producer.devices && Array.isArray(producer.devices)) {
        producer.devices.forEach((device: any) => {
          newMappings[device.deviceId] = {
            name: device.name || 'Unnamed Device',
            owner: producer.username || producer.name || 'Unknown Owner'
          };
        });
      }
      
      deviceMappings = newMappings;
      console.log(`Refreshed ${Object.keys(deviceMappings).length} device mappings for producer 672357cdcb0b0c7c0f7eb6b4`);
    } catch (error) {
      console.error('Error refreshing device mappings:', error);
    }
  }, 3600000); // Refresh every hour
}

// Update your server initialization
const PORT = process.env.PORT || 5001;
httpServer.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  await watchMongoChanges(io);
});


// Add this route to your Express app (after your existing routes)
app.post('/api/simulation', async (req, res) => {
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
});

// Add this route to get simulation results
app.get('/api/simulation/:scenarioId', async (req, res) => {
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
});

app.post('/api/vessel/registered', async (req, res) => {
  try {
    const vesselApiUrl = process.env.VESSEL_API_URL || 'http://localhost:5003/api/registered-vessel';
    const response = await axios.post(vesselApiUrl, req.body);
    res.json(response.data);
  } catch (error) {
    console.error('Vessel modeling error:', error);
    res.status(500).json({ 
      error: 'Failed to process registered vessel',
      details: (error as any).response?.data || (error as Error).message 
    });
  }
});

app.post('/api/vessel/custom', async (req, res) => {
  try {
    const vesselApiUrl = process.env.VESSEL_API_URL || 'http://localhost:5003/api/custom-vessel';
    const response = await axios.post(vesselApiUrl, req.body);
    res.json(response.data);
  } catch (error) {
    console.error('Vessel modeling error:', error);
    res.status(500).json({ 
      error: 'Failed to process custom vessel',
      details: (error as any).response?.data || (error as Error).message 
    });
  }
});

app.get('/api/vessel/available', async (req, res) => {
  try {
    const vesselApiUrl = process.env.VESSEL_API_URL || 'http://localhost:5003/api/available-vessels';
    const response = await axios.get(vesselApiUrl);
    res.json(response.data);
  } catch (error) {
    console.error('Vessel modeling error:', error);
    res.status(500).json({ 
      error: 'Failed to get available vessels',
      details: (error as any).response?.data || (error as Error).message 
    });
  }
});

// Add these vessel simulation endpoints
app.get('/api/vessel/simulations', async (req, res) => {
  try {
    const date = req.query.date as string;
    let vesselApiUrl = process.env.VESSEL_API_URL || 'http://localhost:5003/api/simulations';
    
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
});

app.get('/api/vessel/simulations/:date', async (req, res) => {
  try {
    const { date } = req.params;
    const vesselApiUrl = process.env.VESSEL_API_URL || `http://localhost:5003/api/simulations/${date}`;
    
    const response = await axios.get(vesselApiUrl);
    res.json(response.data);
  } catch (error) {
    console.error(`Error fetching vessel simulations for date ${req.params.date}:`, error);
    res.status((error as any).response?.status || 500).json({ 
      error: 'Failed to fetch vessel simulations for date',
      details: (error as any).response?.data || (error as Error).message 
    });
  }
});

app.get('/api/vessel/current-simulations', async (req, res) => {
  try {
    const vesselApiUrl = process.env.VESSEL_API_URL || 'http://localhost:5003/api/current-simulations';
    
    const response = await axios.get(vesselApiUrl);
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching current vessel simulations:', error);
    res.status((error as any).response?.status || 500).json({ 
      error: 'Failed to fetch current vessel simulations',
      details: (error as any).response?.data || (error as Error).message 
    });
  }
});

// Add a route to get timesteps load flow results
app.get('/api/simulation/timesteps-results', async (req, res) => {
  try {
    // Explicitly use the full URL to avoid path confusion
    const fullUrl = 'http://localhost:5002/get-timesteps-results';
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
});



