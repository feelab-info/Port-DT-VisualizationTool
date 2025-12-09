'use client';

import React, { useCallback, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Node,
  useNodesState,
  useEdgesState,
  Panel,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { gridNodes, gridEdges, legendItems, componentDescriptions } from './gridData';
import { nodeTypes } from './nodeTypes';
import { Info, ZoomIn, Maximize2, X } from 'lucide-react';

interface ComponentInfoProps {
  nodeId: string | null;
  onClose: () => void;
}

function ComponentInfo({ nodeId, onClose }: ComponentInfoProps) {
  if (!nodeId) return null;

  const info = componentDescriptions[nodeId];
  if (!info) return null;

  return (
    <div className="absolute top-4 right-4 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-4 w-72 z-10">
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-bold text-gray-900 dark:text-white">{info.name}</h4>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{info.description}</p>
      {info.specs && (
        <div className="bg-gray-50 dark:bg-gray-700 rounded px-2 py-1">
          <span className="text-xs font-mono text-gray-500 dark:text-gray-400">{info.specs}</span>
        </div>
      )}
    </div>
  );
}

function Legend() {
  return (
    <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-3">
      <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">Legend</h4>
      <div className="space-y-1.5">
        {legendItems.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <div 
              className={`w-6 h-0.5 ${item.type === 'dashed' ? 'border-t-2 border-dashed' : ''}`}
              style={{ 
                backgroundColor: item.type === 'solid' ? item.color : 'transparent',
                borderColor: item.type === 'dashed' ? item.color : 'transparent',
              }}
            />
            <span className="text-[10px] text-gray-600 dark:text-gray-400">{item.label}</span>
          </div>
        ))}
      </div>
      <div className="border-t border-gray-200 dark:border-gray-600 mt-2 pt-2">
        <h5 className="text-[10px] font-semibold text-gray-600 dark:text-gray-400 mb-1">Components</h5>
        <div className="grid grid-cols-2 gap-1 text-[9px] text-gray-500 dark:text-gray-400">
          <span>🔵 Distribution Panel</span>
          <span>🟡 Converter</span>
          <span>🟢 Generator</span>
          <span>🟣 Battery</span>
          <span>☀️ PV System</span>
          <span>🔵 Shore Power</span>
        </div>
      </div>
    </div>
  );
}

export default function GridDocumentation() {
  const [nodes, , onNodesChange] = useNodesState(gridNodes);
  const [edges, , onEdgesChange] = useEdgesState(gridEdges);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node.id);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(!isFullscreen);
  }, [isFullscreen]);

  const containerClass = isFullscreen 
    ? 'fixed inset-0 z-50 bg-white dark:bg-gray-900' 
    : 'relative';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-700 dark:to-indigo-700 px-6 py-4 rounded-lg shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Info className="w-5 h-5" />
              Port Electrical Grid Documentation
            </h2>
            <p className="text-blue-100 text-sm mt-1">
              Single-line diagram of the Funchal Port DC distribution system
            </p>
          </div>
          <div className="flex items-center gap-2 text-white/80 text-sm">
            <span>Interactive Diagram</span>
            <span className="bg-white/20 px-2 py-0.5 rounded text-xs">v1.0</span>
          </div>
        </div>
      </div>

      {/* Diagram Container */}
      <div 
        className={`${containerClass} bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden`} 
        style={{ height: isFullscreen ? '100vh' : '750px' }}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.2}
          maxZoom={2}
          attributionPosition="bottom-left"
          proOptions={{ hideAttribution: true }}
        >
          <Background 
            color="#94a3b8" 
            gap={24} 
            size={1}
          />
          <Controls 
            showInteractive={false}
            className="!bg-white dark:!bg-gray-700 !border-gray-200 dark:!border-gray-600 !shadow-lg"
          />
          <MiniMap
            nodeColor={(node) => {
              switch (node.type) {
                case 'grid': return '#dc2626';
                case 'mainPanel': return '#2563eb';
                case 'panel': return '#64748b';
                case 'converter': return '#f59e0b';
                case 'generator': return '#22c55e';
                case 'battery': return '#a855f7';
                case 'pv': return '#eab308';
                case 'shoreOutlet': return '#06b6d4';
                case 'vessel': return '#6366f1';
                case 'load': return '#f97316';
                default: return '#94a3b8';
              }
            }}
            maskColor="rgba(0, 0, 0, 0.1)"
            className="!bg-gray-100 dark:!bg-gray-700 !border-gray-200 dark:!border-gray-600"
          />

          {/* Legend Panel */}
          <Panel position="top-left" className="!m-3">
            <Legend />
          </Panel>

          {/* Fullscreen Toggle */}
          <Panel position="top-right" className="!m-3">
            <button
              onClick={toggleFullscreen}
              className="bg-white dark:bg-gray-700 p-2 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? (
                <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              ) : (
                <Maximize2 className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              )}
            </button>
          </Panel>
        </ReactFlow>

        {/* Component Info Popup */}
        <ComponentInfo nodeId={selectedNode} onClose={() => setSelectedNode(null)} />
      </div>

      {/* Instructions and Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-700">
          <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-2 flex items-center gap-2">
            <ZoomIn className="w-4 h-4" />
            Navigation Tips
          </h4>
          <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
            <li>• <strong>Scroll</strong> to zoom in/out</li>
            <li>• <strong>Click + Drag</strong> to pan the view</li>
            <li>• <strong>Click</strong> on components for details</li>
            <li>• Use the <strong>minimap</strong> for quick navigation</li>
          </ul>
        </div>

        <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg border border-amber-200 dark:border-amber-700">
          <h4 className="font-semibold text-amber-800 dark:text-amber-300 mb-2 flex items-center gap-2">
            <Info className="w-4 h-4" />
            System Overview
          </h4>
          <ul className="text-sm text-amber-700 dark:text-amber-400 space-y-1">
            <li>• <strong>20kV</strong> grid connection from distribution network</li>
            <li>• <strong>DC bus</strong> for efficient power distribution</li>
            <li>• <strong>5 shore power</strong> outlets (Q.PO1-5)</li>
            <li>• <strong>PV + Battery</strong> renewable integration</li>
          </ul>
        </div>
      </div>

      {/* Component Summary */}
      <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
        <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">System Components Summary</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {[
            { label: 'Distribution Panels', count: 8, color: 'bg-blue-500' },
            { label: 'Converters', count: 10, color: 'bg-amber-500' },
            { label: 'Shore Outlets', count: 5, color: 'bg-cyan-500' },
            { label: 'Refrigeration', count: 4, color: 'bg-emerald-500' },
            { label: 'HVAC/Chillers', count: 4, color: 'bg-teal-500' },
            { label: 'Services', count: 6, color: 'bg-slate-500' },
          ].map((item, index) => (
            <div key={index} className="bg-white dark:bg-gray-700 rounded-lg p-3 shadow-sm border border-gray-100 dark:border-gray-600">
              <div className={`w-3 h-3 rounded-full ${item.color} mb-2`} />
              <div className="text-lg font-bold text-gray-900 dark:text-white">{item.count}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{item.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

