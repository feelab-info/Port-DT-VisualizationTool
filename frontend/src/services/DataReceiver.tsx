'use client';

import { useEffect, useState } from 'react';
import io from 'socket.io-client';
import MapVisualization from '@/components/Map';

const socket = io(process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001');

export default function DataReceiver() {
  interface MapData {
    longitude: number;
    latitude: number;
    value?: number;
  }

  const [data, setData] = useState<MapData[]>([]);

  useEffect(() => {
    socket.on('db_update', (update: MapData[]) => {
      setData(update);
    });

    return () => {
      socket.off('db_update');
    };
  }, []);

  return (
    <div className="h-screen w-full">
      <MapVisualization data={data} />
    </div>
  );
}