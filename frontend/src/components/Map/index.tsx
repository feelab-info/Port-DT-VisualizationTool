'use client';

import React, { useRef, useState, useEffect } from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Map, useControl, MapRef } from 'react-map-gl/maplibre';
import { MapboxOverlay } from '@deck.gl/mapbox';
import { DeckProps } from '@deck.gl/core';
import SlidingSidebar from '../SlidingSidebar';
import MapSensorPanel from './MapSensorPanel';
import TimeSlider from './TimeSlider';
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
  PORT_DESTINATIONS,
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
  
  // Map style with automatic fallback
  const [mapStyle, setMapStyle] = useState("https://tiles.openfreemap.org/styles/liberty");
  const [hasTriedFallback, setHasTriedFallback] = useState(false);
  
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
  const [isDocked, setIsDocked] = useState(false);
  const [dockingStartTime, setDockingStartTime] = useState(0);
  const [boatPaths] = useState(BOAT_PATHS);
  const currentRotationRef = useRef(0);
  
  // Add state to track if initial zoom animation has completed
  const [initialZoomCompleted, setInitialZoomCompleted] = useState(false);
  
  // Add state for vessel simulations
  const [simulationsData, setSimulationsData] = useState<DetailedSimulationsResponse | null>(null);
  const [stationaryVessels, setStationaryVessels] = useState<StationaryVessel[]>([]);
  const [selectedVessel, setSelectedVessel] = useState<(StationaryVessel & {
    simulation?: SimulationDetail;
  }) | null>(null);

  // Time slider state
  const [isLiveMode, setIsLiveMode] = useState(true);
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [isPlaying, setIsPlaying] = useState(false);

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
      // If in live mode, update selected time to the most recent timestamp
      if (isLiveMode && data.length > 0) {
        // Find the most recent timestamp regardless of array order
        const timestamps = data.map(d => new Date(d.timestamp).getTime());
        const latestTimestamp = new Date(Math.max(...timestamps));
        setSelectedTime(latestTimestamp);
      }
    };
    
    // Set initial state
    const initialData = energyDataService.getData();
    setEnergyData(initialData);
    if (initialData.length > 0) {
      // Find the most recent timestamp regardless of array order
      const timestamps = initialData.map(d => new Date(d.timestamp).getTime());
      const latestTimestamp = new Date(Math.max(...timestamps));
      setSelectedTime(latestTimestamp);
    }
    
    // Subscribe to events
    energyDataService.on('data-update', handleDataUpdate);
    
    return () => {
      // Cleanup listeners
      energyDataService.removeListener('data-update', handleDataUpdate);
    };
  }, [isLiveMode]);

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
        const today = new Date().toISOString().split('T')[0];
        // Fetch detailed simulations
        const data = await vesselSimulationService.getDetailedSimulations(today);
        setSimulationsData(data);
      } catch (error) {
        console.error('Error fetching vessel simulations for map:', error);
        setSimulationsData(null);
      }
    };
    
    // Initial fetch
    fetchVesselSimulations();
    
    // Set up a polling interval to refresh data periodically
    const intervalId = setInterval(() => {
      fetchVesselSimulations();
    }, 120000); // Refresh every 2 minutes
    
    return () => {
      clearInterval(intervalId);
    };
  }, []);

  // Update visible vessels based on current time (from time slider or live)
  useEffect(() => {
    if (!simulationsData || !simulationsData.success || simulationsData.simulations.length === 0) {
      setStationaryVessels([]);
      return;
    }

    // Get current time to check against
    const currentTime = selectedTime;
    const currentHours = currentTime.getHours();
    const currentMinutes = currentTime.getMinutes();
    const currentSeconds = currentTime.getSeconds();
    const currentTimeInSeconds = currentHours * 3600 + currentMinutes * 60 + currentSeconds;

    // Helper function to parse time string (HH:MM:SS) to seconds since midnight
    const parseTimeToSeconds = (timeStr: string): number => {
      const [hours, minutes, seconds] = timeStr.split(':').map(Number);
      return hours * 3600 + minutes * 60 + (seconds || 0);
    };

    // Filter simulations to only show vessels that should be at port at current time
    const activeSimulations = simulationsData.simulations.filter(simulation => {
      const arrivalSeconds = parseTimeToSeconds(simulation.data.arrival_time);
      const departureSeconds = parseTimeToSeconds(simulation.data.departure_time);
      
      // Check if current time is between arrival and departure
      return currentTimeInSeconds >= arrivalSeconds && currentTimeInSeconds <= departureSeconds;
    });

    // Log vessel visibility changes
    const activeVesselNames = activeSimulations.map(s => s.data.vessel).join(', ');
    if (activeSimulations.length > 0) {
      console.log(`[${currentTime.toLocaleTimeString()}] Vessels at port:`, activeVesselNames);
    } else {
      console.log(`[${currentTime.toLocaleTimeString()}] No vessels at port`);
    }

    // Create stationary vessels for active simulations
    if (activeSimulations.length > 0) {
      // Limit to maximum vessels (port capacity)
      const vesselCount = Math.min(activeSimulations.length, MAX_VESSELS);
      
      const vesselsData = activeSimulations.slice(0, vesselCount).map((simulation, index) => {
        // Get the specific docking position
        const dockPosition = VESSEL_DOCKING_POSITIONS[index % VESSEL_DOCKING_POSITIONS.length];
        
        // Use default model for safety
        const modelIndex = Math.min(
          Math.floor(Math.random() * availableModels.length),
          availableModels.length - 1
        );
        
        return {
          id: `vessel-${simulation.data.vessel}-${index}`,
          name: simulation.data.vessel,
          position: [dockPosition.longitude, dockPosition.latitude, dockPosition.elevation] as [number, number, number],
          rotation: dockPosition.rotation,
          scale: dockPosition.scale,
          dockName: dockPosition.name,
          model: availableModels.length > 0 ? availableModels[modelIndex] || DEFAULT_BOAT_MODEL : DEFAULT_BOAT_MODEL,
          arrivalTime: simulation.data.arrival_time,
          departureTime: simulation.data.departure_time
        };
      });
      
      setStationaryVessels(vesselsData);
    } else {
      // No vessels should be visible at this time
      setStationaryVessels([]);
    }
  }, [simulationsData, selectedTime, availableModels]);

  // Animation loop for smooth energy flow
  useEffect(() => {
    let animationFrameId: number;
    
    const animate = () => {
      setAnimationTime(Date.now() * 0.001); // Convert to seconds for smoother animation
      animationFrameId = requestAnimationFrame(animate);
    };
    
    // Start animation loop only after initial zoom is completed
    if (initialZoomCompleted) {
      animationFrameId = requestAnimationFrame(animate);
    }
    
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [initialZoomCompleted]);

  // Boat animation logic - COMMENTED OUT
  /*
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
          startTime = timestamp; // Reset animation timer
        } else {
          // Still docked, continue animation loop
          animationFrameId = requestAnimationFrame(animateBoat);
          return;
        }
      }
      
      // Calculate progress along the path (0 to 1)
      const progress = Math.min(1, elapsed / ANIMATION_DURATION);
      
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
  */

  // Playback effect
  useEffect(() => {
    if (!isPlaying || energyData.length === 0) return;

    const interval = setInterval(() => {
      // Find all timestamps greater than current selected time
      const futureTimes = energyData
        .map(d => new Date(d.timestamp).getTime())
        .filter(t => t > selectedTime.getTime())
        .sort((a, b) => a - b); // Sort ascending to get the next timestamp

      if (futureTimes.length === 0) {
        // No more future data, we've reached live
        setIsPlaying(false);
        setIsLiveMode(true);
        return;
      }

      // Move to the next timestamp in the future
      setSelectedTime(new Date(futureTimes[0]));
    }, 500); // Update every 500ms

    return () => clearInterval(interval);
  }, [isPlaying, selectedTime, energyData]);

  // Function to get data at selected time
  const getDataAtTime = (): EnergyData | null => {
    if (!energyData || energyData.length === 0) return null;
    
    if (isLiveMode) {
      // Find the data point with the most recent timestamp
      return energyData.reduce((latest, current) => {
        return new Date(current.timestamp).getTime() > new Date(latest.timestamp).getTime()
          ? current
          : latest;
      });
    }

    // Find the closest data point to selected time
    const targetTime = selectedTime.getTime();
    let closestData = energyData[0];
    let minDiff = Math.abs(new Date(energyData[0].timestamp).getTime() - targetTime);

    for (const data of energyData) {
      const diff = Math.abs(new Date(data.timestamp).getTime() - targetTime);
      if (diff < minDiff) {
        minDiff = diff;
        closestData = data;
      }
    }

    return closestData;
  };

  // Get time range for slider (last 6 hours of data)
  const getTimeRange = (): { start: Date; end: Date } => {
    if (energyData.length === 0) {
      const now = new Date();
      return {
        start: new Date(now.getTime() - 6 * 60 * 60 * 1000),
        end: now
      };
    }

    // Check actual order by comparing first and last timestamps
    const firstTime = new Date(energyData[0].timestamp);
    const lastTime = new Date(energyData[energyData.length - 1].timestamp);
    
    // Determine which is earlier and which is later
    const earliestTime = firstTime < lastTime ? firstTime : lastTime;
    const latestTime = firstTime > lastTime ? firstTime : lastTime;
    
    return {
      start: earliestTime,
      end: latestTime
    };
  };

  const handleTimeChange = (time: Date) => {
    setSelectedTime(time);
    setIsLiveMode(false);
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
    if (isPlaying) {
      // Pausing
      setIsLiveMode(false);
    }
  };

  const handleReset = () => {
    setIsLiveMode(true);
    setIsPlaying(false);
    if (energyData.length > 0) {
      setSelectedTime(new Date(energyData[energyData.length - 1].timestamp));
    }
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
    const latestData = getDataAtTime();
    // Boat layer commented out
    // const boatLayer = createBoatLayer(boatPosition, boatRotation, boatVisible);
    
    // Create vessel layers
    const vesselLayers = createVesselLayers(
      stationaryVessels,
      selectedVessel?.id || null,
      handleVesselClick
    );
    
    // Create highlight layers for selected vessel - properly handle null case
    const highlightLayers = createHighlightLayers(
      selectedVessel, // Remove the type assertion to let the function handle null properly
      animationTime
    );
    
    if (!latestData) return [...highlightLayers, ...vesselLayers];
    
    // Create power-related layers
    const powerLayers = createPowerLayers(latestData, animationTime);
    
    return [
      powerLayers.columns, 
      powerLayers.markers, 
      powerLayers.infrastructureMarkers,
      powerLayers.centerMarker,
      powerLayers.powerLines, 
      powerLayers.particles,
      // Labels removed - now shown in MapSensorPanel
      ...highlightLayers,
      ...vesselLayers,
      // boatLayer, // Commented out - no animated boat
    ];
  };

  // Add cleanup effect to prevent errors when component unmounts
  useEffect(() => {
    return () => {
      // Clear selected vessel when component unmounts to prevent null access errors
      setSelectedVessel(null);
      setStationaryVessels([]);
      setSimulationsData(null);
      setEnergyData([]);
      // Reset animation state
      setAnimationTime(0);
      setInitialZoomCompleted(false);
    };
  }, []);

  return (
    <div className="relative w-full h-full">
      {/* Sensor Data Panel - Bottom Left */}
      <MapSensorPanel 
        energyData={energyData} 
        isVisible={initialZoomCompleted}
        selectedTime={isLiveMode ? undefined : selectedTime}
      />

      {/* Time Slider - Top Right */}
      {initialZoomCompleted && energyData.length > 0 && (
        <TimeSlider
          startTime={getTimeRange().start}
          endTime={getTimeRange().end}
          currentTime={selectedTime}
          onTimeChange={handleTimeChange}
          isPlaying={isPlaying}
          onPlayPause={handlePlayPause}
          onReset={handleReset}
        />
      )}

      <Map
        ref={mapRef}
        initialViewState={initialZoomCompleted ? viewState : INITIAL_VIEW_STATE}
        style={{width: "100%", height: "100%"}}
        mapStyle={mapStyle}
        attributionControl={false}
        onError={(e) => {
          console.error('Map error:', e);
          // If OpenFreeMap fails and we haven't tried the fallback yet, switch to CartoDB
          if (!hasTriedFallback && mapStyle.includes('openfreemap')) {
            console.warn('OpenFreeMap failed, automatically switching to CartoDB fallback...');
            setHasTriedFallback(true);
            setMapStyle("https://basemaps.cartocdn.com/gl/positron-gl-style/style.json");
          }
        }}
        onLoad={(e) => {
          const map = e.target;
          
          // Log which map style successfully loaded
          if (mapStyle.includes('openfreemap')) {
            console.log('✓ OpenFreeMap loaded successfully');
          } else {
            console.log('✓ CartoDB fallback loaded successfully');
          }
          
          // Function to add 3D buildings
          const add3DBuildings = () => {
            try {
              // Check if layer already exists
              if (map.getLayer('3d-buildings')) {
                return;
              }

              const style = map.getStyle();
              
              // Determine source name based on which map style is active
              let sourceName = 'carto';
              let sourceLayer = 'building';
              
              // OpenFreeMap uses 'openmaptiles', CartoDB uses 'carto'
              if (style?.sources?.openmaptiles) {
                sourceName = 'openmaptiles';
                sourceLayer = 'building';
              } else if (!style?.sources?.carto) {
                console.log('No compatible source found for 3D buildings');
                return;
              }

              const layers = style.layers || [];
              // Find the first symbol layer to insert buildings before labels
              const firstSymbolId = layers.find((layer: { type: string }) => layer.type === 'symbol')?.id;
              
              map.addLayer(
                {
                  id: '3d-buildings',
                  source: sourceName,
                  'source-layer': sourceLayer,
                  filter: ['all', ['==', 'extrude', 'true']],
                  type: 'fill-extrusion',
                  minzoom: 14,
                  paint: {
                    'fill-extrusion-color': [
                      'interpolate',
                      ['linear'],
                      ['get', 'height'],
                      0, '#e8e8e8',
                      50, '#d4d4d4',
                      100, '#c0c0c0'
                    ],
                    'fill-extrusion-height': [
                      'interpolate',
                      ['linear'],
                      ['zoom'],
                      14,
                      0,
                      14.5,
                      ['get', 'height']
                    ],
                    'fill-extrusion-base': [
                      'interpolate',
                      ['linear'],
                      ['zoom'],
                      14,
                      0,
                      14.5,
                      ['get', 'min_height']
                    ],
                    'fill-extrusion-opacity': 0.7
                  }
                },
                firstSymbolId
              );
              console.log('✓ 3D buildings layer added successfully');
            } catch (error) {
              console.error('Error adding 3D buildings layer:', error);
            }
          };

          // Wait for style to fully load before adding buildings
          if (map.isStyleLoaded()) {
            add3DBuildings();
          } else {
            map.once('styledata', () => {
              setTimeout(add3DBuildings, 100);
            });
          }
        }}
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
      
      {/* Right Sidebar - COMMENTED OUT */}
      {/*
      <SlidingSidebar 
        position="right" 
        mapRef={mapRef.current}
        title="Main Dock Energy Grid"
      >
        <div className="p-4 space-y-4">
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-4 rounded-lg border border-blue-200 dark:border-blue-700">
            <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-300 mb-2">Energy Monitoring Status</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Real-time monitoring of the main dock energy grid with three-phase power analysis
            </p>
            
            {energyData.length > 0 && (() => {
              const latestData = energyData[energyData.length - 1];
              const totalPower = (latestData.L1?.P || 0) + (latestData.L2?.P || 0) + (latestData.L3?.P || 0);
              
              return (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-600">
                      <div className="text-xs text-gray-500 dark:text-gray-400">Total Power</div>
                      <div className="text-lg font-bold text-gray-900 dark:text-gray-100">{Math.round(totalPower)} W</div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-600">
                      <div className="text-xs text-gray-500 dark:text-gray-400">Total Consumption</div>
                      <div className="text-lg font-bold text-gray-900 dark:text-gray-100">{Math.round(latestData.measure_cons)} W</div>
                    </div>
                  </div>
                  
                  <div className="bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-600">
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Three-Phase Analysis</div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          <div className="w-3 h-3 bg-red-500 rounded mr-2"></div>
                          <span className="text-xs text-gray-600 dark:text-gray-400">L1 Phase</span>
                        </div>
                        <div className="text-sm font-semibold">{Math.round(latestData.L1?.P || 0)} W</div>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          <div className="w-3 h-3 bg-green-500 rounded mr-2"></div>
                          <span className="text-xs text-gray-600 dark:text-gray-400">L2 Phase</span>
                        </div>
                        <div className="text-sm font-semibold">{Math.round(latestData.L2?.P || 0)} W</div>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          <div className="w-3 h-3 bg-blue-500 rounded mr-2"></div>
                          <span className="text-xs text-gray-600 dark:text-gray-400">L3 Phase</span>
                        </div>
                        <div className="text-sm font-semibold">{Math.round(latestData.L3?.P || 0)} W</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-600">
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Grid Status</div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Frequency:</span>
                        <div className="font-semibold">{(latestData.L1_frequency || 0).toFixed(1)} Hz</div>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Load Balance:</span>
                        <div className="font-semibold text-green-600 dark:text-green-400">
                          {Math.abs(Math.max(latestData.L1?.P || 0, latestData.L2?.P || 0, latestData.L3?.P || 0) - 
                            Math.min(latestData.L1?.P || 0, latestData.L2?.P || 0, latestData.L3?.P || 0)) < 500 ? 'Balanced' : 'Unbalanced'}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Last updated: {new Date(latestData.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              );
            })()}
          </div>
          
          {simulationsData && simulationsData.success && (
            <div className="bg-gradient-to-r from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 p-4 rounded-lg border border-amber-200 dark:border-amber-700">
              <h3 className="text-lg font-semibold text-amber-800 dark:text-amber-300 mb-2">Vessels at Port</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Currently showing {stationaryVessels.length} of {simulationsData.simulations.length} vessel{simulationsData.simulations.length !== 1 ? 's' : ''} at port
                {simulationsData.simulations.length > VESSEL_DOCKING_POSITIONS.length && (
                  <span className="block text-amber-600 dark:text-amber-400 mt-1">
                    (Port can only accommodate {VESSEL_DOCKING_POSITIONS.length} vessels at once)
                  </span>
                )}
              </p>
              <ul className="space-y-2">
                {stationaryVessels.map((vessel) => (
                  <li key={vessel.id} className="p-3 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600">
                    <p className="font-medium text-gray-900 dark:text-gray-100">{vessel.name}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Docked at: {vessel.dockName || 'Port'}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Model: {vessel.model ? vessel.model.split('/').pop()?.replace('.gltf', '') || 'Unknown' : 'Default'}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Energy Distribution Network</h4>
            <div className="space-y-2 text-xs">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-yellow-400 rounded mr-2"></div>
                <span className="text-gray-600 dark:text-gray-400">Power Distribution Center</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-blue-500 rounded mr-2"></div>
                <span className="text-gray-600 dark:text-gray-400">Main Dock Energy Grid</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-orange-400 rounded mr-3"></div>
                <span className="text-gray-600 dark:text-gray-400">Port Crane System</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-400 rounded mr-3"></div>
                <span className="text-gray-600 dark:text-gray-400">Shore Power Connection</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-yellow-300 rounded mr-3"></div>
                <span className="text-gray-600 dark:text-gray-400">Port Lighting Grid</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-400 rounded mr-3"></div>
                <span className="text-gray-600 dark:text-gray-400">Administrative Buildings</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-purple-400 rounded mr-3"></div>
                <span className="text-gray-600 dark:text-gray-400">Fuel Station Systems</span>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-300 dark:border-gray-600">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Energy flows from the distribution center to {PORT_DESTINATIONS.length} different port systems. 
                Particle speed and intensity indicate power consumption levels.
              </p>
            </div>
          </div>
        </div>
      </SlidingSidebar>
      */}

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