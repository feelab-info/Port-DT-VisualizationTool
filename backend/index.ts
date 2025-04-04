import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { MongoClient, Db, ObjectId } from 'mongodb'; // Add ObjectId import

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
io.on('connection', (socket) => {
  console.log('Client connected');
  
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
          // Enrich documents with device names
          const enrichedDocs = uniqueDocs.map(doc => {
            // Use device field as deviceId for lookup
            const deviceInfo = deviceMappings[doc.device] || { name: 'Unknown', owner: 'Unknown' };
            return {
              ...doc,
              deviceName: deviceInfo.name,
              ownerName: deviceInfo.owner
            };
          });
          
          io.emit('db_update', enrichedDocs);
          
          // Only log the count, not all the details
          if (enrichedDocs.length < 50) {
            console.log(`Sent update to clients: ${enrichedDocs.length} documents`);
          } else {
            console.log(`Sent large update to clients: ${enrichedDocs.length} documents (limited logging)`);
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