# Device Data Health Monitoring System

This system provides comprehensive fault protection for the frontend when device data stops flowing from the database.

## Data Flow Overview

1. **Backend**: `dataMonitorService.ts` polls MongoDB every 30 seconds for device data
2. **Frontend**: `EnergyDataService.tsx` receives data via Socket.IO
3. **Display**: Data is shown in real-time components and maps

## Components

### DeviceDataHealthMonitor Service
- **Location**: `frontend/src/services/DeviceDataHealthMonitor.ts`
- **Purpose**: Monitors device data flow health by tracking data timestamps and device counts
- **Features**:
  - Health checks every 15 seconds
  - Tracks consecutive failures
  - Monitors device count and update frequency
  - Emits events for health status changes

### DeviceDataHealthNotification Component
- **Location**: `frontend/src/components/UI/DeviceDataHealthNotification.tsx`
- **Purpose**: Displays notifications when device data flow issues are detected
- **Features**:
  - Color-coded severity levels (🟡🟠🔴)
  - Detailed information about the issue
  - Dismiss and refresh options
  - Auto-hide when health improves

### DeviceDataHealthStatus Component
- **Location**: `frontend/src/components/UI/DeviceDataHealthStatus.tsx`
- **Purpose**: Displays detailed device data health status for debugging
- **Features**:
  - Real-time health status display
  - Detailed metrics about device data flow
  - Color-coded status indicators

### useDeviceDataHealth Hook
- **Location**: `frontend/src/hooks/useDeviceDataHealth.ts`
- **Purpose**: React hook for easy integration of device data health monitoring
- **Features**:
  - Automatic health monitoring
  - Health status state management
  - Reset and update functions

## Configuration

The system is configured with these default settings:
- **Expected data interval**: 45 seconds (slightly more than the 30s polling interval)
- **Max consecutive failures**: 2
- **Health check interval**: 15 seconds

## Integration

The system is automatically integrated into:
1. **DashboardLayout**: Global notification component
2. **EnergyDataService**: Updates timestamps on data reception
3. **DataReceiver**: Updates timestamps on map data updates
4. **Real-time page**: Debug status display

## Usage

### Basic Usage
```typescript
import { useDeviceDataHealth } from '@/hooks/useDeviceDataHealth';

function MyComponent() {
  const { healthStatus, isHealthy } = useDeviceDataHealth();
  
  return (
    <div>
      {!isHealthy && <p>Device data flow issues detected!</p>}
    </div>
  );
}
```

### Manual Integration
```typescript
import deviceDataHealthMonitor from '@/services/DeviceDataHealthMonitor';

// Update timestamp when device data is received
deviceDataHealthMonitor.updateDataTimestamp(deviceCount, timestamp);

// Get current health status
const status = deviceDataHealthMonitor.getHealthStatus();

// Reset health monitor
deviceDataHealthMonitor.reset();
```

## Events

The DeviceDataHealthMonitor emits these events:
- `device-health-degraded`: When device data flow issues are detected
- `device-health-improved`: When health status improves
- `device-data-received`: When new device data is received
- `device-health-reset`: When the monitor is reset

## Severity Levels

- **🟢 Healthy**: No issues detected
- **🟡 Warning**: 1 consecutive failure
- **🟠 Alert**: 2-3 consecutive failures
- **🔴 Critical**: 4+ consecutive failures

## Data Sources Monitored

The system monitors data flow from:
- MongoDB device data collection
- Socket.IO real-time updates
- Device energy consumption data
- Background data updates

## Troubleshooting

1. **No notifications appearing**: Check if the backend is running and MongoDB has data
2. **False positives**: Adjust the `expectedDataInterval` in the configuration
3. **Too many notifications**: Increase the `maxConsecutiveFailures` threshold
4. **Missing device data**: Check the backend logs for MongoDB connection issues

## Backend Integration

The system works with the existing backend infrastructure:
- `dataMonitorService.ts` polls MongoDB every 30 seconds
- Socket.IO broadcasts updates to connected clients
- Device mappings are loaded from the metadata database
- Invalid data points are filtered out automatically

## Performance Considerations

- Health checks run every 15 seconds to minimize overhead
- Device count is tracked efficiently using Set operations
- Timestamps are stored as numbers for fast comparison
- Event listeners are properly cleaned up to prevent memory leaks 