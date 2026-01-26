/* eslint-disable @typescript-eslint/no-unused-vars */
import { ColumnLayer, ScatterplotLayer, TextLayer, ArcLayer } from '@deck.gl/layers';
import { ScenegraphLayer } from '@deck.gl/mesh-layers';
import { EnergyData } from '@/services/EnergyDataService';
import { PORT_CENTER, PORT_DESTINATIONS, PORT_LOCATIONS, DEFAULT_BOAT_MODEL } from './constants';

// Types for vessel data
export interface StationaryVessel {
  id: string;
  name: string;
  position: [number, number, number];
  rotation: number;
  scale?: number;
  arrivalTime?: string;
  departureTime?: string;
  dockName?: string;
  model: string;
}

/**
 * Create layers for power visualization (columns, power lines, etc)
 */
export const createPowerLayers = (latestData: EnergyData, animationTime: number) => {
  // Since all energy data comes from the main dock, we'll show the total power there
  const mainDockLocation = PORT_LOCATIONS[0]; // Only main dock exists now
  const totalPower = (latestData?.L1?.P || 0) + (latestData?.L2?.P || 0) + (latestData?.L3?.P || 0);
  
  // Column layer to show total power consumption at main dock
  const columns = new ColumnLayer({
    id: 'power-columns',
    data: [{
      ...mainDockLocation,
      power: totalPower,
      L1Power: latestData?.L1?.P || 0,
      L2Power: latestData?.L2?.P || 0,
      L3Power: latestData?.L3?.P || 0
    }],
    diskResolution: 12,
    radius: 15, // Larger radius for better visibility
    extruded: true,
    pickable: true,
    elevationScale: 0.1,
    getPosition: d => [d.longitude, d.latitude, d.elevation],
    getFillColor: d => {
      // More vibrant colors for better visibility
      const normalizedPower = d.power / 30000;
      return [
        255 * Math.min(1, normalizedPower * 1.2), 
        50 + 150 * (1 - normalizedPower * 0.5),
        255 * (1 - normalizedPower * 0.8), 
        240 // Higher opacity
      ];
    },
    getElevation: d => Math.max(50, d.power * 0.01), // Minimum height for visibility
    updateTriggers: {
      getFillColor: [latestData],
      getElevation: [latestData]
    }
  });
  
  // Enhanced main dock marker with energy grid visualization
  const markers = new ScatterplotLayer({
    id: 'main-dock-marker',
    data: [{
      ...mainDockLocation,
      totalPower: totalPower
    }],
    pickable: true,
    opacity: 0.95,
    stroked: true,
    filled: true,
    radiusScale: 10,
    radiusMinPixels: 12,
    radiusMaxPixels: 25,
    lineWidthMinPixels: 3,
    getPosition: d => [d.longitude, d.latitude, 0],
    getRadius: d => 8 + (d.totalPower / 3000), // More responsive sizing
    getFillColor: [0, 200, 255, 240],
    getLineColor: [255, 200, 0, 255]
  });
  
  // Infrastructure markers for energy consuming systems
  const infrastructureMarkers = new ScatterplotLayer({
    id: 'infrastructure-markers',
    data: PORT_DESTINATIONS.slice(1), // Skip main dock as it's already shown
    pickable: true,
    opacity: 0.8,
    stroked: true,
    filled: true,
    radiusScale: 6,
    radiusMinPixels: 6,
    radiusMaxPixels: 15,
    lineWidthMinPixels: 2,
    getPosition: d => [d.longitude, d.latitude, 0],
    getRadius: d => {
      // Different sizes based on system type
      if (d.id.includes('crane')) return 8;
      if (d.id.includes('shore-power')) return 7;
      if (d.id.includes('lighting')) return 5;
      return 6;
    },
    getFillColor: d => {
      // Different colors for different infrastructure types
      if (d.id.includes('crane')) return [255, 140, 0, 200]; // Orange for cranes
      if (d.id.includes('shore-power')) return [0, 255, 100, 200]; // Green for shore power
      if (d.id.includes('lighting')) return [255, 255, 100, 200]; // Yellow for lighting
      if (d.id.includes('administrative')) return [100, 150, 255, 200]; // Blue for admin
      return [200, 100, 255, 200]; // Purple for others
    },
    getLineColor: [255, 255, 255, 255]
  });
  
  // Power distribution center marker (enhanced)
  const centerMarker = new ScatterplotLayer({
    id: 'center-marker',
    data: [PORT_CENTER],
    pickable: true,
    opacity: 1.0,
    stroked: true,
    filled: true,
    radiusScale: 15,
    radiusMinPixels: 15,
    radiusMaxPixels: 30,
    lineWidthMinPixels: 4,
    getPosition: d => [d.longitude, d.latitude, 0],
    getRadius: 12,
    getFillColor: [255, 215, 0, 255], // Bright gold
    getLineColor: [255, 100, 0, 255] // Orange border
  });
  
  // Create dynamic power line data for energy distribution network
  const powerLineData = PORT_DESTINATIONS.map((destination, index) => {
    // Simulate different power consumption for different systems
    let systemPower;
    const basePhase = index % 3;
    const phasePower = basePhase === 0 ? (latestData?.L1?.P || 0) : 
                      basePhase === 1 ? (latestData?.L2?.P || 0) : 
                      (latestData?.L3?.P || 0);
    
    // Different power distribution based on system type
    if (destination.id.includes('crane')) {
      systemPower = phasePower * 0.4; // Cranes use lots of power
    } else if (destination.id.includes('shore-power')) {
      systemPower = phasePower * 0.3; // Shore power for ships
    } else if (destination.id.includes('lighting')) {
      systemPower = phasePower * 0.1; // Lighting uses less
    } else if (destination.id.includes('administrative')) {
      systemPower = phasePower * 0.15; // Office buildings
    } else {
      systemPower = phasePower * 0.2; // Other systems
    }
    
    const normalizedPower = Math.min(1, systemPower / 10000);
    
    return {
      source: [PORT_CENTER.longitude, PORT_CENTER.latitude],
      target: [destination.longitude, destination.latitude],
      power: systemPower,
      normalizedPower,
      name: destination.name,
      id: destination.id,
      systemType: destination.id.split('-')[0]
    };
  });
  
  // Dynamic energy distribution lines
  const powerLines = new ArcLayer({
    id: 'power-distribution-lines',
    data: powerLineData,
    pickable: true,
    getSourceColor: [255, 215, 0, 255], // Bright gold at source
    getTargetColor: d => {
      // Different colors based on system type and power level
      const intensity = Math.max(0.3, d.normalizedPower);
      if (d.systemType === 'crane') return [255, 140, 0, 200 + 55 * intensity];
      if (d.systemType === 'shore') return [0, 255, 100, 200 + 55 * intensity];
      if (d.systemType === 'lighting') return [255, 255, 100, 200 + 55 * intensity];
      if (d.systemType === 'administrative') return [100, 150, 255, 200 + 55 * intensity];
      return [200, 100, 255, 200 + 55 * intensity];
    },
    getWidth: d => Math.max(2, 2 + d.normalizedPower * 6), // Minimum width for visibility
    getTilt: d => 10 + d.normalizedPower * 20,
    getHeight: d => 0.2 + d.normalizedPower * 0.6,
    greatCircle: false,
    widthUnits: 'pixels',
    getSourcePosition: d => d.source,
    getTargetPosition: d => d.target,
    updateTriggers: {
      getSourceColor: [latestData],
      getTargetColor: [latestData],
      getWidth: [latestData]
    }
  });

  // Enhanced energy flow particles - much more visible and dynamic
  const particles = new ScatterplotLayer({
    id: 'energy-flow-particles',
    data: powerLineData.map(line => {
      const [srcLng, srcLat] = line.source;
      const [tgtLng, tgtLat] = line.target;
      
      // More particles per line for better visibility
      return Array.from({ length: 12 }).map((_, i) => {
        const particleOffset = (animationTime * 0.6 + i * 0.083) % 1;
        const speed = 0.5 + line.normalizedPower * 0.5; // Speed based on power
        const adjustedOffset = (animationTime * speed + i * 0.083) % 1;
        
        return {
          position: [
            srcLng + (tgtLng - srcLng) * adjustedOffset,
            srcLat + (tgtLat - srcLat) * adjustedOffset
          ],
          power: line.power,
          normalizedPower: line.normalizedPower,
          systemType: line.systemType,
          particleIndex: i
        };
      });
    }).flat(),
    pickable: false,
    opacity: 0.9,
    stroked: true,
    filled: true,
    radiusScale: 6, // Larger particles
    radiusMinPixels: 3,
    radiusMaxPixels: 10,
    lineWidthMinPixels: 1,
    getPosition: d => d.position,
    getRadius: d => 2 + d.normalizedPower * 4,
    getFillColor: d => {
      // System-specific colors with pulsing effect
      const pulse = 200 + 55 * Math.sin((animationTime * 2 + d.particleIndex * 0.5) * Math.PI);
      
      if (d.systemType === 'crane') return [255, 140, 0, pulse];
      if (d.systemType === 'shore') return [0, 255, 100, pulse];
      if (d.systemType === 'lighting') return [255, 255, 100, pulse];
      if (d.systemType === 'administrative') return [100, 150, 255, pulse];
      if (d.systemType === 'main') return [255, 50, 50, pulse]; // Red for main dock
      return [200, 100, 255, pulse];
    },
    getLineColor: [255, 255, 255, 150],
    updateTriggers: {
      getPosition: [animationTime],
      getFillColor: [animationTime, latestData],
      getRadius: [latestData]
    }
  });
  
  // Labels removed - sensor data now shown in dedicated bottom-left panel
  // Keeping the code commented out for reference if needed in the future
  /*
  const labels = new TextLayer({
    id: 'main-dock-label',
    data: [{
      ...mainDockLocation,
      text: `${mainDockLocation.name}\nL1: ${Math.round(latestData.L1.P || 0)}W | L2: ${Math.round(latestData.L2.P || 0)}W | L3: ${Math.round(latestData.L3.P || 0)}W`
    }],
    pickable: true,
    getPosition: d => [d.longitude, d.latitude + 0.0008, d.elevation + 40],
    getText: d => d.text,
    getSize: 12,
    getAngle: 0,
    getTextAnchor: 'middle',
    getAlignmentBaseline: 'center',
    getPixelOffset: [0, -20],
    getColor: [255, 255, 255, 255],
    getBackgroundColor: [0, 0, 0, 200],
    background: true,
    backgroundPadding: [6, 3, 6, 3]
  });
  
  const infrastructureLabels = new TextLayer({
    id: 'infrastructure-labels',
    data: PORT_DESTINATIONS.slice(1),
    pickable: true,
    getPosition: d => [d.longitude, d.latitude, 25],
    getText: d => d.name.replace(' System', '').replace(' Grid', ''),
    getSize: 11,
    getAngle: 0,
    getTextAnchor: 'middle',
    getAlignmentBaseline: 'center',
    getPixelOffset: [0, -15],
    getColor: [255, 255, 255, 255],
    getBackgroundColor: [0, 0, 0, 180],
    background: true,
    backgroundPadding: [4, 2, 4, 2]
  });
  */
  
  return {
    columns,
    markers,
    infrastructureMarkers,
    centerMarker,
    powerLines,
    particles,
    // labels and infrastructureLabels removed - data now in MapSensorPanel
  };
};

/**
 * Create the animated boat layer
 */
export const createBoatLayer = (
  boatPosition: { longitude: number; latitude: number; elevation: number },
  boatRotation: number,
  boatVisible: boolean,
  modelPath: string = DEFAULT_BOAT_MODEL
) => {
  return new ScenegraphLayer({
    id: 'boat-model',
    data: [
      {
        position: [boatPosition.longitude, boatPosition.latitude, boatPosition.elevation]
      }
    ],
    scenegraph: modelPath,
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
};

/**
 * Create vessel layers for stationary vessels
 */
export const createVesselLayers = (
  stationaryVessels: StationaryVessel[], 
  selectedVesselId: string | null,
  onVesselClick: (vessel: StationaryVessel) => void
) => {
  // Filter out any null or invalid vessels
  const validVessels = stationaryVessels.filter(vessel => vessel && vessel.id && vessel.position);
  
  return validVessels.map((vessel, index) => {
    try {
      // Check if this vessel is the selected one to apply visual effects
      const isSelected = selectedVesselId === vessel.id;
      
      return new ScenegraphLayer({
        id: `vessel-${vessel.id || index}`,
        data: [vessel],
        scenegraph: vessel.model || DEFAULT_BOAT_MODEL,
        // Increase size slightly if selected for emphasis
        sizeScale: isSelected ? (vessel.scale || 0.18) * 1.2 : vessel.scale || 0.18,
        _lighting: 'pbr',
        getPosition: d => d.position,
        getOrientation: d => [0, d.rotation || 0, 90],
        pickable: true,
        onClick: (info) => {
          const clickedVessel = info.object;
          if (clickedVessel) {
            onVesselClick(clickedVessel);
          }
          return true; // Prevent event from bubbling up
        },
        getTooltip: (d: StationaryVessel) => 
          `${d.name}\nDocked at: ${d.dockName || 'Port'}\nClick for details`,
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
      console.error(`Error creating vessel layer ${vessel.id || index}:`, error);
      // Return a simple placeholder layer if the 3D model failed to load
      return new ScatterplotLayer({
        id: `vessel-${vessel.id || index}-placeholder`,
        data: [vessel],
        getPosition: d => d.position,
        getFillColor: [255, 0, 0],
        getRadius: 5,
        radiusScale: 10,
        pickable: true,
        getTooltip: (d: StationaryVessel) => 
          `${d.name}\nDocked at: ${d.dockName || 'Port'} (3D model failed to load)`
      });
    }
  });
};

/**
 * Create highlight layers for the selected vessel
 */
export const createHighlightLayers = (selectedVessel: StationaryVessel | null, animationTime: number) => {
  // Check if selectedVessel exists and has required properties
  if (!selectedVessel || !selectedVessel.position || !selectedVessel.id) return [];
  
  return [
    // Add a pulsing circle around the selected vessel
    new ScatterplotLayer({
      id: 'selected-vessel-highlight',
      data: [selectedVessel],
      pickable: false,
      stroked: true,
      filled: true,
      radiusScale: 8,
      radiusMinPixels: 30,
      radiusMaxPixels: 50,
      lineWidthMinPixels: 2,
      getPosition: (d) => d.position,
      getFillColor: [0, 100, 255, 50 + 40 * Math.sin(animationTime * Math.PI * 2)], // Pulsing blue
      getLineColor: [0, 150, 255, 150 + 100 * Math.sin(animationTime * Math.PI * 2)], // Pulsing border
      updateTriggers: {
        getFillColor: [animationTime],
        getLineColor: [animationTime],
      }
    }),
    // Add a vertical beam for easy spotting
    new ColumnLayer({
      id: 'selected-vessel-beam',
      data: [selectedVessel],
      diskResolution: 12,
      radius: 2,
      extruded: true,
      pickable: false,
      elevationScale: 1,
      getPosition: (d) => [d.position[0], d.position[1], -5], // Start below the vessel
      getElevation: 500, // Tall vertical column
      getFillColor: [0, 150, 255, 100 + 50 * Math.sin(animationTime * Math.PI * 2)], // Pulsing blue
      updateTriggers: {
        getFillColor: [animationTime]
      }
    })
  ];
}; 