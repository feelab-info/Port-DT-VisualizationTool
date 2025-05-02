// Port map configuration constants

// Port center and destinations for power lines
export const PORT_CENTER = { longitude: -16.91026503370738, latitude: 32.64184038298506 };
export const PORT_DESTINATIONS = [
  { id: 'east', name: 'East Terminal', longitude: -16.907203153852876, latitude: 32.64186799317473 },
  { id: 'west', name: 'West Terminal', longitude: -16.915464898116372, latitude: 32.64102681507696 },
];

// Port locations for visualization (existing points)
export const PORT_LOCATIONS = [
  { id: 'main-dock', name: 'Main Dock', longitude: -16.910284, latitude: 32.641901, elevation: 0 },
  { id: 'terminal-1', name: 'Terminal 1', longitude: -16.915753, latitude: 32.641252, elevation: 0 },
  { id: 'terminal-2', name: 'Terminal 2', longitude: -16.914975, latitude: 32.643076, elevation: 0 },
];

// Define all available boat model paths
export const ALL_BOAT_MODELS = [
  '/models/standard/boat.gltf',     // Original boat
  //'/models/west/sceneWest.gltf',    // West model 
  //'/models/spirit/sceneSpirit.gltf' // Spirit model
];

// Start with just the simplest model to reduce memory usage
export const DEFAULT_BOAT_MODEL = ALL_BOAT_MODELS[0];

// Limit to only 3 vessels (port capacity)
export const MAX_VESSELS = 3;

// Define docking locations for stationary vessels - limit to only 3 positions
export const VESSEL_DOCKING_POSITIONS = [
  // Main dock
  {
    name: "Terminal 1",
    longitude: -16.913029,
    latitude: 32.641917,
    elevation: -5,
    rotation: 190,
    scale: 0.23  // Slightly smaller scale for memory efficiency
  },
  // East Terminal
  {
    name: "Terminal 2",
    longitude: -16.913820,
    latitude: 32.643247,
    elevation: -5,
    rotation: 215,
    scale: 0.23  // Slightly smaller scale for memory efficiency
  },
  {
    name: "Terminal 3",
    longitude: -16.90923641097217,
    latitude: 32.64237832255226,
    elevation: -5,
    rotation: 180,
    scale: 0.23  // Slightly smaller scale for memory efficiency
  },
];

// Boat path definition - route that boat will follow
export const BOAT_PATHS = [
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

// Initial map view state
export const INITIAL_VIEW_STATE = {
  latitude: 32.74, // Start with a wider view of Madeira island
  longitude: -16.95,
  zoom: 10, // Start zoomed out
  pitch: 0,  // Start with no tilt
  bearing: 0
};

// Port view after zoom animation
export const PORT_VIEW_STATE = {
  latitude: 32.64271,
  longitude: -16.90979,
  zoom: 16.4,
  pitch: 61.8,
  bearing: -53.1
};

// Animation settings
export const ANIMATION_DURATION = 100000; // 30 seconds for full path 