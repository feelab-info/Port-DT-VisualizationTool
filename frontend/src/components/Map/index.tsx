'use client';

import React, { useRef, useState, useEffect } from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Map, useControl, MapRef } from 'react-map-gl/maplibre';
import { MapboxOverlay } from '@deck.gl/mapbox';
import { DeckProps } from '@deck.gl/core';
import SlidingSidebar from '../SlidingSidebar';
import { energyDataService, EnergyData } from '@/services/EnergyDataService';
import vesselSimulationService, { SimulationDetail, DetailedSimulationsResponse } from '@/services/VesselSimulationService';
import { StationaryVessel, createBoatLayer, createHighlightLayers, createPowerLayers, createVesselLayers } from './layers';
import VesselDetailsPopover from './VesselDetailsPopover';
import { smoothRotation } from './utils';
import { 
  ANIMATION_DURATION, 
  BOAT_PATHS, 
  DEFAULT_BOAT_MODEL, 
  INITIAL_VIEW_STATE, 
  MAX_VESSELS, 
  PORT_VIEW_STATE,
  VESSEL_DOCKING_POSITIONS 
} from './constants';

// Create a DeckGL overlay component for MapLibre
function DeckGLOverlay(props: DeckProps & { interleaved?: boolean }) {
  const overlay = useControl<MapboxOverlay>(() => new MapboxOverlay(props));
  overlay.setProps(props);
  return null;
}

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
  const [boatVisible] = useState(true);
  const [currentPathIndex, setCurrentPathIndex] = useState(0);
  
  // These state variables are used internally by the animation system
  // pathProgress tracks the animation progress and is used in the useEffect
  const [pathProgress, setPathProgress] = useState(0);
  const [isDocked, setIsDocked] = useState(false);
  const [dockingStartTime, setDockingStartTime] = useState(0);
  const [boatPaths] = useState(BOAT_PATHS);
  const currentRotationRef = useRef(0);
  
  // Add state to track if initial zoom animation has completed
  const [initialZoomCompleted, setInitialZoomCompleted] = useState(false);
  
  // Add state for vessel simulations
  const [simulationsData, setSimulationsData] = useState<DetailedSimulationsResponse | null>(null);
  const [stationaryVessels, setStationaryVessels] = useState<StationaryVessel[]>([]);
  const [selectedVessel, setSelectedVessel] = useState<{
    id: string;
    name: string;
    position: [number, number, number];
    simulation?: SimulationDetail;
    dockName?: string;
  } | null>(null);

  // Use viewState to track the current map view
  // Start with the initial wide view of the island
  const [viewState, setViewState] = useState(INITIAL_VIEW_STATE);

  // Initial zoom-in animation effect
  useEffect(() => {
    console.log('Initial zoom effect running, completed status:', initialZoomCompleted);
    
    // Define a function to handle the animation
    const performInitialAnimation = () => {
      console.log('Attempting to perform initial animation');
      if (!mapRef.current) {
        console.warn('Map reference not available yet, retrying...');
        // Try again in a short moment if map ref isn't ready
        setTimeout(performInitialAnimation, 500);
        return;
      }
      
      const map = mapRef.current.getMap();
      console.log('Map object retrieved:', !!map);
      
      if (map) {
        // Ensure we're starting from the initial wide view
        map.jumpTo({
          center: [INITIAL_VIEW_STATE.longitude, INITIAL_VIEW_STATE.latitude],
          zoom: INITIAL_VIEW_STATE.zoom,
          pitch: INITIAL_VIEW_STATE.pitch,
          bearing: INITIAL_VIEW_STATE.bearing
        });
        
        // Short delay before starting the animation
        setTimeout(() => {
          console.log('Starting flyTo animation');
          map.flyTo({
            center: [PORT_VIEW_STATE.longitude, PORT_VIEW_STATE.latitude],
            zoom: PORT_VIEW_STATE.zoom,
            pitch: PORT_VIEW_STATE.pitch,
            bearing: PORT_VIEW_STATE.bearing,
            duration: 6000, // Animation duration in milliseconds
            essential: true // This animation is considered essential for the user experience
          });
          
          // Set the flag to true after animation completes
          setTimeout(() => {
            console.log('Animation completed, setting initialZoomCompleted');
            setInitialZoomCompleted(true);
            // Update the viewState to match the final animation state
            setViewState({
              longitude: PORT_VIEW_STATE.longitude,
              latitude: PORT_VIEW_STATE.latitude,
              zoom: PORT_VIEW_STATE.zoom,
              pitch: PORT_VIEW_STATE.pitch,
              bearing: PORT_VIEW_STATE.bearing
            });
          }, 6500); // Slightly longer than the animation to ensure it completes
        }, 10);
      } else {
        console.error('Could not get map object from ref');
      }
    };
    
    // Only run animation once when component mounts and animation hasn't completed
    if (!initialZoomCompleted) {
      console.log('Starting initial animation sequence');
      // Allow time for the map to fully initialize
      const timer = setTimeout(performInitialAnimation, 1500);
      
      return () => {
        console.log('Cleaning up animation timer');
        clearTimeout(timer);
      };
    }
  }, [initialZoomCompleted]);

  // Subscribe to energy data updates
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

  // Progressive loading of boat models
  useEffect(() => {
    if (initialZoomCompleted) {
      // After map is loaded and zoomed in, we can start adding more models
      const timer = setTimeout(() => {
        console.log('Adding second boat model');
        setAvailableModels([
          DEFAULT_BOAT_MODEL,
          // Add additional models here when uncommented in constants.ts
        ]);
        
        return () => {};
      }, 10000); // 10 seconds after initial zoom
      
      return () => {
        clearTimeout(timer);
      };
    }
  }, [initialZoomCompleted]);

  // Fetch vessel simulations
  useEffect(() => {
    const fetchVesselSimulations = async () => {
      try {
        // Get current date in YYYY-MM-DD format
        //const today = new Date().toISOString().split('T')[0];
        const today = new Date('2025-04-28').toISOString().split('T')[0];
        // Fetch detailed simulations
        const data = await vesselSimulationService.getDetailedSimulations(today);
        setSimulationsData(data);
        
        // Create stationary vessels at dock positions based on simulations
        if (data && data.success && data.simulations.length > 0) {
          // Limit to maximum vessels (port capacity)
          const vesselCount = Math.min(data.simulations.length, MAX_VESSELS);
          
          const vesselsData = data.simulations.slice(0, vesselCount).map((simulation, index) => {
            // Get the specific docking position
            const dockPosition = VESSEL_DOCKING_POSITIONS[index % VESSEL_DOCKING_POSITIONS.length];
            
            // Use default model for safety
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
  }, [availableModels]);

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
  const getLatestData = (): EnergyData | null => {
    if (!energyData || energyData.length === 0) return null;
    return energyData[energyData.length - 1];
  };

  // Add a method to find simulation details by vessel name
  const findSimulationByVesselName = (vesselName: string): SimulationDetail | undefined => {
    if (!simulationsData || !simulationsData.success) return undefined;
    return simulationsData.simulations.find(sim => sim.data.vessel === vesselName);
  };

  // Handle vessel click
  const handleVesselClick = (vessel: StationaryVessel) => {
    const simulation = findSimulationByVesselName(vessel.name);
    setSelectedVessel({
      ...vessel,
      simulation
    });
  };

  // Create deck.gl layers
  const getLayers = () => {
    const latestData = getLatestData();
    const boatLayer = createBoatLayer(boatPosition, boatRotation, boatVisible);
    
    // Create vessel layers
    const vesselLayers = createVesselLayers(
      stationaryVessels,
      selectedVessel?.id || null,
      handleVesselClick
    );
    
    // Create highlight layers for selected vessel
    const highlightLayers = createHighlightLayers(
      selectedVessel as StationaryVessel,
      animationTime
    );
    
    if (!latestData) return [...highlightLayers, ...vesselLayers, boatLayer];
    
    // Create power-related layers
    const powerLayers = createPowerLayers(latestData, animationTime);
    
    return [
      powerLayers.columns, 
      powerLayers.markers, 
      powerLayers.labels, 
      powerLayers.powerLines, 
      powerLayers.particles, 
      powerLayers.centerMarker, 
      powerLayers.centerLabel,
      ...highlightLayers,
      ...vesselLayers,
      boatLayer,
    ];
  };

  return (
    <div className="relative w-full h-full">
      {/* Dev info - hidden in production */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute bottom-2 left-2 z-10 bg-black bg-opacity-70 text-white text-xs p-1 rounded">
          Path: {currentPathIndex}, Progress: {(pathProgress * 100).toFixed(1)}%, Docked: {isDocked ? 'Yes' : 'No'}
        </div>
      )}

      <Map
        ref={mapRef}
        initialViewState={initialZoomCompleted ? viewState : INITIAL_VIEW_STATE}
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
              {stationaryVessels.map((vessel) => (
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

      {/* Vessel Details Popover */}
      {selectedVessel && (
        <VesselDetailsPopover 
          vessel={selectedVessel} 
          onClose={() => setSelectedVessel(null)} 
        />
      )}
    </div>
  );
} 