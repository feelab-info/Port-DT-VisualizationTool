'use client';

import React from 'react';
import { useDeviceDataHealth } from '@/hooks/useDeviceDataHealth';

interface DeviceDataHealthStatusProps {
  className?: string;
  showDetails?: boolean;
}

export default function DeviceDataHealthStatus({ 
  className = '', 
  showDetails = false 
}: DeviceDataHealthStatusProps) {
  const { healthStatus, isHealthy } = useDeviceDataHealth();

  if (!healthStatus) {
    return null;
  }

  const getStatusColor = () => {
    if (isHealthy) {
      return 'bg-green-100 border-green-400 text-green-700';
    } else if (healthStatus.consecutiveFailures >= 4) {
      return 'bg-red-100 border-red-400 text-red-700';
    } else if (healthStatus.consecutiveFailures >= 2) {
      return 'bg-orange-100 border-orange-400 text-orange-700';
    } else {
      return 'bg-yellow-100 border-yellow-400 text-yellow-700';
    }
  };

  const getStatusIcon = () => {
    if (isHealthy) {
      return '🟢';
    } else if (healthStatus.consecutiveFailures >= 4) {
      return '🔴';
    } else if (healthStatus.consecutiveFailures >= 2) {
      return '🟠';
    } else {
      return '🟡';
    }
  };

  const formatTimeSinceLastData = (milliseconds: number | null): string => {
    if (!milliseconds) return 'Never';
    
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ago`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s ago`;
    } else {
      return `${seconds}s ago`;
    }
  };

  return (
    <div className={`p-3 border rounded-lg ${getStatusColor()} ${className}`}>
      <div className="flex items-center">
        <span className="text-lg mr-2">{getStatusIcon()}</span>
        <div className="flex-1">
          <div className="font-medium">
            Device Data Health: {isHealthy ? 'Healthy' : 'Degraded'}
          </div>
          {!isHealthy && healthStatus.errorMessage && (
            <div className="text-sm mt-1">
              {healthStatus.errorMessage}
            </div>
          )}
          
          {showDetails && (
            <div className="text-xs mt-2 space-y-1 opacity-75">
              <div>
                <span className="font-medium">Last data:</span>{' '}
                {healthStatus.lastDataTimestamp 
                  ? new Date(healthStatus.lastDataTimestamp).toLocaleTimeString()
                  : 'Never'
                }
              </div>
              <div>
                <span className="font-medium">Time since last data:</span>{' '}
                {formatTimeSinceLastData(healthStatus.timeSinceLastData)}
              </div>
              <div>
                <span className="font-medium">Active devices:</span>{' '}
                {healthStatus.deviceCount}
              </div>
              <div>
                <span className="font-medium">Last device update:</span>{' '}
                {healthStatus.lastDeviceUpdate || 'None'}
              </div>
              <div>
                <span className="font-medium">Consecutive failures:</span>{' '}
                {healthStatus.consecutiveFailures}
              </div>
              <div>
                <span className="font-medium">Expected interval:</span>{' '}
                {healthStatus.expectedDataInterval / 1000}s
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 