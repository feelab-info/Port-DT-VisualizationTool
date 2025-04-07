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

// Basic health check route
app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

// Socket.IO connection handling
// Add this to your existing socket.io setup
io.on('connection', (socket) => {
  console.log('Client connected');
  
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
        let deviceMappings: Record<string, { name: string; owner: string }> = {};
        
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
});

async function watchMongoChanges(io: Server) {
  const clientMongo = await connectToMongo();
  const eGaugeCollection = clientMongo.collection('eGauge');
  const producersCollection = client.db('enerspectrumMetadata').collection('producers');
  
  // Cache device mappings to avoid repeated lookups
  let deviceMappings: Record<string, { name: string; owner: string }> = {};
  
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
            io.emit('db_update', enrichedDocs);
            
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
    const flaskApiUrl = process.env.FLASK_API_URL || 'http://localhost:5002/run-simulation';
    const response = await axios.post(flaskApiUrl, req.body);
    res.json(response.data);
  } catch (error) {
    console.error('Simulation error:', error);
    res.status(500).json({ 
      error: 'Failed to run simulation',
      details: (error as any).response?.data || (error as Error).message 
    });
  }
});

// Add this route to get simulation results
app.get('/api/simulation/:scenarioId', async (req, res) => {
  try {
    const { scenarioId } = req.params;
    const flaskApiUrl = process.env.FLASK_API_URL || `http://localhost:5002/get-results/${scenarioId}`;
    const response = await axios.get(flaskApiUrl);
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching simulation results:', error);
    res.status(((error as any).response?.status) || 500).json({
      error: 'Failed to fetch simulation results',
      details: (error as any).response?.data || (error as Error).message
    });
  }
});


// Connect to the Flask Socket.IO server
const flaskSocketUrl = process.env.FLASK_API_URL || 'http://localhost:5002';
const flaskSocket = ioClient(flaskSocketUrl);

// Listen for simulation updates from Flask
flaskSocket.on('simulation_update', (data) => {
  // Relay the simulation update to all connected clients
  io.emit('simulation_update', data);
  console.log('Relayed simulation update to clients');
});

// Add this route to start the simulation service
app.post('/api/simulation/start-service', async (req, res) => {
  try {
    const flaskApiUrl = process.env.FLASK_API_URL || 'http://localhost:5002/start-simulation-service';
    const response = await axios.post(flaskApiUrl, {}, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    res.json(response.data);
  } catch (error) {
    console.error('Error starting simulation service:', error);
    res.status(500).json({ 
      error: 'Failed to start simulation service',
      details: (error as any).response?.data || (error as Error).message 
    });
  }
});

// Add this route to stop the simulation service
app.post('/api/simulation/stop-service', async (req, res) => {
  try {
    const flaskApiUrl = process.env.FLASK_API_URL || 'http://localhost:5002/stop-simulation-service';
    const response = await axios.post(flaskApiUrl, {}, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    res.json(response.data);
  } catch (error) {
    console.error('Error stopping simulation service:', error);
    res.status(500).json({ 
      error: 'Failed to stop simulation service',
      details: (error as any).response?.data || (error as Error).message 
    });
  }
});

// Add this route to get the latest simulation results
app.get('/api/simulation/latest-results', async (req, res) => {
  try {
    const flaskApiUrl = process.env.FLASK_API_URL || 'http://localhost:5002';
    const response = await axios.get(flaskApiUrl);
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching latest simulation results:', error);
    res.status((error as any).response?.status || 500).json({ 
      error: 'Failed to fetch latest simulation results',
      details: (error as any).response?.data || (error as Error).message 
    });
  }
});
