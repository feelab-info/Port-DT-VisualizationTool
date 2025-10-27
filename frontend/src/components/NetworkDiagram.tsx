'use client';

import React, { useMemo, useCallback } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';

interface TimestepData {
  timestamp: string;
  bus_id?: number;
  voltage?: number;
  power?: number;
  load?: number;
  [key: string]: string | number | boolean | object | undefined;
}

interface NetworkDiagramProps {
  timestepsData: TimestepData[];
  simulationTime: string;
}

// Color constants for consistent styling
const NODE_COLOR = '#3b82f6'; // Consistent blue color for all nodes
const EDGE_COLOR = '#6b7280'; // Consistent gray color for all edges

export default function NetworkDiagram({ timestepsData, simulationTime }: NetworkDiagramProps) {

  // Parse network data and create ReactFlow nodes and edges
  const { initialNodes, initialEdges, stats } = useMemo(() => {
    if (!timestepsData || timestepsData.length === 0) {
      return { initialNodes: [], initialEdges: [], stats: { avgVoltage: 0, totalBuses: 0, totalLines: 0 } };
    }

    console.log('NetworkDiagram: Processing', timestepsData.length, 'timestep entries');

    // Extract unique buses
    const busMap = new Map<number, TimestepData>();
    timestepsData.forEach(step => {
      if (step.bus_id !== undefined && !busMap.has(step.bus_id)) {
        busMap.set(step.bus_id, step);
      }
    });

    // Extract lines from any timestep
    const linesMap = new Map<string, { from: number; to: number; current: number; loading: number; losses: number }>();
    const sampleStep = timestepsData[0];

    if (sampleStep) {
      Object.keys(sampleStep).forEach(key => {
        const lineMatch = key.match(/^line (\d+) - (\d+): (.+)$/);
        if (lineMatch) {
          const from = parseInt(lineMatch[1]);
          const to = parseInt(lineMatch[2]);
          const property = lineMatch[3];
          const lineKey = `${from}-${to}`;

          if (!linesMap.has(lineKey)) {
            linesMap.set(lineKey, { from, to, current: 0, loading: 0, losses: 0 });
          }

          const line = linesMap.get(lineKey)!;
          const value = sampleStep[key];
          if (typeof value === 'number') {
            if (property === 'i_ka') line.current = value;
            else if (property === 'loading') line.loading = value;
            else if (property === 'pl_mw') line.losses = value;
          }
        }
      });
    }

    console.log('NetworkDiagram: Found', busMap.size, 'buses and', linesMap.size, 'lines');

    // Create nodes using hierarchical layout algorithm (Dagre-like positioning)
    const nodes: Node[] = [];
    const buses = Array.from(busMap.values()).sort((a, b) => (a.bus_id || 0) - (b.bus_id || 0));
    
    // Build adjacency for layout calculation
    const adjacency = new Map<number, number[]>();
    linesMap.forEach(line => {
      if (!adjacency.has(line.from)) adjacency.set(line.from, []);
      if (!adjacency.has(line.to)) adjacency.set(line.to, []);
      adjacency.get(line.from)!.push(line.to);
      adjacency.get(line.to)!.push(line.from);
    });

    // BFS to assign levels
    const levels: number[][] = [];
    const positioned = new Set<number>();
    const rootBus = buses[0];
    
    if (rootBus && rootBus.bus_id !== undefined) {
      const queue: Array<{ busId: number; level: number }> = [{ busId: rootBus.bus_id, level: 0 }];
      positioned.add(rootBus.bus_id);
      
      while (queue.length > 0) {
        const { busId, level } = queue.shift()!;
        
        if (!levels[level]) levels[level] = [];
        levels[level].push(busId);
        
        const neighbors = adjacency.get(busId) || [];
        neighbors.forEach(neighborId => {
          if (!positioned.has(neighborId)) {
            positioned.add(neighborId);
            queue.push({ busId: neighborId, level: level + 1 });
          }
        });
      }
    }

    // Position unconnected nodes
    buses.forEach(bus => {
      if (bus.bus_id !== undefined && !positioned.has(bus.bus_id)) {
        if (!levels[levels.length]) levels[levels.length] = [];
        levels[levels.length - 1].push(bus.bus_id);
      }
    });

    console.log('NetworkDiagram: Created', levels.length, 'levels');

    // Create ReactFlow nodes with calculated positions
    const nodeSpacing = 250;
    const levelSpacing = 200;
    
    levels.forEach((levelBuses, levelIdx) => {
      const levelWidth = (levelBuses.length - 1) * nodeSpacing;
      const startX = -levelWidth / 2;
      
      levelBuses.forEach((busId, busIdx) => {
        const busData = busMap.get(busId);
        if (!busData) return;
        
        const voltage = busData.voltage || 0;
        const load = busData.load || 0;
        
        nodes.push({
          id: `bus-${busId}`,
          data: { 
            label: (
              <div className="text-center">
                <div className="font-bold text-sm">Bus {busId}</div>
                <div className="text-xs text-gray-600 dark:text-gray-300">{voltage.toFixed(4)} pu</div>
                <div className="text-xs text-blue-600 dark:text-blue-400">{(load * 1000).toFixed(2)} kW</div>
              </div>
            ),
            busId,
            voltage,
            load
          },
          position: { x: startX + (busIdx * nodeSpacing), y: levelIdx * levelSpacing },
          type: 'default',
          style: {
            background: NODE_COLOR,
            color: '#ffffff',
            border: '2px solid #ffffff',
            borderRadius: '50%',
            width: 120,
            height: 120,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '11px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          },
          sourcePosition: Position.Bottom,
          targetPosition: Position.Top,
        });
      });
    });

    // Create ReactFlow edges
    const edges: Edge[] = [];
    linesMap.forEach((line, lineKey) => {
      const strokeWidth = Math.max(1, Math.min(5, line.loading * 10));

      edges.push({
        id: `line-${lineKey}`,
        source: `bus-${line.from}`,
        target: `bus-${line.to}`,
        type: 'smoothstep',
        animated: line.loading > 0.5,
        style: {
          stroke: EDGE_COLOR,
          strokeWidth: strokeWidth,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: EDGE_COLOR,
          width: 20,
          height: 20,
        },
        label: (
          <div className="bg-white dark:bg-gray-800 px-2 py-1 rounded shadow-sm border border-gray-300 dark:border-gray-600 text-xs">
            <div className="font-mono text-gray-700 dark:text-gray-300">{(line.current * 1000).toFixed(1)}A</div>
            <div className="font-mono text-orange-600 dark:text-orange-400">{(line.loading * 100).toFixed(1)}%</div>
            <div className="font-mono text-red-600 dark:text-red-400">{(line.losses * 1000).toFixed(2)}W</div>
          </div>
        ),
        labelStyle: { fill: '#000', fontWeight: 500 },
        labelBgStyle: { fill: 'transparent' },
      });
    });

    // Calculate statistics
    const avgVoltage = buses.reduce((sum, bus) => sum + (bus.voltage || 0), 0) / buses.length;

    return {
      initialNodes: nodes,
      initialEdges: edges,
      stats: {
        totalBuses: buses.length,
        totalLines: linesMap.size,
        avgVoltage
      }
    };
  }, [timestepsData]);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    console.log('Clicked bus:', node.data.busId, node.data);
  }, []);

  if (nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">No network data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 px-6 py-4 rounded-lg border border-purple-200 dark:border-purple-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Network Topology</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">DC Power Grid at {simulationTime}</p>
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Interactive grid visualization
          </div>
        </div>
      </div>

      {/* Network Diagram */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700" style={{ height: '700px' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          fitView
          attributionPosition="bottom-left"
          minZoom={0.1}
          maxZoom={2}
          defaultEdgeOptions={{
            animated: false,
          }}
        >
          <Background color="#aaa" gap={16} />
          <Controls />
          <MiniMap
            nodeColor={NODE_COLOR}
            maskColor="rgb(240, 240, 240, 0.6)"
          />
        </ReactFlow>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-4 rounded-lg border border-blue-200 dark:border-blue-700">
          <div className="text-sm text-blue-600 dark:text-blue-400 font-medium mb-1">Total Buses</div>
          <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">{stats.totalBuses}</div>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-4 rounded-lg border border-green-200 dark:border-green-700">
          <div className="text-sm text-green-600 dark:text-green-400 font-medium mb-1">Total Lines</div>
          <div className="text-2xl font-bold text-green-900 dark:text-green-100">{stats.totalLines}</div>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 p-4 rounded-lg border border-purple-200 dark:border-purple-700">
          <div className="text-sm text-purple-600 dark:text-purple-400 font-medium mb-1">Avg Voltage</div>
          <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
            {stats.avgVoltage.toFixed(4)} pu
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-700">
        <div className="text-sm text-blue-800 dark:text-blue-200">
          <strong>💡 Tips:</strong> Use mouse wheel to zoom, drag to pan, click nodes for details. Lines show current (A), loading (%), and losses (W).
        </div>
      </div>
    </div>
  );
}
