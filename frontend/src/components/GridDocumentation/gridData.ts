import { Node, Edge, MarkerType } from 'reactflow';

// Node positions are calculated based on a grid layout
// The diagram flows from top (20kV grid) to bottom (loads)

export const gridNodes: Node[] = [
  // ============================================
  // LEVEL 0: Grid Connection (20kV Distribution)
  // ============================================
  {
    id: 'grid-20kv',
    type: 'grid',
    position: { x: 600, y: 0 },
    data: { label: '20kV', subtitle: 'Distribuição' },
  },

  // ============================================
  // LEVEL 1: Main Transformers and Emergency Gen
  // ============================================
  {
    id: 'q-ge',
    type: 'generator',
    position: { x: 50, y: 120 },
    data: { label: 'Q.GE', subtitle: 'Gerador Emergência' },
  },
  {
    id: 'q-demonstrador',
    type: 'mainPanel',
    position: { x: 550, y: 120 },
    data: { label: 'Q.DEMONSTRADOR', subtitle: 'Demonstrator Panel' },
  },

  // ============================================
  // LEVEL 2: Vessel Connections & Main Supply
  // ============================================
  {
    id: 'vessel-main',
    type: 'vessel',
    position: { x: 550, y: 220 },
    data: { label: 'VESSO', subtitle: 'Vessel Connection' },
  },
  {
    id: 'q-vessel-p',
    type: 'panel',
    position: { x: 700, y: 220 },
    data: { label: 'Q.Vessel P' },
  },
  {
    id: 'q-sat',
    type: 'panel',
    position: { x: 820, y: 220 },
    data: { label: 'Q.SAT' },
  },
  {
    id: 'q-lig-ac',
    type: 'panel',
    position: { x: 940, y: 220 },
    data: { label: 'Q.Lig.AC', subtitle: 'AC Connection' },
  },

  // ============================================
  // LEVEL 3: Main Distribution Panels
  // ============================================
  {
    id: 'q-geral-alim',
    type: 'mainPanel',
    position: { x: 200, y: 320 },
    data: { label: 'Q.Geral', subtitle: 'Alimentação' },
  },
  {
    id: 'conv-ac-dc-1',
    type: 'converter',
    position: { x: 350, y: 310 },
    data: { label: 'Conv. 1', type: 'AC/DC' },
  },
  {
    id: 'q-fv',
    type: 'pv',
    position: { x: 480, y: 310 },
    data: { label: 'Q.FV', subtitle: 'Fotovoltaico' },
  },
  {
    id: 'q-qged-e',
    type: 'mainPanel',
    position: { x: 600, y: 320 },
    data: { label: 'Q.QGED(E)', subtitle: 'Emergency', hasLeftHandle: true, hasRightHandle: true },
  },
  {
    id: 'banco-compens',
    type: 'capacitor',
    position: { x: 750, y: 340 },
    data: { label: 'Banco Compens.' },
  },
  {
    id: 'q-qged-n',
    type: 'mainPanel',
    position: { x: 900, y: 320 },
    data: { label: 'Q.QGED(N)', subtitle: 'Normal', hasLeftHandle: true },
  },

  // ============================================
  // LEVEL 4: Secondary Distribution & Converters
  // ============================================
  {
    id: 'q-bat',
    type: 'battery',
    position: { x: 80, y: 450 },
    data: { label: 'Q.BAT' },
  },
  {
    id: 'conv-dc-dc-1',
    type: 'converter',
    position: { x: 200, y: 440 },
    data: { label: 'Conv. BAT', type: 'DC/DC' },
  },
  {
    id: 'q-gest',
    type: 'panel',
    position: { x: 310, y: 450 },
    data: { label: 'Q.GEst', subtitle: 'Estação' },
  },
  {
    id: 'bus-dc-main',
    type: 'busBar',
    position: { x: 500, y: 460 },
    data: { label: 'Barramento DC', width: 'w-80', color: 'bg-blue-600' },
  },

  // ============================================
  // LEVEL 5: Shore Power Converters
  // ============================================
  {
    id: 'conv-po-1',
    type: 'converter',
    position: { x: 380, y: 530 },
    data: { label: 'D1', type: 'DC/AC' },
  },
  {
    id: 'conv-po-2',
    type: 'converter',
    position: { x: 460, y: 530 },
    data: { label: 'D2', type: 'DC/AC' },
  },
  {
    id: 'conv-po-3',
    type: 'converter',
    position: { x: 540, y: 530 },
    data: { label: 'D3', type: 'DC/AC' },
  },
  {
    id: 'conv-po-4',
    type: 'converter',
    position: { x: 620, y: 530 },
    data: { label: 'D4', type: 'DC/AC' },
  },
  {
    id: 'conv-po-5',
    type: 'converter',
    position: { x: 700, y: 530 },
    data: { label: 'D5', type: 'DC/AC' },
  },

  // ============================================
  // LEVEL 6: Shore Power Outlets
  // ============================================
  {
    id: 'q-po1',
    type: 'shoreOutlet',
    position: { x: 385, y: 620 },
    data: { label: 'Q.PO1' },
  },
  {
    id: 'q-po2',
    type: 'shoreOutlet',
    position: { x: 465, y: 620 },
    data: { label: 'Q.PO2' },
  },
  {
    id: 'q-po3',
    type: 'shoreOutlet',
    position: { x: 545, y: 620 },
    data: { label: 'Q.PO3' },
  },
  {
    id: 'q-po4',
    type: 'shoreOutlet',
    position: { x: 625, y: 620 },
    data: { label: 'Q.PO4' },
  },
  {
    id: 'q-po5',
    type: 'shoreOutlet',
    position: { x: 705, y: 620 },
    data: { label: 'Q.PO5' },
  },

  // ============================================
  // LEVEL 5-6: Refrigeration Section (Right Side)
  // ============================================
  {
    id: 'conv-r1',
    type: 'converter',
    position: { x: 820, y: 530 },
    data: { label: 'DR1', type: 'DC/AC' },
  },
  {
    id: 'conv-r2',
    type: 'converter',
    position: { x: 900, y: 530 },
    data: { label: 'DR2', type: 'DC/AC' },
  },
  {
    id: 'conv-r3',
    type: 'converter',
    position: { x: 980, y: 530 },
    data: { label: 'DR3', type: 'DC/AC' },
  },
  {
    id: 'conv-r4',
    type: 'converter',
    position: { x: 1060, y: 530 },
    data: { label: 'DR4', type: 'DC/AC' },
  },
  {
    id: 'q-r11',
    type: 'service',
    position: { x: 820, y: 620 },
    data: { label: 'Q.R1.1' },
  },
  {
    id: 'q-r12',
    type: 'service',
    position: { x: 900, y: 620 },
    data: { label: 'Q.R1.2' },
  },
  {
    id: 'q-r13',
    type: 'service',
    position: { x: 980, y: 620 },
    data: { label: 'Q.R1.3' },
  },
  {
    id: 'q-r14',
    type: 'service',
    position: { x: 1060, y: 620 },
    data: { label: 'Q.R1.4' },
  },

  // ============================================
  // LEVEL 7: Service Panels (Left Section)
  // ============================================
  {
    id: 'q-serv',
    type: 'panel',
    position: { x: 50, y: 580 },
    data: { label: 'Q.SERV', subtitle: 'Serviços' },
  },
  {
    id: 'q-sensores',
    type: 'service',
    position: { x: 50, y: 680 },
    data: { label: 'Q.SENSORES', hasOutput: true },
  },
  {
    id: 'q-bombas',
    type: 'load',
    position: { x: 130, y: 680 },
    data: { label: 'Q.BOMBAS', icon: '💧', color: 'bg-gradient-to-b from-blue-500 to-blue-600', borderColor: 'border-blue-700' },
  },
  {
    id: 'q-essi',
    type: 'service',
    position: { x: 210, y: 680 },
    data: { label: 'Q.ESSI' },
  },

  // ============================================
  // LEVEL 7-8: HVAC & Chiller Section
  // ============================================
  {
    id: 'chiller-1',
    type: 'load',
    position: { x: 300, y: 720 },
    data: { label: 'CHILLER', icon: '❄️', color: 'bg-gradient-to-b from-cyan-500 to-cyan-600', borderColor: 'border-cyan-700' },
  },
  {
    id: 'q-avac',
    type: 'load',
    position: { x: 400, y: 720 },
    data: { label: 'Q.AVAC', icon: '🌀', color: 'bg-gradient-to-b from-teal-500 to-teal-600', borderColor: 'border-teal-700' },
  },
  {
    id: 'q-avac-o2',
    type: 'load',
    position: { x: 500, y: 720 },
    data: { label: 'Q.AVAC O.2', icon: '🌀', color: 'bg-gradient-to-b from-teal-500 to-teal-600', borderColor: 'border-teal-700' },
  },
  {
    id: 'q-fwpg',
    type: 'service',
    position: { x: 600, y: 720 },
    data: { label: 'Q.FWPG' },
  },
  {
    id: 'q-rop',
    type: 'service',
    position: { x: 700, y: 720 },
    data: { label: 'Q.ROP' },
  },
  {
    id: 'q-avac-2',
    type: 'load',
    position: { x: 800, y: 720 },
    data: { label: 'Q.AVAC 2', icon: '🌀', color: 'bg-gradient-to-b from-teal-500 to-teal-600', borderColor: 'border-teal-700' },
  },
  {
    id: 'chiller-2',
    type: 'load',
    position: { x: 900, y: 720 },
    data: { label: 'CHILLER', icon: '❄️', color: 'bg-gradient-to-b from-cyan-500 to-cyan-600', borderColor: 'border-cyan-700' },
  },
];

// Edge styling configuration
const defaultEdgeStyle = {
  stroke: '#64748b',
  strokeWidth: 2,
};

const dcEdgeStyle = {
  stroke: '#2563eb',
  strokeWidth: 3,
};

const acEdgeStyle = {
  stroke: '#16a34a',
  strokeWidth: 2,
};

const emergencyEdgeStyle = {
  stroke: '#dc2626',
  strokeWidth: 2,
  strokeDasharray: '5,5',
};

export const gridEdges: Edge[] = [
  // ============================================
  // Grid to Main Distribution
  // ============================================
  {
    id: 'e-grid-demo',
    source: 'grid-20kv',
    target: 'q-demonstrador',
    type: 'smoothstep',
    style: defaultEdgeStyle,
    markerEnd: { type: MarkerType.ArrowClosed, color: '#64748b' },
  },
  {
    id: 'e-grid-qged-e',
    source: 'grid-20kv',
    target: 'q-qged-e',
    type: 'smoothstep',
    style: defaultEdgeStyle,
    markerEnd: { type: MarkerType.ArrowClosed, color: '#64748b' },
  },
  {
    id: 'e-grid-qged-n',
    source: 'grid-20kv',
    target: 'q-qged-n',
    type: 'smoothstep',
    style: defaultEdgeStyle,
    markerEnd: { type: MarkerType.ArrowClosed, color: '#64748b' },
  },

  // ============================================
  // Emergency Generator Connections
  // ============================================
  {
    id: 'e-ge-qged-e',
    source: 'q-ge',
    target: 'q-qged-e',
    sourceHandle: 'default',
    targetHandle: 'left',
    type: 'smoothstep',
    style: emergencyEdgeStyle,
    animated: true,
    label: 'Emergency',
    labelStyle: { fontSize: 10, fill: '#dc2626' },
    labelBgStyle: { fill: '#fef2f2', fillOpacity: 0.9 },
  },

  // ============================================
  // Demonstrator to Vessels
  // ============================================
  {
    id: 'e-demo-vessel',
    source: 'q-demonstrador',
    target: 'vessel-main',
    type: 'smoothstep',
    style: defaultEdgeStyle,
  },
  {
    id: 'e-demo-vesselp',
    source: 'q-demonstrador',
    target: 'q-vessel-p',
    type: 'smoothstep',
    style: defaultEdgeStyle,
  },
  {
    id: 'e-demo-sat',
    source: 'q-demonstrador',
    target: 'q-sat',
    type: 'smoothstep',
    style: defaultEdgeStyle,
  },
  {
    id: 'e-demo-ligac',
    source: 'q-demonstrador',
    target: 'q-lig-ac',
    type: 'smoothstep',
    style: defaultEdgeStyle,
  },

  // ============================================
  // Main Panel Connections
  // ============================================
  {
    id: 'e-qged-e-geral',
    source: 'q-qged-e',
    target: 'q-geral-alim',
    sourceHandle: 'left',
    type: 'smoothstep',
    style: defaultEdgeStyle,
  },
  {
    id: 'e-geral-conv1',
    source: 'q-geral-alim',
    target: 'conv-ac-dc-1',
    type: 'smoothstep',
    style: acEdgeStyle,
    label: 'AC',
    labelStyle: { fontSize: 9, fill: '#16a34a' },
    labelBgStyle: { fill: '#f0fdf4', fillOpacity: 0.9 },
  },
  {
    id: 'e-fv-bus',
    source: 'q-fv',
    target: 'bus-dc-main',
    type: 'smoothstep',
    style: dcEdgeStyle,
    label: 'DC',
    labelStyle: { fontSize: 9, fill: '#2563eb' },
    labelBgStyle: { fill: '#eff6ff', fillOpacity: 0.9 },
  },
  {
    id: 'e-qged-e-bus',
    source: 'q-qged-e',
    target: 'bus-dc-main',
    type: 'smoothstep',
    style: defaultEdgeStyle,
  },
  {
    id: 'e-qged-e-banco',
    source: 'q-qged-e',
    target: 'banco-compens',
    sourceHandle: 'right',
    type: 'smoothstep',
    style: defaultEdgeStyle,
  },
  {
    id: 'e-qged-n-bus',
    source: 'q-qged-n',
    target: 'bus-dc-main',
    type: 'smoothstep',
    style: defaultEdgeStyle,
  },

  // ============================================
  // Battery System
  // ============================================
  {
    id: 'e-bat-conv',
    source: 'q-bat',
    target: 'conv-dc-dc-1',
    type: 'smoothstep',
    style: dcEdgeStyle,
  },
  {
    id: 'e-conv-gest',
    source: 'conv-dc-dc-1',
    target: 'q-gest',
    type: 'smoothstep',
    style: dcEdgeStyle,
  },
  {
    id: 'e-gest-bus',
    source: 'q-gest',
    target: 'bus-dc-main',
    type: 'smoothstep',
    style: dcEdgeStyle,
  },
  {
    id: 'e-conv1-bus',
    source: 'conv-ac-dc-1',
    target: 'bus-dc-main',
    type: 'smoothstep',
    style: dcEdgeStyle,
  },

  // ============================================
  // Shore Power Converters to Outlets
  // ============================================
  {
    id: 'e-bus-conv-po1',
    source: 'bus-dc-main',
    target: 'conv-po-1',
    type: 'smoothstep',
    style: dcEdgeStyle,
  },
  {
    id: 'e-bus-conv-po2',
    source: 'bus-dc-main',
    target: 'conv-po-2',
    type: 'smoothstep',
    style: dcEdgeStyle,
  },
  {
    id: 'e-bus-conv-po3',
    source: 'bus-dc-main',
    target: 'conv-po-3',
    type: 'smoothstep',
    style: dcEdgeStyle,
  },
  {
    id: 'e-bus-conv-po4',
    source: 'bus-dc-main',
    target: 'conv-po-4',
    type: 'smoothstep',
    style: dcEdgeStyle,
  },
  {
    id: 'e-bus-conv-po5',
    source: 'bus-dc-main',
    target: 'conv-po-5',
    type: 'smoothstep',
    style: dcEdgeStyle,
  },
  {
    id: 'e-conv-po1-outlet',
    source: 'conv-po-1',
    target: 'q-po1',
    type: 'smoothstep',
    style: acEdgeStyle,
  },
  {
    id: 'e-conv-po2-outlet',
    source: 'conv-po-2',
    target: 'q-po2',
    type: 'smoothstep',
    style: acEdgeStyle,
  },
  {
    id: 'e-conv-po3-outlet',
    source: 'conv-po-3',
    target: 'q-po3',
    type: 'smoothstep',
    style: acEdgeStyle,
  },
  {
    id: 'e-conv-po4-outlet',
    source: 'conv-po-4',
    target: 'q-po4',
    type: 'smoothstep',
    style: acEdgeStyle,
  },
  {
    id: 'e-conv-po5-outlet',
    source: 'conv-po-5',
    target: 'q-po5',
    type: 'smoothstep',
    style: acEdgeStyle,
  },

  // ============================================
  // Refrigeration Section
  // ============================================
  {
    id: 'e-bus-conv-r1',
    source: 'bus-dc-main',
    target: 'conv-r1',
    type: 'smoothstep',
    style: dcEdgeStyle,
  },
  {
    id: 'e-bus-conv-r2',
    source: 'bus-dc-main',
    target: 'conv-r2',
    type: 'smoothstep',
    style: dcEdgeStyle,
  },
  {
    id: 'e-bus-conv-r3',
    source: 'bus-dc-main',
    target: 'conv-r3',
    type: 'smoothstep',
    style: dcEdgeStyle,
  },
  {
    id: 'e-bus-conv-r4',
    source: 'bus-dc-main',
    target: 'conv-r4',
    type: 'smoothstep',
    style: dcEdgeStyle,
  },
  {
    id: 'e-conv-r1-panel',
    source: 'conv-r1',
    target: 'q-r11',
    type: 'smoothstep',
    style: acEdgeStyle,
  },
  {
    id: 'e-conv-r2-panel',
    source: 'conv-r2',
    target: 'q-r12',
    type: 'smoothstep',
    style: acEdgeStyle,
  },
  {
    id: 'e-conv-r3-panel',
    source: 'conv-r3',
    target: 'q-r13',
    type: 'smoothstep',
    style: acEdgeStyle,
  },
  {
    id: 'e-conv-r4-panel',
    source: 'conv-r4',
    target: 'q-r14',
    type: 'smoothstep',
    style: acEdgeStyle,
  },

  // ============================================
  // Service Panels
  // ============================================
  {
    id: 'e-qged-e-serv',
    source: 'q-qged-e',
    target: 'q-serv',
    type: 'smoothstep',
    style: defaultEdgeStyle,
  },
  {
    id: 'e-serv-sensores',
    source: 'q-serv',
    target: 'q-sensores',
    type: 'smoothstep',
    style: defaultEdgeStyle,
  },
  {
    id: 'e-serv-bombas',
    source: 'q-serv',
    target: 'q-bombas',
    type: 'smoothstep',
    style: defaultEdgeStyle,
  },
  {
    id: 'e-serv-essi',
    source: 'q-serv',
    target: 'q-essi',
    type: 'smoothstep',
    style: defaultEdgeStyle,
  },

  // ============================================
  // HVAC & Chiller Connections
  // ============================================
  {
    id: 'e-bus-chiller1',
    source: 'bus-dc-main',
    target: 'chiller-1',
    type: 'smoothstep',
    style: dcEdgeStyle,
  },
  {
    id: 'e-bus-avac',
    source: 'bus-dc-main',
    target: 'q-avac',
    type: 'smoothstep',
    style: dcEdgeStyle,
  },
  {
    id: 'e-bus-avac-o2',
    source: 'bus-dc-main',
    target: 'q-avac-o2',
    type: 'smoothstep',
    style: dcEdgeStyle,
  },
  {
    id: 'e-bus-fwpg',
    source: 'bus-dc-main',
    target: 'q-fwpg',
    type: 'smoothstep',
    style: dcEdgeStyle,
  },
  {
    id: 'e-bus-rop',
    source: 'bus-dc-main',
    target: 'q-rop',
    type: 'smoothstep',
    style: dcEdgeStyle,
  },
  {
    id: 'e-qged-n-avac2',
    source: 'q-qged-n',
    target: 'q-avac-2',
    type: 'smoothstep',
    style: defaultEdgeStyle,
  },
  {
    id: 'e-qged-n-chiller2',
    source: 'q-qged-n',
    target: 'chiller-2',
    type: 'smoothstep',
    style: defaultEdgeStyle,
  },
];

// Legend items for the diagram
export const legendItems = [
  { color: '#2563eb', label: 'DC Power Lines', type: 'solid' },
  { color: '#16a34a', label: 'AC Power Lines', type: 'solid' },
  { color: '#dc2626', label: 'Emergency Supply', type: 'dashed' },
  { color: '#64748b', label: 'Control/Other', type: 'solid' },
];

// Component descriptions for tooltips/documentation
export const componentDescriptions: Record<string, { name: string; description: string; specs?: string }> = {
  'grid-20kv': {
    name: '20kV Distribution',
    description: 'Main grid connection from the public distribution network',
    specs: '20kV Medium Voltage',
  },
  'q-ge': {
    name: 'Emergency Generator',
    description: 'Backup diesel generator for emergency power supply',
    specs: 'Diesel Generator',
  },
  'q-qged-e': {
    name: 'Main Panel (Emergency)',
    description: 'Main distribution panel for emergency circuits',
    specs: 'Emergency Distribution',
  },
  'q-qged-n': {
    name: 'Main Panel (Normal)',
    description: 'Main distribution panel for normal operation circuits',
    specs: 'Normal Distribution',
  },
  'q-fv': {
    name: 'Photovoltaic System',
    description: 'Solar PV generation system',
    specs: 'Renewable Energy Source',
  },
  'q-bat': {
    name: 'Battery Energy Storage',
    description: 'Battery storage system for energy buffering',
    specs: 'BESS System',
  },
  'q-po1': {
    name: 'Shore Power Outlet 1',
    description: 'Shore power connection point for vessels',
    specs: 'Cold Ironing Connection',
  },
  // Add more as needed...
};

