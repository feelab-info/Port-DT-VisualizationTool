// frontend/src/components/Map.tsx
'use client';

import React, { useRef, useState, useEffect } from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Map, useControl, MapRef } from 'react-map-gl/maplibre';
import { MapboxOverlay } from '@deck.gl/mapbox';
import { DeckProps } from '@deck.gl/core';
import { ColumnLayer, ScatterplotLayer, TextLayer } from '@deck.gl/layers';
import SlidingSidebar from './SlidingSidebar';
import { energyDataService, EnergyData } from '../services/EnergyDataService';

// Create a DeckGL overlay component for MapLibre
function DeckGLOverlay(props: DeckProps & { interleaved?: boolean }) {
  const overlay = useControl<MapboxOverlay>(() => new MapboxOverlay(props));
  overlay.setProps(props);
  return null;
}

// Port locations for visualization
const PORT_LOCATIONS = [
  { id: 'main-dock', name: 'Main Dock', longitude: -16.90979, latitude: 32.64271, elevation: 0 },
  { id: 'terminal-1', name: 'Terminal 1', longitude: -16.91079, latitude: 32.64371, elevation: 0 },
  { id: 'terminal-2', name: 'Terminal 2', longitude: -16.90879, latitude: 32.64171, elevation: 0 },
];

export default function MapVisualization() {
  // Create a ref to access the map instance
  const mapRef = useRef<MapRef>(null);
  const [energyData, setEnergyData] = useState<EnergyData[]>([]);
  const [viewState, setViewState] = useState({
    latitude: 32.64271,
    longitude: -16.90979,
    zoom: 16.4,
    pitch: 61.8,  // tilt
    bearing: -53.1
  });

  useEffect(() => {
    const handleDataUpdate = (data: EnergyData[]) => {
      setEnergyData(data);
    };
    
    // Set initial state
    setEnergyData(energyDataService.getData());
    
    // Subscribe to events
    energyDataService.on('data-update', handleDataUpdate);
    
    return () => {
      // Cleanup listeners
      energyDataService.removeListener('data-update', handleDataUpdate);
    };
  }, []);

  // Function to get the latest data
  const getLatestData = () => {
    if (energyData.length === 0) return null;
    return energyData[energyData.length - 1];
  };

  // Create deck.gl layers
  const getLayers = () => {
    const latestData = getLatestData();
    
    if (!latestData) return [];
    
    // Column layer to show power consumption
    const columns = new ColumnLayer({
      id: 'power-columns',
      data: PORT_LOCATIONS.map((location, index) => {
        // Distribute the power data across locations
        const powerValue = index === 0 ? latestData.L1.P : 
                           index === 1 ? latestData.L2.P : 
                           latestData.L3.P;
        
        return {
          ...location,
          power: powerValue
        };
      }),
      diskResolution: 12,
      radius: 20,
      extruded: true,
      pickable: true,
      elevationScale: 0.1,
      getPosition: d => [d.longitude, d.latitude, d.elevation],
      getFillColor: d => {
        // Color based on power level (red for high, blue for low)
        const normalizedPower = d.power / 25000; // Assume 25kW is max
        return [
          255 * Math.min(1, normalizedPower * 2), // More red as power increases
          100 * (1 - normalizedPower),
          255 * (1 - normalizedPower), // More blue as power decreases
          200
        ];
      },
      getElevation: d => d.power * 0.01, // Scale height based on power
      updateTriggers: {
        getFillColor: [latestData],
        getElevation: [latestData]
      }
    });
    
    // Scatterplot layer for locations
    const markers = new ScatterplotLayer({
      id: 'location-markers',
      data: PORT_LOCATIONS,
      pickable: true,
      opacity: 0.8,
      stroked: true,
      filled: true,
      radiusScale: 6,
      radiusMinPixels: 5,
      radiusMaxPixels: 15,
      lineWidthMinPixels: 1,
      getPosition: d => [d.longitude, d.latitude, 0],
      getRadius: 5,
      getFillColor: [0, 140, 255],
      getLineColor: [0, 0, 0]
    });
    
    // Text layer for labels
    const labels = new TextLayer({
      id: 'location-labels',
      data: PORT_LOCATIONS.map((location, index) => {
        const powerValue = index === 0 ? latestData.L1.P : 
                           index === 1 ? latestData.L2.P : 
                           latestData.L3.P;
        return {
          ...location,
          text: `${location.name}\n${Math.round(powerValue)} W`
        };
      }),
      pickable: true,
      getPosition: d => [d.longitude, d.latitude, d.elevation + 40],
      getText: d => d.text,
      getSize: 14,
      getAngle: 0,
      getTextAnchor: 'middle',
      getAlignmentBaseline: 'center',
      getPixelOffset: [0, -20]
    });
    
    return [columns, markers, labels];
  };

  return (
    <div className="relative w-full h-full">
      <Map
        ref={mapRef}
        initialViewState={viewState}
        style={{width: "100%", height: "100%"}}
        mapStyle="https://tiles.openfreemap.org/styles/liberty"
        attributionControl={false}
        onMove={evt => setViewState(evt.viewState)}
      >
        {/* Add deck.gl overlay to the map */}
        <DeckGLOverlay 
          layers={getLayers()} 
          interleaved={true} 
        />
      </Map>

      {/* Sliding Sidebar */}
      <SlidingSidebar 
        position="left" 
        mapRef={mapRef.current}
        title="Port Energy Readings"
      >
        {/* Sidebar content is handled by the SlidingSidebar component */}
      </SlidingSidebar>
      
      <SlidingSidebar 
        position="right" 
        mapRef={mapRef.current}
        title="Port Energy Analytics"
      >
        {/* Right sidebar content */}
      </SlidingSidebar>
      
      {/* Info Panel */}
      <div className="absolute top-4 right-4 bg-white bg-opacity-80 p-3 rounded shadow z-10 max-w-xs">
        <h3 className="font-bold text-lg mb-2">Port Energy Visualization</h3>
        <p className="text-sm mb-2">
          Real-time energy consumption displayed as 3D columns.
          Column height and color represent power levels.
        </p>
        <div className="text-xs text-gray-600 mt-2">
          {getLatestData() ? 
            `Last update: ${new Date(getLatestData()?.timestamp || '').toLocaleTimeString()}` : 
            'Waiting for data...'}
        </div>
      </div>
    </div>
  );    
}