'use client';

import React from 'react';
import { ConverterData } from '@/services/ConverterDataService';
import { Battery, Zap, Car, Power, Plug } from 'lucide-react';

interface PowerFlowDiagramProps {
  convertersData: ConverterData[];
}

// ============================================================================
// CONFIGURATION: Easily adjust converter positions here
// ============================================================================
const CONVERTER_POSITIONS = {
  // Grid (Top Center) - Most Important Input
  grid: {
    x: 50,  // % from left
    y: 12,  // % from top
    size: 100, // pixel diameter
    label: 'Grid Input',
    icon: Plug,
    priority: 'high', // Emphasis level
  },
  // Battery (Bottom Center) - Most Important Output
  battery: {
    x: 50,
    y: 82,
    size: 100,
    label: 'Battery Storage',
    icon: Battery,
    priority: 'high',
  },
  // Solar (Top Right)
  solar: {
    x: 78,
    y: 28,
    size: 85,
    label: 'Solar PV',
    icon: Zap,
    priority: 'normal',
  },
  // EV Charger 1 (Left)
  ev1: {
    x: 22,
    y: 50,
    size: 85,
    label: 'EV Charger 1',
    icon: Car,
    priority: 'normal',
  },
  // EV Charger 2 (Right)
  ev2: {
    x: 78,
    y: 50,
    size: 85,
    label: 'EV Charger 2',
    icon: Car,
    priority: 'normal',
  },
  // Center Hub
  center: {
    x: 50,
    y: 47,
    size: 130,
    label: 'AC/DC Hub',
    icon: Power,
    priority: 'normal',
  }
};

export default function PowerFlowDiagram({ convertersData }: PowerFlowDiagramProps) {
  // Find each converter by node
  const converterBAT = convertersData.find(c => c.node === 'N01');
  const converterPV = convertersData.find(c => c.node === 'N02');
  const converterEV1 = convertersData.find(c => c.node === 'N03');
  const converterEV2 = convertersData.find(c => c.node === 'N04');
  const converterACDC = convertersData.find(c => c.node === 'N05');

  // Calculate power values (in kW)
  const batteryPower = converterBAT ? (converterBAT.battery?.P || 0) / 1000 : 0;
  const pvPower = converterPV ? ((converterPV.L1?.P || 0) + (converterPV.L2?.P || 0) + (converterPV.L3?.P || 0)) / 1000 : 0;
  const ev1Power = converterEV1 ? ((converterEV1.L1?.P || 0) + (converterEV1.L2?.P || 0) + (converterEV1.L3?.P || 0)) / 1000 : 0;
  const ev2Power = converterEV2 ? ((converterEV2.L1?.P || 0) + (converterEV2.L2?.P || 0) + (converterEV2.L3?.P || 0)) / 1000 : 0;
  const gridPower = converterACDC ? (converterACDC.grid?.P || 0) / 1000 : 0;

  // Calculate total load/generation
  const totalGeneration = Math.max(0, -pvPower) + Math.max(0, -batteryPower);
  const totalLoad = Math.abs(Math.min(0, batteryPower)) + Math.abs(ev1Power) + Math.abs(ev2Power);
  const netPower = totalGeneration - totalLoad;

  // Battery SOC
  const batterySOC = converterBAT ? ((converterBAT.battery?.V || 0) * 100 / 51).toFixed(0) : '0';

  // Helper function to get color based on power flow
  const getPowerColor = (power: number) => {
    if (power > 0.1) return '#fbbf24'; // Amber for consumption
    if (power < -0.1) return '#34d399'; // Emerald for generation
    return '#9ca3af'; // Gray for idle
  };

  // Helper function to get line width based on power magnitude
  const getLineWidth = (power: number) => {
    const magnitude = Math.abs(power);
    if (magnitude > 10) return 6;
    if (magnitude > 5) return 5;
    if (magnitude > 1) return 4;
    return 3;
  };

  // Helper function to get glow animation
  const getFlowAnimation = (power: number) => {
    if (Math.abs(power) < 0.1) return '';
    return power > 0 ? 'flow-consume' : 'flow-generate';
  };

  // Converter node component
  const ConverterNode = ({ 
    config, 
    power, 
    additionalInfo 
  }: { 
    config: typeof CONVERTER_POSITIONS.grid; 
    power: number;
    additionalInfo?: string;
  }) => {
    const Icon = config.icon;
    const isHighPriority = config.priority === 'high';
    const size = config.size;
    const isActive = Math.abs(power) > 0.1;
    
    return (
      <div 
        className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-20"
        style={{ 
          left: `${config.x}%`, 
          top: `${config.y}%`,
        }}
      >
        {/* Outer ring (priority indicator) */}
        {isHighPriority && isActive && (
          <div 
            className="absolute rounded-full border-2 border-white/30 pulse-ring"
            style={{ 
              width: size + 20, 
              height: size + 20,
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)'
            }}
          />
        )}
        
        {/* Main circle */}
        <div 
          className={`rounded-full border-4 ${isHighPriority ? 'border-white' : 'border-white/70'} bg-black/70 backdrop-blur-sm flex items-center justify-center shadow-2xl hover:scale-105 transition-transform`}
          style={{ width: size, height: size }}
        >
          <Icon className={`${isHighPriority ? 'w-12 h-12' : 'w-10 h-10'} text-white`} />
        </div>
        
        {/* Label and power value */}
        <div className="mt-3 text-center">
          <div className={`${isHighPriority ? 'text-sm font-bold' : 'text-xs font-semibold'} text-white mb-1 tracking-wide`}>
            {config.label.toUpperCase()}
          </div>
          <div className={`${isHighPriority ? 'text-3xl' : 'text-2xl'} font-bold text-white drop-shadow-lg`}>
            {power.toFixed(2)}
          </div>
          <div className="text-sm text-white/80 font-medium">kW</div>
          {additionalInfo && (
            <div className="text-xs text-white/70 mt-1 font-medium">
              {additionalInfo}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="relative w-full h-[700px] bg-gray-900 rounded-2xl overflow-hidden shadow-2xl">
      {/* Background overlay - Image will be added by user as CSS background */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/50 to-black/70" style={{ zIndex: 1 }}></div>
      
      <style jsx>{`
        @keyframes flow-consume {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
        @keyframes flow-generate {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes pulse-ring {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.8; }
          50% { transform: translate(-50%, -50%) scale(1.15); opacity: 0.3; }
        }
        .flow-consume {
          animation: flow-consume 2s ease-in-out infinite;
        }
        .flow-generate {
          animation: flow-generate 2s ease-in-out infinite;
        }
        .pulse-ring {
          animation: pulse-ring 3s ease-in-out infinite;
        }
      `}</style>

      {/* SVG for power flow lines */}
      <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 10 }}>
        <defs>
          <filter id="glow-white">
            <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          
          {/* Arrow markers */}
          <marker id="arrowAmber" markerWidth="12" markerHeight="12" refX="10" refY="3" orient="auto" markerUnits="strokeWidth">
            <path d="M0,0 L0,6 L9,3 z" fill="#fbbf24" />
          </marker>
          <marker id="arrowEmerald" markerWidth="12" markerHeight="12" refX="10" refY="3" orient="auto" markerUnits="strokeWidth">
            <path d="M0,0 L0,6 L9,3 z" fill="#34d399" />
          </marker>
          <marker id="arrowGray" markerWidth="12" markerHeight="12" refX="10" refY="3" orient="auto" markerUnits="strokeWidth">
            <path d="M0,0 L0,6 L9,3 z" fill="#9ca3af" />
          </marker>
        </defs>

        {/* Center hub circle */}
        <circle 
          cx={`${CONVERTER_POSITIONS.center.x}%`}
          cy={`${CONVERTER_POSITIONS.center.y}%`}
          r={CONVERTER_POSITIONS.center.size / 2}
          fill="rgba(0, 0, 0, 0.7)"
          stroke="rgba(255, 255, 255, 0.5)"
          strokeWidth="3"
          filter="url(#glow-white)"
        />

        {/* Power flow lines - Grid to Center */}
        <line
          x1={`${CONVERTER_POSITIONS.grid.x}%`}
          y1={`${CONVERTER_POSITIONS.grid.y + 8}%`}
          x2={`${CONVERTER_POSITIONS.center.x}%`}
          y2={`${CONVERTER_POSITIONS.center.y - 8}%`}
          stroke={getPowerColor(gridPower)}
          strokeWidth={getLineWidth(gridPower)}
          className={getFlowAnimation(gridPower)}
          filter="url(#glow-white)"
          markerEnd={
            gridPower > 0.1 ? 'url(#arrowAmber)' : 
            gridPower < -0.1 ? 'url(#arrowEmerald)' : 
            'url(#arrowGray)'
          }
        />

        {/* Power flow lines - Solar to Center */}
        <line
          x1={`${CONVERTER_POSITIONS.solar.x - 3}%`}
          y1={`${CONVERTER_POSITIONS.solar.y + 3}%`}
          x2={`${CONVERTER_POSITIONS.center.x + 5}%`}
          y2={`${CONVERTER_POSITIONS.center.y - 5}%`}
          stroke={getPowerColor(pvPower)}
          strokeWidth={getLineWidth(pvPower)}
          className={getFlowAnimation(pvPower)}
          filter="url(#glow-white)"
          markerEnd={
            pvPower > 0.1 ? 'url(#arrowAmber)' : 
            pvPower < -0.1 ? 'url(#arrowEmerald)' : 
            'url(#arrowGray)'
          }
        />

        {/* Power flow lines - Center to Battery */}
        <line
          x1={`${CONVERTER_POSITIONS.center.x}%`}
          y1={`${CONVERTER_POSITIONS.center.y + 8}%`}
          x2={`${CONVERTER_POSITIONS.battery.x}%`}
          y2={`${CONVERTER_POSITIONS.battery.y - 8}%`}
          stroke={getPowerColor(batteryPower)}
          strokeWidth={getLineWidth(batteryPower)}
          className={getFlowAnimation(batteryPower)}
          filter="url(#glow-white)"
          markerEnd={
            batteryPower > 0.1 ? 'url(#arrowAmber)' : 
            batteryPower < -0.1 ? 'url(#arrowEmerald)' : 
            'url(#arrowGray)'
          }
        />

        {/* Power flow lines - EV1 to Center */}
        <line
          x1={`${CONVERTER_POSITIONS.ev1.x + 3}%`}
          y1={`${CONVERTER_POSITIONS.ev1.y}%`}
          x2={`${CONVERTER_POSITIONS.center.x - 5}%`}
          y2={`${CONVERTER_POSITIONS.center.y}%`}
          stroke={getPowerColor(ev1Power)}
          strokeWidth={getLineWidth(ev1Power)}
          className={getFlowAnimation(ev1Power)}
          filter="url(#glow-white)"
          markerEnd={
            ev1Power > 0.1 ? 'url(#arrowAmber)' : 
            ev1Power < -0.1 ? 'url(#arrowEmerald)' : 
            'url(#arrowGray)'
          }
        />

        {/* Power flow lines - EV2 to Center */}
        <line
          x1={`${CONVERTER_POSITIONS.ev2.x - 3}%`}
          y1={`${CONVERTER_POSITIONS.ev2.y}%`}
          x2={`${CONVERTER_POSITIONS.center.x + 5}%`}
          y2={`${CONVERTER_POSITIONS.center.y}%`}
          stroke={getPowerColor(ev2Power)}
          strokeWidth={getLineWidth(ev2Power)}
          className={getFlowAnimation(ev2Power)}
          filter="url(#glow-white)"
          markerEnd={
            ev2Power > 0.1 ? 'url(#arrowAmber)' : 
            ev2Power < -0.1 ? 'url(#arrowEmerald)' : 
            'url(#arrowGray)'
          }
        />
      </svg>

      {/* Center Hub */}
      <div 
        className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center z-20"
        style={{ 
          left: `${CONVERTER_POSITIONS.center.x}%`, 
          top: `${CONVERTER_POSITIONS.center.y}%`,
        }}
      >
        <div 
          className="rounded-full bg-black/80 backdrop-blur-md border-4 border-white/60 flex items-center justify-center shadow-2xl"
          style={{ width: CONVERTER_POSITIONS.center.size, height: CONVERTER_POSITIONS.center.size }}
        >
          <Power className="w-14 h-14 text-white" />
        </div>
        <div className="mt-3 text-center">
          <div className="text-xs font-semibold text-white/90 mb-1 tracking-wider">AC/DC HUB</div>
          <div className={`text-3xl font-bold ${netPower >= 0 ? 'text-emerald-400' : 'text-amber-400'} drop-shadow-lg`}>
            {netPower.toFixed(2)}
          </div>
          <div className="text-sm text-white/80 font-medium">kW Net</div>
        </div>
      </div>

      {/* Grid Node - High Priority */}
      <ConverterNode 
        config={CONVERTER_POSITIONS.grid}
        power={gridPower}
      />

      {/* Battery Node - High Priority */}
      <ConverterNode 
        config={CONVERTER_POSITIONS.battery}
        power={batteryPower}
        additionalInfo={`SOC: ${batterySOC}%`}
      />

      {/* Solar Node */}
      <ConverterNode 
        config={CONVERTER_POSITIONS.solar}
        power={pvPower}
      />

      {/* EV Charger 1 Node */}
      <ConverterNode 
        config={CONVERTER_POSITIONS.ev1}
        power={ev1Power}
      />

      {/* EV Charger 2 Node */}
      <ConverterNode 
        config={CONVERTER_POSITIONS.ev2}
        power={ev2Power}
      />

      {/* Legend */}
      <div className="absolute bottom-6 left-6 bg-black/70 backdrop-blur-md rounded-xl p-4 border border-white/20 z-30">
        <div className="text-xs font-bold text-white mb-3 tracking-wider">POWER FLOW</div>
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-1 bg-emerald-400 rounded"></div>
            <span className="text-xs text-white/90 font-medium">Generation</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-1 bg-amber-400 rounded"></div>
            <span className="text-xs text-white/90 font-medium">Consumption</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-1 bg-gray-400 rounded"></div>
            <span className="text-xs text-white/90 font-medium">Idle</span>
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="absolute bottom-6 right-6 bg-black/70 backdrop-blur-md rounded-xl p-4 border border-white/20 min-w-[200px] z-30">
        <div className="text-xs font-bold text-white mb-3 tracking-wider">SYSTEM STATS</div>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-emerald-400 font-medium">Generation:</span>
            <span className="text-white font-bold">{totalGeneration.toFixed(2)} kW</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-amber-400 font-medium">Load:</span>
            <span className="text-white font-bold">{totalLoad.toFixed(2)} kW</span>
          </div>
          <div className="flex justify-between text-sm pt-2 border-t border-white/20">
            <span className="text-blue-400 font-medium">Net:</span>
            <span className={`font-bold ${netPower >= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {netPower.toFixed(2)} kW
            </span>
          </div>
        </div>
      </div>

      {/* Position Configuration Notice (for development) */}
      <div className="absolute top-6 left-6 bg-blue-600/80 backdrop-blur-md rounded-lg px-4 py-2 border border-blue-400/30 z-30">
        <div className="text-xs text-white font-medium">
          💡 Positions configurable in CONVERTER_POSITIONS const
        </div>
      </div>
    </div>
  );
}
