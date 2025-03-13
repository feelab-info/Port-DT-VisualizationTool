'use client';

import React, { useRef, useState, useEffect } from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Map, useControl, MapRef } from 'react-map-gl/maplibre';
import { MapboxOverlay } from '@deck.gl/mapbox';
import { DeckProps } from '@deck.gl/core';
import { ColumnLayer, ScatterplotLayer, TextLayer, ArcLayer} from '@deck.gl/layers';
import {ScenegraphLayer} from '@deck.gl/mesh-layers';
import SlidingSidebar from './SlidingSidebar';
import { energyDataService, EnergyData } from '../services/EnergyDataService';
import { Quaternion } from 'math.gl';




// Create a DeckGL overlay component for MapLibre
function DeckGLOverlay(props: DeckProps & { interleaved?: boolean }) {
  const overlay = useControl<MapboxOverlay>(() => new MapboxOverlay(props));
  overlay.setProps(props);
  return null;
}

// Port center and destinations for power lines
const PORT_CENTER = { longitude: -16.91026503370738, latitude: 32.64184038298506 };
const PORT_DESTINATIONS = [
  { id: 'east', name: 'East Terminal', longitude: -16.907203153852876, latitude: 32.64186799317473 },
  { id: 'west', name: 'West Terminal', longitude: -16.915464898116372, latitude: 32.64102681507696 },
  { id: 'north', name: 'North Dock', longitude: -16.910265, latitude: 32.644 },
  { id: 'south', name: 'South Dock', longitude: -16.910265, latitude: 32.6395 },
];

// Port locations for visualization (existing points)
const PORT_LOCATIONS = [
  { id: 'main-dock', name: 'Main Dock', longitude: -16.90979, latitude: 32.64271, elevation: 0 },
  { id: 'terminal-1', name: 'Terminal 1', longitude: -16.91079, latitude: 32.64371, elevation: 0 },
  { id: 'terminal-2', name: 'Terminal 2', longitude: -16.90879, latitude: 32.64171, elevation: 0 },
];

const boatModel = '/models/boat.gltf';

// Boat path definition - route that boat will follow
const BOAT_PATHS = [
  // Path 1: Approach from the south to the main dock
  {
    points: [
      { longitude: -16.91026, latitude: 32.635, elevation: 0 },  // Starting point (far south)
      { longitude: -16.91026, latitude: 32.638, elevation: 0 },  // Approach point
      { longitude: -16.90979, latitude: 32.64171, elevation: 0 }, // Near Terminal 2
      { longitude: -16.90979, latitude: 32.64271, elevation: 0 }  // Main Dock
    ],
    dockingTime: 20000, // Time to stay docked in ms
    direction: 0 // 0 for coming to port, 1 for leaving port
  },
  // Path 2: Leave from main dock to the east
  {
    points: [
      { longitude: -16.90979, latitude: 32.64271, elevation: 0 },  // Main Dock
      { longitude: -16.907203, latitude: 32.64186, elevation: 0 }, // Near East Terminal
      { longitude: -16.905, latitude: 32.642, elevation: 0 },      // Leaving point
      { longitude: -16.9, latitude: 32.642, elevation: 0 }         // Far east point
    ],
    dockingTime: 0, // No docking when leaving
    direction: 1 // 1 for leaving port
  }
];

export default function MapVisualization() {
  // Create a ref to access the map instance
  const mapRef = useRef<MapRef>(null);
  const [energyData, setEnergyData] = useState<EnergyData[]>([]);
  const [animationTime, setAnimationTime] = useState(0);
  
  // Boat animation state
  const [boatPosition, setBoatPosition] = useState({ 
    longitude: BOAT_PATHS[0].points[0].longitude, 
    latitude: BOAT_PATHS[0].points[0].latitude,
    elevation: 0
  });
  const [boatRotation, setBoatRotation] = useState(0);
  const [boatVisible, setBoatVisible] = useState(true);
  const [currentPathIndex, setCurrentPathIndex] = useState(0);
  const [pathProgress, setPathProgress] = useState(0);
  const [isDocked, setIsDocked] = useState(false);
  const [dockingStartTime, setDockingStartTime] = useState(0);
  
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

  // Animation effect for power lines
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationTime(prev => (prev + 0.02) % 1); // Cycle between 0 and 1
    }, 50); // Update every 50ms for smooth animation
    
    return () => clearInterval(interval);
  }, []);

  // Boat animation logic
  useEffect(() => {
    let animationFrameId: number;
    let startTime: number | null = null;
    let lastTime = 0;
    
    // Animation speed - adjust as needed
    const ANIMATION_DURATION = 30000; // 30 seconds for full path
    
    const animateBoat = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      
      // If boat is docked, check if docking time is over
      if (isDocked) {
        const dockingElapsed = timestamp - dockingStartTime;
        const currentPath = BOAT_PATHS[currentPathIndex];
        
        if (dockingElapsed >= currentPath.dockingTime) {
          // Docking time is over, move to next path
          setIsDocked(false);
          const nextPathIndex = (currentPathIndex + 1) % BOAT_PATHS.length;
          setCurrentPathIndex(nextPathIndex);
          setPathProgress(0);
          startTime = timestamp; // Reset animation timer
        } else {
          // Still docked, continue animation loop
          animationFrameId = requestAnimationFrame(animateBoat);
          return;
        }
      }
      
      // Calculate progress along the path (0 to 1)
      const progress = Math.min(1, elapsed / ANIMATION_DURATION);
      setPathProgress(progress);
      
      const currentPath = BOAT_PATHS[currentPathIndex];
      const points = currentPath.points;
      
      // Interpolate position along the path using bezier-like curve
      if (progress < 1) {
        // Simple multi-point linear interpolation
        const segmentCount = points.length - 1;
        const segmentProgress = progress * segmentCount;
        const currentSegment = Math.min(Math.floor(segmentProgress), segmentCount - 1);
        const segmentFraction = segmentProgress - currentSegment;
        
        const startPoint = points[currentSegment];
        const endPoint = points[currentSegment + 1];
        
        // Linear interpolation between points
        const newLongitude = startPoint.longitude + (endPoint.longitude - startPoint.longitude) * segmentFraction;
        const newLatitude = startPoint.latitude + (endPoint.latitude - startPoint.latitude) * segmentFraction;
        
        // Update boat position
        setBoatPosition({
          longitude: newLongitude,
          latitude: newLatitude,
          elevation: 0
        });
        
        // Calculate boat heading (rotation)
        const dx = endPoint.longitude - startPoint.longitude;
        const dy = endPoint.latitude - startPoint.latitude;
        let angle = Math.atan2(dy, dx) * (180 / Math.PI) - 90; // Convert radians to degrees, adjust for model orientation
        
        // For boats leaving the port, add 180 degrees to face the correct direction
        if (currentPath.direction === 1) {
          angle += 180;
        }
        
        setBoatRotation(angle);
        
        // Continue animation loop
        animationFrameId = requestAnimationFrame(animateBoat);
      } else {
        // Path complete - dock if needed or move to next path
        const finalPoint = points[points.length - 1];
        setBoatPosition({
          longitude: finalPoint.longitude,
          latitude: finalPoint.latitude,
          elevation: 0
        });
        
        if (currentPath.dockingTime > 0) {
          setIsDocked(true);
          setDockingStartTime(timestamp);
          animationFrameId = requestAnimationFrame(animateBoat);
        } else {
          // Move to next path
          const nextPathIndex = (currentPathIndex + 1) % BOAT_PATHS.length;
          setCurrentPathIndex(nextPathIndex);
          setPathProgress(0);
          startTime = timestamp; // Reset animation timer
          animationFrameId = requestAnimationFrame(animateBoat);
        }
      }
    };
    
    // Start animation loop
    animationFrameId = requestAnimationFrame(animateBoat);
    
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [currentPathIndex, isDocked, dockingStartTime]);

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
    
    // Power distribution center marker (bigger, more prominent)
    const centerMarker = new ScatterplotLayer({
      id: 'center-marker',
      data: [PORT_CENTER],
      pickable: true,
      opacity: 0.9,
      stroked: true,
      filled: true,
      radiusScale: 10,
      radiusMinPixels: 10,
      radiusMaxPixels: 20,
      lineWidthMinPixels: 2,
      getPosition: d => [d.longitude, d.latitude, 0],
      getRadius: 8,
      getFillColor: [255, 215, 0], // Gold color for the center
      getLineColor: [255, 140, 0]
    });
    
    // Create dynamic power line data with animation properties
    const powerLineData = PORT_DESTINATIONS.map((destination, index) => {
      // Use different power values for each destination
      const powerLineIndex = index % 3;
      const powerValue = powerLineIndex === 0 ? latestData.L1.P : 
                        powerLineIndex === 1 ? latestData.L2.P : 
                        latestData.L3.P;
      
      // Normalize power value for visual scaling (0-1 range)
      const normalizedPower = Math.min(1, powerValue / 25000);
      
      return {
        source: [PORT_CENTER.longitude, PORT_CENTER.latitude],
        target: [destination.longitude, destination.latitude],
        power: powerValue,
        normalizedPower,
        name: destination.name,
        id: destination.id
      };
    });
    
    // Animated power lines using ArcLayer
    const powerLines = new ArcLayer({
      id: 'power-distribution-lines',
      data: powerLineData,
      pickable: true,
      getSourceColor: [255, 255, 0, 200], // Yellow at source
      getTargetColor: d => [
        255 * Math.min(1, d.normalizedPower * 2),
        100 * (1 - d.normalizedPower),
        255 * (1 - d.normalizedPower),
        200
      ],
      getWidth: d => 2 + d.normalizedPower * 6,
      getTilt: 0,
      getHeight: d => 0.5 + d.normalizedPower * 0.5,
      greatCircle: false,
      widthUnits: 'pixels',
      // Animation
      getSourcePosition: d => d.source, // Source remains fixed
      getTargetPosition: d => {
        const t = animationTime;
        const [srcLng, srcLat] = d.source;
        const [tgtLng, tgtLat] = d.target;
        return [
          srcLng + (tgtLng - srcLng) * t,
          srcLat + (tgtLat - srcLat) * t
        ];
      },
      updateTriggers: {
        getTargetPosition: [animationTime],
        getSourceColor: [latestData],
        getTargetColor: [latestData],
        getWidth: [latestData]
      }
    });

    
    // Animated particles along power lines for added effect
    const particles = new ScatterplotLayer({
      id: 'power-particles',
      data: powerLineData.map(line => {
        // Calculate position along the line based on animation time
        const [srcLng, srcLat] = line.source;
        const [tgtLng, tgtLat] = line.target;
        
        // Create multiple particles per line with different offsets
        return Array.from({ length: 5 }).map((_, i) => {
          const particleOffset = (animationTime + i * 0.2) % 1;
          return {
            position: [
              srcLng + (tgtLng - srcLng) * particleOffset,
              srcLat + (tgtLat - srcLat) * particleOffset
            ],
            power: line.power,
            normalizedPower: line.normalizedPower
          };
        });
      }).flat(),
      pickable: false,
      opacity: 0.8,
      stroked: false,
      filled: true,
      radiusScale: 3,
      radiusMinPixels: 2,
      radiusMaxPixels: 5,
      getPosition: d => d.position,
      getRadius: d => 1 + d.normalizedPower * 3,
      getFillColor: d => {
        // Color based on power level
        return [
          255, // Red
          255 * (1 - d.normalizedPower), // Yellow to red gradient
          0,
          200 + 55 * Math.sin(animationTime * Math.PI * 2) // Pulsing effect
        ];
      },
      updateTriggers: {
        getPosition: [animationTime],
        getFillColor: [animationTime, latestData],
        getRadius: [latestData]
      }
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
    
    // Add center label
    const centerLabel = new TextLayer({
      id: 'center-label',
      data: [{
        ...PORT_CENTER,
        text: `Power Distribution Center\n${Math.round(latestData.measure_cons)} W Total`
      }],
      pickable: true,
      getPosition: d => [d.longitude, d.latitude, 50],
      getText: d => d.text,
      getSize: 16,
      getAngle: 0,
      getTextAnchor: 'middle',
      getAlignmentBaseline: 'center',
      getPixelOffset: [0, -40],
      getColor: [255, 215, 0]
    });
    
    // Boat 3D model layer
    const boatLayer = new ScenegraphLayer({
      id: 'boat-model',
      data: [
        {
          position: [boatPosition.longitude, boatPosition.latitude, boatPosition.elevation],
          // Create a proper quaternion from euler angles
          orientation: new Quaternion().rotateZ(boatRotation * (Math.PI / 180)).toArray(),
          scale: 3
        }
      ],
      scenegraph: boatModel,
      sizeScale: 10,
      _lighting: 'pbr',
      getPosition: d => d.position,
      getOrientation: d => d.orientation,
      getTranslation: [0, 0, 0],
      getScale: d => d.scale,
      pickable: true,
      visible: boatVisible,
      // Add this for debugging
      onError: (error) => {
        console.log('ScenegraphLayer error:', error);
      }
    });
    
    
    // Visualize boat path for debugging (optional)
    const boatPathLayer = new ScatterplotLayer({
      id: 'boat-path-markers',
      data: BOAT_PATHS.flatMap(path => path.points),
      pickable: false,
      opacity: 0.5,
      stroked: true,
      filled: true,
      radiusScale: 3,
      radiusMinPixels: 2,
      radiusMaxPixels: 4,
      getPosition: d => [d.longitude, d.latitude, d.elevation],
      getRadius: 3,
      getFillColor: [255, 140, 0, 120],
      getLineColor: [255, 140, 0]
    });
    
    return [
      columns, 
      markers, 
      labels, 
      powerLines, 
      particles, 
      centerMarker, 
      centerLabel, 
      boatLayer,
      boatPathLayer // Uncomment for debugging
    ];
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
          Power distribution visualization showing energy flowing from the central distribution point throughout the port.
          {isDocked ? 
            " A ship is currently docked at the port." : 
            " A ship is traveling to/from the port."}
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