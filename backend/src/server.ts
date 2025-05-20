import { httpServer, io } from './app';
import { connectToMongo } from './services/databaseService';
import { watchMongoChanges } from './services/dataMonitorService';
import { startDeviceDataUpdates } from './services/deviceDataService';

// Set up server port
const PORT = process.env.PORT || 5001;

// Start server
async function startServer() {
  try {
    // Connect to database
    await connectToMongo();
    
    // Start listening for connections
    httpServer.listen(PORT, async () => {
      console.log(`Server running on port ${PORT}`);
      
      // Start monitoring data changes
      await watchMongoChanges(io);
      
      // Start the device data updates for DC power flow
      startDeviceDataUpdates();
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// Start the server
startServer(); 