// frontend/src/components/Map.tsx
'use client';

import dynamic from 'next/dynamic';
import 'maplibre-gl/dist/maplibre-gl.css';

// Dynamically import Map with SSR disabled
const Map = dynamic(
  () => import('react-map-gl/maplibre'),
  { ssr: false } // This prevents server-side rendering
);

export default function MapVisualization() {
    

    return (
        <Map
          initialViewState={{
            latitude: 32.64271,
            longitude: -16.90979,
            zoom: 16.4,
            pitch: 61.8,  // tilt
            bearing: -53.1
          }}
          
          style={{width: "100%", height: "100%"}}
          mapStyle={"https://tiles.openfreemap.org/styles/liberty"}
        />
      );    
}