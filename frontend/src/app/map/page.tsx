'use client';
import DashboardLayout from '@/components/DashboardLayout';
import ClientMap from '@/components/ClientMap';
import { useEffect, useState } from 'react';

export default function MapPage() {
  // State to track if we should render the map in fullscreen mode
  const [isMapReady, setIsMapReady] = useState(false);
  
  useEffect(() => {
    // Small delay to ensure everything is loaded properly
    const timer = setTimeout(() => {
      setIsMapReady(true);
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <DashboardLayout noContentPadding>
      <div className={`absolute inset-0 left-64 ${isMapReady ? 'z-10' : ''}`}>
        <ClientMap />
      </div>
    </DashboardLayout>
  );
}