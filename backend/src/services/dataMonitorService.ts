import { Server } from 'socket.io';
import { connectToMongo, getMongoClient, getCachedCollection } from './databaseService';
import { ObjectId } from 'mongodb';
import { setDeviceMappings } from './deviceDataService';

/**
 * Watch MongoDB for changes and broadcast to connected clients
 * @param io Socket.IO server instance
 */
export async function watchMongoChanges(io: Server): Promise<void> {
  // Initialize connection
  await connectToMongo();
  
  // Use cached collections for better performance
  const eGaugeCollection = getCachedCollection('enerspectrumSamples', 'eGauge');
  const producersCollection = getCachedCollection('enerspectrumMetadata', 'producers');
    
  // Initial load of device mappings - specifically targeting the producer with ID "672357cdcb0b0c7c0f7eb6b4"
  const deviceMappings: Record<string, { name: string; owner: string }> = {};
  
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
      
      // Set the device mappings in the deviceDataService
      setDeviceMappings(deviceMappings);
    } else {
      console.log('Specific producer not found or has no devices');
    }
  } catch (error) {
    console.error('Error loading device mappings:', error);
  }
  
  let lastUpdate = new Date();
  let lastSentDocIds = new Set<string>(); // Track recently sent document IDs

  // Set up polling interval to check for new documents
  setInterval(async () => {
    try {
      // Query for documents newer than last update - optimized
      // Note: hint removed temporarily - will auto-use index if it exists
      const newDocs = await eGaugeCollection
        .find({ timestamp: { $gt: lastUpdate } })
        .sort({ timestamp: 1 })  // Sort ascending to get oldest first
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
  }, 5000); // Poll every 30 seconds

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
      
      // Update device mappings
      setDeviceMappings(newMappings);
      console.log(`Refreshed ${Object.keys(newMappings).length} device mappings for producer 672357cdcb0b0c7c0f7eb6b4`);
    } catch (error) {
      console.error('Error refreshing device mappings:', error);
    }
  }, 3600000); // Refresh every hour
} 