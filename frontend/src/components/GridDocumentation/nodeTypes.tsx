'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

// Grid Connection Node (20kV input)
export const GridNode = memo(({ data }: NodeProps) => (
  <div className="flex flex-col items-center">
    <div className="flex flex-col items-center mb-1">
      {/* Tower/pylon symbol */}
      <div className="w-1 h-4 bg-gray-700 dark:bg-gray-300" />
      <div className="flex items-end gap-0.5">
        <div className="w-1 h-3 bg-gray-700 dark:bg-gray-300 -rotate-12" />
        <div className="w-1 h-5 bg-gray-700 dark:bg-gray-300" />
        <div className="w-1 h-3 bg-gray-700 dark:bg-gray-300 rotate-12" />
      </div>
      <div className="w-6 h-0.5 bg-gray-700 dark:bg-gray-300" />
    </div>
    <div className="bg-gradient-to-b from-red-600 to-red-700 text-white px-4 py-2 rounded-lg border-2 border-red-800 shadow-lg">
      <div className="font-bold text-sm text-center">{data.label}</div>
      {data.subtitle && <div className="text-xs opacity-90 text-center">{data.subtitle}</div>}
    </div>
    <Handle type="source" position={Position.Bottom} className="!bg-red-600 !w-3 !h-3" />
  </div>
));
GridNode.displayName = 'GridNode';

// Main Distribution Panel (Q.QGED)
export const MainPanelNode = memo(({ data }: NodeProps) => (
  <div className="relative">
    <Handle type="target" position={Position.Top} className="!bg-blue-600 !w-2 !h-2" />
    <div className="bg-gradient-to-b from-blue-600 to-blue-700 text-white px-5 py-3 rounded-lg border-2 border-blue-800 shadow-lg min-w-[100px]">
      <div className="font-bold text-sm text-center">{data.label}</div>
      {data.subtitle && <div className="text-xs opacity-80 text-center mt-1">{data.subtitle}</div>}
    </div>
    <Handle type="source" position={Position.Bottom} className="!bg-blue-600 !w-2 !h-2" />
    {data.hasLeftHandle && <Handle type="source" position={Position.Left} id="left" className="!bg-blue-600 !w-2 !h-2" />}
    {data.hasRightHandle && <Handle type="source" position={Position.Right} id="right" className="!bg-blue-600 !w-2 !h-2" />}
  </div>
));
MainPanelNode.displayName = 'MainPanelNode';

// Secondary Distribution Panel
export const PanelNode = memo(({ data }: NodeProps) => (
  <div className="relative">
    <Handle type="target" position={Position.Top} className="!bg-slate-600 !w-2 !h-2" />
    <div className={`${data.color || 'bg-gradient-to-b from-slate-500 to-slate-600'} text-white px-3 py-2 rounded border-2 border-slate-700 shadow-md min-w-[70px]`}>
      <div className="font-semibold text-xs text-center">{data.label}</div>
      {data.subtitle && <div className="text-[10px] opacity-80 text-center">{data.subtitle}</div>}
    </div>
    <Handle type="source" position={Position.Bottom} className="!bg-slate-600 !w-2 !h-2" />
    {data.hasLeftHandle && <Handle type="target" position={Position.Left} id="left" className="!bg-slate-600 !w-2 !h-2" />}
  </div>
));
PanelNode.displayName = 'PanelNode';

// Converter/Transformer Node (Triangle)
export const ConverterNode = memo(({ data }: NodeProps) => (
  <div className="relative flex flex-col items-center">
    <Handle type="target" position={Position.Top} className="!bg-amber-600 !w-2 !h-2 !-top-1" />
    <div 
      className="w-0 h-0 border-l-[25px] border-r-[25px] border-b-[45px] 
                 border-l-transparent border-r-transparent border-b-amber-500
                 drop-shadow-md"
      style={{ filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.2))' }}
    />
    <div className="absolute top-4 text-[10px] font-bold text-amber-900">{data.type || 'AC/DC'}</div>
    <div className="text-[10px] font-mono text-gray-600 dark:text-gray-400 mt-1 whitespace-nowrap">
      {data.label}
    </div>
    <Handle type="source" position={Position.Bottom} className="!bg-amber-600 !w-2 !h-2 !-bottom-1" />
  </div>
));
ConverterNode.displayName = 'ConverterNode';

// Generator Node
export const GeneratorNode = memo(({ data }: NodeProps) => (
  <div className="flex flex-col items-center">
    <div className="relative">
      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-green-600 border-3 border-green-700 flex items-center justify-center shadow-lg">
        <div className="text-white font-bold text-lg">G</div>
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center">
          <span className="text-[8px]">⚡</span>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-green-600 !w-2 !h-2" />
    </div>
    <div className="mt-2 text-xs font-semibold text-gray-700 dark:text-gray-300 text-center">
      {data.label}
    </div>
    {data.subtitle && <div className="text-[10px] text-gray-500 dark:text-gray-400">{data.subtitle}</div>}
  </div>
));
GeneratorNode.displayName = 'GeneratorNode';

// Battery Node
export const BatteryNode = memo(({ data }: NodeProps) => (
  <div className="flex flex-col items-center">
    <Handle type="target" position={Position.Top} className="!bg-purple-600 !w-2 !h-2" />
    <div className="relative">
      {/* Battery shape */}
      <div className="w-12 h-20 bg-gradient-to-b from-purple-500 to-purple-600 rounded-lg border-2 border-purple-700 shadow-lg flex flex-col items-center justify-center">
        <div className="absolute -top-1 w-6 h-2 bg-purple-700 rounded-t" />
        <div className="text-white font-bold text-sm">BAT</div>
        <div className="flex gap-0.5 mt-1">
          <div className="w-1.5 h-3 bg-green-400 rounded-sm" />
          <div className="w-1.5 h-3 bg-green-400 rounded-sm" />
          <div className="w-1.5 h-3 bg-yellow-400 rounded-sm" />
          <div className="w-1.5 h-3 bg-gray-400 rounded-sm" />
        </div>
      </div>
    </div>
    <div className="mt-2 text-xs font-semibold text-gray-700 dark:text-gray-300">{data.label}</div>
    <Handle type="source" position={Position.Bottom} className="!bg-purple-600 !w-2 !h-2" />
  </div>
));
BatteryNode.displayName = 'BatteryNode';

// PV Panel Node
export const PVNode = memo(({ data }: NodeProps) => (
  <div className="flex flex-col items-center">
    <div className="relative">
      {/* Solar panel */}
      <div className="w-16 h-12 bg-gradient-to-br from-blue-900 to-blue-950 rounded border-2 border-blue-800 shadow-lg grid grid-cols-3 grid-rows-2 gap-0.5 p-1">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-blue-700 rounded-sm" />
        ))}
      </div>
      <div className="absolute -top-2 left-1/2 -translate-x-1/2">
        <span className="text-yellow-400 text-lg">☀️</span>
      </div>
    </div>
    <div className="mt-2 text-xs font-semibold text-gray-700 dark:text-gray-300">{data.label}</div>
    <Handle type="source" position={Position.Bottom} className="!bg-yellow-600 !w-2 !h-2" />
  </div>
));
PVNode.displayName = 'PVNode';

// Shore Power Outlet Node
export const ShoreOutletNode = memo(({ data }: NodeProps) => (
  <div className="relative flex flex-col items-center">
    <Handle type="target" position={Position.Top} className="!bg-cyan-600 !w-2 !h-2" />
    <div className="w-10 h-14 bg-gradient-to-b from-cyan-500 to-cyan-600 rounded-lg border-2 border-cyan-700 shadow-md flex flex-col items-center justify-center">
      <div className="w-6 h-6 bg-cyan-800 rounded-full flex items-center justify-center">
        <div className="w-3 h-3 bg-cyan-400 rounded-full" />
      </div>
    </div>
    <div className="mt-1 text-[10px] font-semibold text-gray-700 dark:text-gray-300">{data.label}</div>
  </div>
));
ShoreOutletNode.displayName = 'ShoreOutletNode';

// Vessel Node
export const VesselNode = memo(({ data }: NodeProps) => (
  <div className="flex flex-col items-center">
    <Handle type="target" position={Position.Top} className="!bg-indigo-600 !w-2 !h-2" />
    <div className="relative">
      {/* Ship shape */}
      <div className="w-20 h-10 bg-gradient-to-b from-indigo-500 to-indigo-600 rounded-b-lg border-2 border-indigo-700 shadow-lg flex items-center justify-center"
           style={{ clipPath: 'polygon(10% 0%, 90% 0%, 100% 100%, 0% 100%)' }}>
        <span className="text-white text-lg">🚢</span>
      </div>
    </div>
    <div className="mt-2 text-xs font-semibold text-gray-700 dark:text-gray-300">{data.label}</div>
    {data.subtitle && <div className="text-[10px] text-gray-500 dark:text-gray-400">{data.subtitle}</div>}
  </div>
));
VesselNode.displayName = 'VesselNode';

// Load Node (Chiller, HVAC, Pumps, etc.)
export const LoadNode = memo(({ data }: NodeProps) => (
  <div className="relative flex flex-col items-center">
    <Handle type="target" position={Position.Top} className="!bg-orange-600 !w-2 !h-2" />
    <div className={`${data.color || 'bg-gradient-to-b from-orange-500 to-orange-600'} text-white px-3 py-2 rounded border-2 ${data.borderColor || 'border-orange-700'} shadow-md min-w-[60px]`}>
      {data.icon && <div className="text-center text-sm mb-0.5">{data.icon}</div>}
      <div className="font-semibold text-[10px] text-center">{data.label}</div>
    </div>
    {data.hasOutput && <Handle type="source" position={Position.Bottom} className="!bg-orange-600 !w-2 !h-2" />}
  </div>
));
LoadNode.displayName = 'LoadNode';

// Capacitor Bank Node
export const CapacitorNode = memo(({ data }: NodeProps) => (
  <div className="flex flex-col items-center">
    <Handle type="target" position={Position.Left} className="!bg-teal-600 !w-2 !h-2" />
    <div className="flex flex-col items-center">
      {/* Capacitor symbol */}
      <div className="flex items-center gap-1">
        <div className="w-0.5 h-6 bg-teal-600" />
        <div className="w-4 h-6 flex flex-col justify-between">
          <div className="w-full h-1 bg-teal-600" />
          <div className="w-full h-1 bg-teal-600" />
        </div>
        <div className="w-0.5 h-6 bg-teal-600" />
      </div>
    </div>
    <div className="mt-1 text-[10px] font-semibold text-gray-700 dark:text-gray-300 text-center whitespace-nowrap">{data.label}</div>
  </div>
));
CapacitorNode.displayName = 'CapacitorNode';

// Bus Bar Node (horizontal line for connections)
export const BusBarNode = memo(({ data }: NodeProps) => (
  <div className="relative">
    <Handle type="target" position={Position.Top} className="!bg-gray-600 !w-2 !h-2" />
    <div className={`h-2 ${data.width || 'w-40'} ${data.color || 'bg-gray-700 dark:bg-gray-400'} rounded shadow-md`} />
    <Handle type="source" position={Position.Bottom} className="!bg-gray-600 !w-2 !h-2" />
    {data.label && (
      <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[9px] text-gray-500 dark:text-gray-400 whitespace-nowrap">
        {data.label}
      </div>
    )}
  </div>
));
BusBarNode.displayName = 'BusBarNode';

// Service Panel Node (smaller panels for services)
export const ServiceNode = memo(({ data }: NodeProps) => (
  <div className="relative flex flex-col items-center">
    <Handle type="target" position={Position.Top} className="!bg-emerald-600 !w-2 !h-2" />
    <div className="bg-gradient-to-b from-emerald-500 to-emerald-600 text-white px-2 py-1.5 rounded border border-emerald-700 shadow-sm min-w-[55px]">
      <div className="font-semibold text-[9px] text-center">{data.label}</div>
    </div>
    {data.hasOutput && <Handle type="source" position={Position.Bottom} className="!bg-emerald-600 !w-2 !h-2" />}
  </div>
));
ServiceNode.displayName = 'ServiceNode';

export const nodeTypes = {
  grid: GridNode,
  mainPanel: MainPanelNode,
  panel: PanelNode,
  converter: ConverterNode,
  generator: GeneratorNode,
  battery: BatteryNode,
  pv: PVNode,
  shoreOutlet: ShoreOutletNode,
  vessel: VesselNode,
  load: LoadNode,
  capacitor: CapacitorNode,
  busBar: BusBarNode,
  service: ServiceNode,
};

