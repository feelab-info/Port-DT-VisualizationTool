// frontend/src/components/Map.tsx
'use client';

import React, { useRef } from 'react';
import dynamic from 'next/dynamic';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MapRef } from 'react-map-gl/maplibre';
import SlidingSidebar from './SlidingSidebar'; 

// Dynamically import Map with SSR disabled
const MapLibre = dynamic(
  () => import('react-map-gl/maplibre'),
  { ssr: false } // This prevents server-side rendering
);

export default function MapVisualization() {
  // Create a ref to access the map instance
  const mapRef = useRef<MapRef>(null);

  return (
    <div className="relative w-full h-full">
      {/* Map component */}
      <MapLibre
        ref={mapRef}
        initialViewState={{
          latitude: 32.64271,
          longitude: -16.90979,
          zoom: 16.4,
          pitch: 61.8,  // tilt
          bearing: -53.1
        }}
        style={{width: "100%", height: "100%"}}
        mapStyle={"https://tiles.openfreemap.org/styles/liberty"}
        attributionControl={false}
        
      />

      {/* Sliding Sidebar */}
      <SlidingSidebar 
        position="left" 
        mapRef={mapRef.current}
        title="Port energy Readings"
      >
        {/* I can add my sidebar content here */}
        
      </SlidingSidebar>
      <SlidingSidebar 
        position="right" 
        mapRef={mapRef.current}
        title="Port energy Readings"
      >
      
      {/* I can add my sidebar content here */}

      </SlidingSidebar>
    </div>
  );    
}