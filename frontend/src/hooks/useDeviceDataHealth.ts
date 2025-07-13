import { useState, useEffect } from 'react';
import { DeviceDataHealthStatus } from '@/services/DeviceDataHealthMonitor';
import deviceDataHealthMonitor from '@/services/DeviceDataHealthMonitor';

export function useDeviceDataHealth() {
  const [healthStatus, setHealthStatus] = useState<DeviceDataHealthStatus | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);

  useEffect(() => {
    const handleHealthDegraded = (status: DeviceDataHealthStatus) => {
      setHealthStatus(status);
    };

    const handleHealthImproved = (status: DeviceDataHealthStatus) => {
      setHealthStatus(status);
    };

    const handleDataReceived = () => {
      setHealthStatus(deviceDataHealthMonitor.getHealthStatus());
    };

    const handleHealthReset = () => {
      setHealthStatus(deviceDataHealthMonitor.getHealthStatus());
    };

    // Get initial status
    setHealthStatus(deviceDataHealthMonitor.getHealthStatus());

    // Subscribe to health events
    deviceDataHealthMonitor.on('device-health-degraded', handleHealthDegraded);
    deviceDataHealthMonitor.on('device-health-improved', handleHealthImproved);
    deviceDataHealthMonitor.on('device-data-received', handleDataReceived);
    deviceDataHealthMonitor.on('device-health-reset', handleHealthReset);

    // Start monitoring if not already started
    if (!isMonitoring) {
      deviceDataHealthMonitor.startMonitoring();
      setIsMonitoring(true);
    }

    return () => {
      deviceDataHealthMonitor.removeListener('device-health-degraded', handleHealthDegraded);
      deviceDataHealthMonitor.removeListener('device-health-improved', handleHealthImproved);
      deviceDataHealthMonitor.removeListener('device-data-received', handleDataReceived);
      deviceDataHealthMonitor.removeListener('device-health-reset', handleHealthReset);
    };
  }, [isMonitoring]);

  const resetHealth = () => {
    deviceDataHealthMonitor.reset();
  };

  const updateDataTimestamp = (deviceCount?: number, deviceUpdate?: string) => {
    deviceDataHealthMonitor.updateDataTimestamp(deviceCount, deviceUpdate);
  };

  return {
    healthStatus,
    isHealthy: healthStatus?.isHealthy ?? true,
    resetHealth,
    updateDataTimestamp
  };
} 