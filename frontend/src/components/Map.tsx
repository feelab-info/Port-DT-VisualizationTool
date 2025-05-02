/* eslint-disable @typescript-eslint/no-unused-vars */
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
import { MapCoordinatesHelper } from './mapCoordinatesHelper';
import vesselSimulationService, { 
  DetailedSimulationsResponse, 
  SimulationDetail 
} from '@/services/VesselSimulationService';



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
];

// Port locations for visualization (existing points)
const PORT_LOCATIONS = [
  { id: 'main-dock', name: 'Main Dock', longitude: -16.910284, latitude: 32.641901, elevation: 0 },
  { id: 'terminal-1', name: 'Terminal 1', longitude: -16.915753, latitude: 32.641252, elevation: 0 },
  { id: 'terminal-2', name: 'Terminal 2', longitude: -16.914975, latitude: 32.643076, elevation: 0 },
];

// Define all available boat model paths
const ALL_BOAT_MODELS = [
  '/models/standard/boat.gltf',     // Original boat
  //'/models/west/sceneWest.gltf',    // West model 
  //'/models/spirit/sceneSpirit.gltf' // Spirit model
];

// Start with just the simplest model to reduce memory usage
const DEFAULT_BOAT_MODEL = ALL_BOAT_MODELS[0];

// Original animated boat model (keep this consistent for the animated boat)
const boatModel = DEFAULT_BOAT_MODEL;

// Limit to only 3 vessels (port capacity)
const MAX_VESSELS = 3;

// Boat path definition - route that boat will follow
const BOAT_PATHS = [
  // Path 1: Approach from the south to the main dock
  {
    points: [
      {
        "longitude": -16.89303705238541,
        "latitude": 32.63576890503664,
        "elevation": 0,
        "rotation": -50
      },
      {
        "longitude": -16.899985147045356,
        "latitude": 32.641815752005144,
        "elevation": 0,
        "rotation": -45
      },
      {
        "longitude": -16.903849,
        "latitude": 32.643262,
        "elevation": 0,
        "rotation": -15
      },
      {
        "longitude": -16.907762536573728,
        "latitude": 32.64350616232473,
        "elevation": 0,
        "rotation": 0
      },
      {
        "longitude": -16.908909540323606,
        "latitude": 32.643424335820015,
        "elevation": 0,
        "rotation": 0
      },
      {
        "longitude": -16.909214643434268,
        "latitude": 32.64292086781681,
        "elevation": 0,
        "rotation": 90
      },
      {
        "longitude": -16.90923641097217,
        "latitude": 32.64237832255226,
        "elevation": 0,
        "rotation": 180
      }
    ],
    dockingTime: 20000, // Time to stay docked in ms
    direction: 0 // 0 for coming to port, 1 for leaving port
  },
  // Path 2: Leave from main dock to the east
  {
    points: [
      {
        "longitude": -16.90918377102855,
        "latitude": 32.642367213579845,
        "elevation": 0,
        "rotation": 180
      },
      {
        "longitude": -16.907815219620403,
        "latitude": 32.642373286254596,
        "elevation": 0,
        "rotation": 180
      },
      {
        "longitude": -16.90615329831715,
        "latitude": 32.64231596193808,
        "elevation": 0,
        "rotation": 175
      },
      {
        "longitude": -16.90465613014777,
        "latitude": 32.641628369377685,
        "elevation": 0,
        "rotation": 155
      },
      {
        "longitude": -16.902306288585947,
        "latitude": 32.639182621735614,
        "elevation": 0,
        "rotation": 135
      },
      {
        "longitude": -16.898304801521675,
        "latitude": 32.63455586662788,
        "elevation": 0,
        "rotation": 130
      },
      {
        "longitude": -16.890433117665907,
        "latitude": 32.62670062490649,
        "elevation": 0,
        "rotation": 130
      }
    ],
    dockingTime: 0, // No docking when leaving
    direction: 1 // 1 for leaving port
  }
];

// Define docking locations for stationary vessels - limit to only 3 positions
const VESSEL_DOCKING_POSITIONS = [
  // Main dock
  {
    name: "West Terminal Berth",
    longitude: -16.913029,
    latitude: 32.641917,
    elevation: -5,
    rotation: 190,
    scale: 0.23  // Slightly smaller scale for memory efficiency
  },
  // East Terminal
  {
    name: "East Terminal Berth",
    longitude: -16.913820,
    latitude: 32.643247,
    elevation: -5,
    rotation: 215,
    scale: 0.23  // Slightly smaller scale for memory efficiency
  },
  {
    name: "Main Dock Berth",
    longitude: -16.90923641097217,
    latitude: 32.64237832255226,
    elevation: -5,
    rotation: 180,
    scale: 0.23  // Slightly smaller scale for memory efficiency
  },
  
  // West Terminal
  
];

export default function MapVisualization() {
  // Create a ref to access the map instance
  const mapRef = useRef<MapRef>(null);
  const [energyData, setEnergyData] = useState<EnergyData[]>([]);
  const [animationTime, setAnimationTime] = useState(0);
  
  // State for available models - start with just one for memory efficiency
  const [availableModels, setAvailableModels] = useState([DEFAULT_BOAT_MODEL]);
  
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
  const [boatPaths, setBoatPaths] = useState<typeof BOAT_PATHS>(BOAT_PATHS);
  const currentRotationRef = useRef(0);
  
  // Add state to track if initial zoom animation has completed
  const [initialZoomCompleted, setInitialZoomCompleted] = useState(false);
  
  // Add state for vessel simulations
  const [simulationsData, setSimulationsData] = useState<DetailedSimulationsResponse | null>(null);
  const [stationaryVessels, setStationaryVessels] = useState<Array<{
    id: string;
    name: string;
    position: [number, number, number];
    rotation: number;
    scale?: number;
    dockName?: string;
    model: string; // Add model property to track which 3D model to use
  }>>([]);

  const [viewState, setViewState] = useState({
    latitude: 32.74, // Start with a wider view of Madeira island
    longitude: -16.95,
    zoom: 10, // Start zoomed out
    pitch: 0,  // Start with no tilt
    bearing: 0
  });

  // Initial zoom-in animation effect
  useEffect(() => {
    // Only run this effect once when component mounts
    if (!initialZoomCompleted && mapRef.current) {
      // Short delay to ensure map is fully loaded
      const timer = setTimeout(() => {
        const map = mapRef.current?.getMap();
        if (map) {
          // Animate to the port view
          map.flyTo({
            center: [-16.90979, 32.64271],
            zoom: 16.4,
            pitch: 61.8,
            bearing: -53.1,
            duration: 6000, // Animation duration in milliseconds
            essential: true // This animation is considered essential for the user experience
          });
          
          // Set the flag to true after animation completes
          setTimeout(() => {
            setInitialZoomCompleted(true);
          }, 6000);
        }
      }, 900);
      
      return () => clearTimeout(timer);
    }
  }, [initialZoomCompleted, mapRef.current]);

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

  // Add progressive loading of more boat models once the map is stable
  useEffect(() => {
    if (initialZoomCompleted) {
      // After map is loaded and zoomed in, we can start adding more models
      const timer = setTimeout(() => {
        console.log('Adding second boat model');
        setAvailableModels([
          DEFAULT_BOAT_MODEL,
          ALL_BOAT_MODELS[1] // Add the second model
        ]);
        
        // Add the third model after another delay
        const timer2 = setTimeout(() => {
          console.log('Adding third boat model');
          setAvailableModels(ALL_BOAT_MODELS); // Add all models
        }, 15000); // 15 seconds after the second model
        
        return () => {
          clearTimeout(timer2);
        };
      }, 10000); // 10 seconds after initial zoom
      
      return () => {
        clearTimeout(timer);
      };
    }
  }, [initialZoomCompleted]);

  // Fetch vessel simulations and set up stationary ships
  useEffect(() => {
    const fetchVesselSimulations = async () => {
      try {
        // Get current date in YYYY-MM-DD format
        const today = new Date().toISOString().split('T')[0];
        
        // Fetch detailed simulations
        const data = await vesselSimulationService.getDetailedSimulations(today);
        setSimulationsData(data);
        
        // Create stationary vessels at dock positions based on simulations
        if (data && data.success && data.simulations.length > 0) {
          // Limit to maximum 3 vessels (port capacity)
          const vesselCount = Math.min(data.simulations.length, MAX_VESSELS);
          
          const vesselsData = data.simulations.slice(0, vesselCount).map((simulation, index) => {
            // Get the specific docking position
            const dockPosition = VESSEL_DOCKING_POSITIONS[index % VESSEL_DOCKING_POSITIONS.length];
            
            // Use random model from available models (or default if not enough models available)
            const modelIndex = Math.min(
              Math.floor(Math.random() * availableModels.length),
              availableModels.length - 1
            );
            
            return {
              id: `vessel-${index}`,
              name: simulation.data.vessel,
              position: [dockPosition.longitude, dockPosition.latitude, dockPosition.elevation] as [number, number, number],
              rotation: dockPosition.rotation,
              scale: dockPosition.scale,
              dockName: dockPosition.name,
              model: availableModels.length > 0 ? availableModels[modelIndex] || DEFAULT_BOAT_MODEL : DEFAULT_BOAT_MODEL
            };
          });
          
          setStationaryVessels(vesselsData);
        } else {
          setStationaryVessels([]);
        }
      } catch (error) {
        console.error('Error fetching vessel simulations for map:', error);
        setStationaryVessels([]);
      }
    };
    
    // Initial fetch
    fetchVesselSimulations();
    
    // Set up a polling interval to refresh data periodically - but increase the interval to reduce load
    const intervalId = setInterval(() => {
      fetchVesselSimulations();
    }, 120000); // Refresh every 2 minutes instead of 1 minute
    
    return () => {
      clearInterval(intervalId);
    };
  }, [availableModels]); // Add availableModels to dependency array to update vessels when models change

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
    
    // Animation speed - adjust as needed
    const ANIMATION_DURATION = 100000; // 30 seconds for full path

    const smoothRotation = (currentRotation: number, targetRotation: number, smoothFactor = 0.1) => {
      // Find the shortest angle between the current and target rotations
      let angleDiff = targetRotation - currentRotation;
      
      // Normalize the angle difference to be between -180 and 180 degrees
      if (angleDiff > 180) angleDiff -= 360;
      if (angleDiff < -180) angleDiff += 360;
      
      // Apply smoothing
      return currentRotation + angleDiff * smoothFactor;
    };
    
    const animateBoat = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      

      
      // If boat is docked, check if docking time is over
      if (isDocked) {
        const dockingElapsed = timestamp - dockingStartTime;
        const currentPath = boatPaths[currentPathIndex];
        
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
        
        let angle;
        if (startPoint.rotation !== undefined && endPoint.rotation !== undefined) {
          // Interpolate between rotations
          angle = startPoint.rotation + (endPoint.rotation - startPoint.rotation) * segmentFraction;
        } else {
          // Fall back to calculated rotation
          const dx = endPoint.longitude - startPoint.longitude;
          const dy = endPoint.latitude - startPoint.latitude;
          angle = Math.atan2(dy, dx) * (180 / Math.PI) - 90; // Convert radians to degrees, adjust for model orientation
          
          // For boats leaving the port, add 180 degrees if direction is set
          if (currentPath.direction === 1) {
            angle += 180;
          }
        }        
        
        const smoothedRotation = smoothRotation(currentRotationRef.current, angle);
        currentRotationRef.current = smoothedRotation;
        setBoatRotation(smoothedRotation);

        
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
  }, [currentPathIndex, isDocked, dockingStartTime, boatPaths]);

  // Function to get the latest data
  const getLatestData = () => {
    if (energyData.length === 0) return null;
    return energyData[energyData.length - 1];
  };

  // Create deck.gl layers
  const getLayers = () => {
    const latestData = getLatestData();

    // Create animated boat layer
    const boatLayer = new ScenegraphLayer({
      id: 'boat-model',
      data: [
        {
          position: [boatPosition.longitude, boatPosition.latitude, boatPosition.elevation]
        }
      ],
      scenegraph: boatModel,
      sizeScale: 0.18, // Slightly smaller to improve performance
      _lighting: 'pbr',
      getPosition: d => d.position,
      getOrientation: d => [0, boatRotation, 90], // Try different combinations
      pickable: true,
      visible: boatVisible,
      parameters: {
        depthTest: true
      }
    });
    
    // Create individual vessel layers - one layer per vessel to avoid matrix issues
    const vesselLayers = stationaryVessels.slice(0, MAX_VESSELS).map((vessel, index) => {
      try {
        return new ScenegraphLayer({
          id: `vessel-${index}`,
          data: [vessel],
          scenegraph: vessel.model || DEFAULT_BOAT_MODEL,
          sizeScale: vessel.scale || 0.18,
          _lighting: 'pbr',
          getPosition: d => d.position,
          getOrientation: d => [0, d.rotation, 90],
          pickable: true,
          getTooltip: (d: {
            id: string; 
            name: string;
            position: [number, number, number];
            rotation: number;
            scale?: number;
            dockName?: string;
            model: string;
          }) => `${d.name}\nDocked at: ${d.dockName || 'Port'}`,
          visible: true,
          parameters: {
            depthTest: true
          },
          loadOptions: {
            // Add loading options to minimize memory usage
            gl: {
              preserveDrawingBuffer: false
            },
            // Add cross-origin settings for external models
            fetch: {
              mode: 'cors'
            }
          }
        });
      } catch (error) {
        console.error(`Error creating vessel layer ${index}:`, error);
        // Return a simple placeholder layer if the 3D model failed to load
        return new ScatterplotLayer({
          id: `vessel-${index}-placeholder`,
          data: [vessel],
          getPosition: d => d.position,
          getFillColor: [255, 0, 0],
          getRadius: 5,
          radiusScale: 10,
          pickable: true,
          getTooltip: (d: {
            id: string; 
            name: string;
            position: [number, number, number];
            rotation: number;
            scale?: number;
            dockName?: string;
            model: string;
          }) => `${d.name}\nDocked at: ${d.dockName || 'Port'} (3D model failed to load)`
        });
      }
    });
    
    // Visualize boat path for debugging (optional)
    const boatPathLayer = new ScatterplotLayer({
      id: 'boat-path-markers',
      data: boatPaths.flatMap(path => path.points),
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
    
    if (!latestData) return [boatLayer, ...vesselLayers];
    
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
    
    
    
    return [
      columns, 
      markers, 
      labels, 
      powerLines, 
      particles, 
      centerMarker, 
      centerLabel,
      ...vesselLayers, // Add all vessel layers 
      boatLayer,
      //boatPathLayer // Uncomment for debugging
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
        onMove={evt => {
          // Only update view state manually after initial animation is complete
          if (initialZoomCompleted) {
            setViewState(evt.viewState);
          }
        }}
      >
        {/* Add deck.gl overlay to the map */}
        <DeckGLOverlay 
          layers={getLayers()} 
          interleaved={true} 
        />
      </Map>

      
      
      <SlidingSidebar 
        position="right" 
        mapRef={mapRef.current}
        title="Port Energy Analytics"
      >
        {/* Right sidebar content */}
        {simulationsData && simulationsData.success && (
          <div className="p-4">
            <h3 className="text-lg font-semibold mb-2">Vessels in Port</h3>
            <p className="text-sm text-gray-600 mb-3">
              Currently showing {stationaryVessels.length} of {simulationsData.simulations.length} vessel{simulationsData.simulations.length !== 1 ? 's' : ''} at port
              {simulationsData.simulations.length > VESSEL_DOCKING_POSITIONS.length && (
                <span className="block text-amber-600 mt-1">
                  (Port can only accommodate {VESSEL_DOCKING_POSITIONS.length} vessels at once)
                </span>
              )}
            </p>
            <ul className="space-y-2">
              {stationaryVessels.map((vessel, index) => (
                <li key={vessel.id} className="p-3 bg-blue-50 rounded border border-blue-100">
                  <p className="font-medium">{vessel.name}</p>
                  <p className="text-sm text-gray-600">Docked at: {vessel.dockName || 'Port'}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Model: {vessel.model ? vessel.model.split('/').pop()?.replace('.gltf', '') || 'Unknown' : 'Default'}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </SlidingSidebar>
      

      {/* Boat Path Editor 
      <MapCoordinatesHelper 
      mapRef={mapRef}
      paths={boatPaths}
      onPathsUpdated={(updatedPaths) => {
        setBoatPaths(updatedPaths);
        // Log the paths for easy copying to your source code
        console.log(JSON.stringify(updatedPaths, null, 2));
      }}
    />
    */}
    
    </div>
  );    
}