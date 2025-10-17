import { httpServer, io } from './app';
import { connectToMongo } from './services/databaseService';
import { watchMongoChanges } from './services/dataMonitorService';
import { startDeviceDataUpdates, loadDeviceMappings } from './services/deviceDataService';
import emailService from './services/emailService';

// Set up server port
const PORT = process.env.PORT || 5001;

// Start server
async function startServer() {
  try {
    // Connect to database
    await connectToMongo();
    
    // Load device mappings BEFORE starting the server
    console.log('Loading device mappings from producer collection...');
    await loadDeviceMappings();
    
    // Test email configuration
    console.log('Testing email configuration...');
    await emailService.testEmailConfig();
    
    // Start listening for connections
    httpServer.listen(PORT, async () => {
      console.log(`Server running on port ${PORT}`);
      console.log('Available authentication endpoints:');
      console.log('  POST /api/auth/register - Start registration with email verification');
      console.log('  POST /api/auth/verify-email - Verify email with code');
      console.log('  POST /api/auth/resend-code - Resend verification code');
      console.log('  POST /api/auth/login - Login (requires verified email)');
      
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