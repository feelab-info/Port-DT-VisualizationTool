'use client';

import { useEffect } from 'react';
import io from 'socket.io-client';
import MapVisualization from '@/components/Map';
import deviceDataHealthMonitor from './DeviceDataHealthMonitor';

const socket = io(process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001');

export default function DataReceiver() {
  useEffect(() => {
    socket.on('db_update', (update: unknown[]) => {
      // Update device data health monitor
      if (update && update.length > 0) {
        deviceDataHealthMonitor.updateDataTimestamp(update.length, new Date().toISOString());
      }
    });

    return () => {
      socket.off('db_update');
    };
  }, []);

  return (
    <div className="h-screen w-full">
      <MapVisualization />
    </div>
  );
}