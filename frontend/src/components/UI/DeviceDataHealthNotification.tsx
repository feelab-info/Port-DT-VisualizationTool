'use client';

import React, { useEffect, useState } from 'react';
import { DeviceDataHealthStatus } from '@/services/DeviceDataHealthMonitor';
import deviceDataHealthMonitor from '@/services/DeviceDataHealthMonitor';

interface DeviceDataHealthNotificationProps {
  className?: string;
}

export default function DeviceDataHealthNotification({ 
  className = '' 
}: DeviceDataHealthNotificationProps) {
  const [healthStatus, setHealthStatus] = useState<DeviceDataHealthStatus | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const handleHealthDegraded = (status: DeviceDataHealthStatus) => {
      setHealthStatus(status);
      // Only show notification if it hasn't been dismissed
      if (!isDismissed) {
        setIsVisible(true);
      }
    };

    const handleHealthImproved = (status: DeviceDataHealthStatus) => {
      setHealthStatus(status);
      // Hide notification after a delay when health improves
      setTimeout(() => {
        setIsVisible(false);
        setIsDismissed(false); // Reset dismissed state when health improves
      }, 3000);
    };

    const handleDataReceived = () => {
      setHealthStatus(deviceDataHealthMonitor.getHealthStatus());
      setIsVisible(false);
      setIsDismissed(false); // Reset dismissed state when data is received
    };

    // Get initial status
    setHealthStatus(deviceDataHealthMonitor.getHealthStatus());

    // Subscribe to health events
    deviceDataHealthMonitor.on('device-health-degraded', handleHealthDegraded);
    deviceDataHealthMonitor.on('device-health-improved', handleHealthImproved);
    deviceDataHealthMonitor.on('device-data-received', handleDataReceived);

    // Start monitoring
    deviceDataHealthMonitor.startMonitoring();

    return () => {
      deviceDataHealthMonitor.removeListener('device-health-degraded', handleHealthDegraded);
      deviceDataHealthMonitor.removeListener('device-health-improved', handleHealthImproved);
      deviceDataHealthMonitor.removeListener('device-data-received', handleDataReceived);
      deviceDataHealthMonitor.stopMonitoring();
    };
  }, [isDismissed]);

  if (!isVisible || !healthStatus || healthStatus.isHealthy) {
    return null;
  }

  const getSeverityColor = (): string => {
    if (healthStatus.consecutiveFailures >= 4) {
      return 'bg-red-500 border-red-600 text-white';
    } else if (healthStatus.consecutiveFailures >= 2) {
      return 'bg-orange-500 border-orange-600 text-white';
    } else {
      return 'bg-yellow-500 border-yellow-600 text-yellow-900';
    }
  };

  const getSeverityIcon = (): string => {
    if (healthStatus.consecutiveFailures >= 4) {
      return '🔴';
    } else if (healthStatus.consecutiveFailures >= 2) {
      return '🟠';
    } else {
      return '🟡';
    }
  };

  const getUserFriendlyMessage = (): string => {
    if (healthStatus.consecutiveFailures >= 4) {
      return 'Data flow from devices was interrupted. Digital twin is now in historical mode.';
    } else if (healthStatus.consecutiveFailures >= 2) {
      return 'Data flow from devices is experiencing delays. Digital twin is now in historical mode.';
    } else {
      return 'Data flow from devices was interrupted. Digital twin is now in historical mode.';
    }
  };

  return (
    <div className={`fixed top-4 right-4 z-50 max-w-md ${className}`}>
      <div className={`rounded-lg border shadow-lg p-4 ${getSeverityColor()}`}>
        <div className="flex items-start">
          <div className="flex-shrink-0 mr-3">
            <span className="text-xl">{getSeverityIcon()}</span>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold mb-1">
              Connection Issue
            </h3>
            <p className="text-sm mb-2">
              {getUserFriendlyMessage()}
            </p>
            
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => {
                  setIsDismissed(true);
                  setIsVisible(false);
                }}
                className="text-xs px-2 py-1 rounded border border-current hover:bg-black hover:bg-opacity-10 transition-colors"
              >
                Dismiss
              </button>
              <button
                onClick={() => {
                  window.location.reload();
                }}
                className="text-xs px-2 py-1 rounded border border-current hover:bg-black hover:bg-opacity-10 transition-colors"
              >
                Refresh Page
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 