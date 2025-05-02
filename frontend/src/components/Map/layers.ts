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
  dockName?: string;
  model: string;
}

/**
 * Create layers for power visualization (columns, power lines, etc)
 */
export const createPowerLayers = (latestData: EnergyData, animationTime: number) => {
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
  
  // Power distribution center marker
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
  
  // Animated power lines
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

  // Animated particles along power lines
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
  
  // Center label
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
  
  return {
    columns,
    markers,
    centerMarker,
    powerLines,
    particles,
    labels,
    centerLabel
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
  return stationaryVessels.map((vessel, index) => {
    try {
      // Check if this vessel is the selected one to apply visual effects
      const isSelected = selectedVesselId === vessel.id;
      
      return new ScenegraphLayer({
        id: `vessel-${index}`,
        data: [vessel],
        scenegraph: vessel.model || DEFAULT_BOAT_MODEL,
        // Increase size slightly if selected for emphasis
        sizeScale: isSelected ? (vessel.scale || 0.18) * 1.2 : vessel.scale || 0.18,
        _lighting: 'pbr',
        getPosition: d => d.position,
        getOrientation: d => [0, d.rotation, 90],
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
  if (!selectedVessel) return [];
  
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
      getPosition: () => selectedVessel.position,
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
      getPosition: () => [selectedVessel.position[0], selectedVessel.position[1], -5], // Start below the vessel
      getElevation: 500, // Tall vertical column
      getFillColor: [0, 150, 255, 100 + 50 * Math.sin(animationTime * Math.PI * 2)], // Pulsing blue
      updateTriggers: {
        getFillColor: [animationTime]
      }
    })
  ];
}; 