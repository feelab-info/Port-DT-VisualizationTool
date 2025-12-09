'use client';

import React, { useState, useCallback } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Maximize2, X, Info } from 'lucide-react';

// ============================================
// SVG Components
// ============================================

interface DisjuntorProps {
  x: number;
  y: number;
  label: string;
  sublabel?: string;
  id: string;
  onClick?: (id: string) => void;
  size?: 'small' | 'medium' | 'large';
  color?: string;
}

const Disjuntor: React.FC<DisjuntorProps> = ({ 
  x, y, label, sublabel, id, onClick, size = 'medium', color = '#1e40af'
}) => {
  const dims = {
    small: { w: 28, h: 36, fs: 7, sfs: 6 },
    medium: { w: 40, h: 50, fs: 9, sfs: 7 },
    large: { w: 58, h: 68, fs: 11, sfs: 9 },
  };
  const { w, h, fs, sfs } = dims[size];

  return (
    <g className="cursor-pointer hover:opacity-75 transition-opacity" onClick={() => onClick?.(id)}>
      <rect x={x - w/2} y={y - h/2} width={w} height={h} fill="white" stroke={color} strokeWidth={1.5} rx={3} />
      <line x1={x - w/2 + 4} y1={y + h/2 - 4} x2={x + w/2 - 4} y2={y - h/2 + 4} stroke={color} strokeWidth={1.5} />
      <text x={x} y={y + h/2 + fs + 4} textAnchor="middle" fontSize={fs} fontWeight="bold" fill={color}>{label}</text>
      {sublabel && (
        <text x={x} y={y + h/2 + fs + sfs + 6} textAnchor="middle" fontSize={sfs} fill="#6b7280">{sublabel}</text>
      )}
    </g>
  );
};

const Generator: React.FC<{ x: number; y: number; label: string; onClick?: (id: string) => void }> = ({ x, y, label, onClick }) => (
  <g className="cursor-pointer hover:opacity-75" onClick={() => onClick?.('generator')}>
    <circle cx={x} cy={y} r={24} fill="white" stroke="#16a34a" strokeWidth={2} />
    <text x={x} y={y + 6} textAnchor="middle" fontSize={20} fontWeight="bold" fill="#16a34a">G</text>
    <text x={x} y={y + 42} textAnchor="middle" fontSize={10} fontWeight="bold" fill="#166534">{label}</text>
  </g>
);

const Transformer: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <g>
    <circle cx={x} cy={y - 12} r={14} fill="none" stroke="#7c3aed" strokeWidth={2} />
    <circle cx={x} cy={y + 12} r={14} fill="none" stroke="#7c3aed" strokeWidth={2} />
    <text x={x + 26} y={y + 4} fontSize={10} fill="#7c3aed" fontWeight="600">Transformador</text>
  </g>
);

const Line: React.FC<{ x1: number; y1: number; x2: number; y2: number; color?: string; dashed?: boolean; width?: number }> = ({ 
  x1, y1, x2, y2, color = '#475569', dashed = false, width = 2
}) => (
  <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={width} strokeDasharray={dashed ? '6,4' : undefined} />
);

const BusBar: React.FC<{ x: number; y: number; width: number; color?: string }> = ({ x, y, width, color = '#1e3a8a' }) => (
  <rect x={x - width/2} y={y - 3} width={width} height={6} fill={color} rx={2} />
);

const EndPanel: React.FC<{ x: number; y: number; label: string; id: string; onClick?: (id: string) => void; color?: string }> = ({
  x, y, label, id, onClick, color = '#dbeafe'
}) => (
  <g className="cursor-pointer hover:opacity-75" onClick={() => onClick?.(id)}>
    <rect x={x - 32} y={y - 12} width={64} height={24} fill={color} stroke="#3b82f6" strokeWidth={1.5} rx={4} />
    <text x={x} y={y + 4} textAnchor="middle" fontSize={7} fontWeight="600" fill="#1e40af">{label}</text>
  </g>
);

// ============================================
// Main Component
// ============================================

export default function ElectricalDiagram() {
  const [scale, setScale] = useState(0.5);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Zoom limits: min 35%, max 150%
  const MIN_ZOOM = 1.35;
  const MAX_ZOOM = 2.5;

  const handleZoomIn = () => setScale(s => Math.min(s + 0.1, MAX_ZOOM));
  const handleZoomOut = () => setScale(s => Math.max(s - 0.1, MIN_ZOOM));
  const handleReset = useCallback(() => { setScale(0.5); setPosition({ x: 0, y: 0 }); }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) { setIsDragging(true); setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y }); }
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };
  const handleMouseUp = () => setIsDragging(false);
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setScale(s => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, s + (e.deltaY > 0 ? -0.05 : 0.05))));
  };
  const handleClick = (id: string) => setSelectedComponent(id);

  // Canvas
  const W = 3200;
  const H = 950;

  // Layout
  const centerX = W / 2;
  const topY = 40;
  
  // Spacing
  const cbSpacing = 70;
  
  // Y positions
  const mainBusY = topY + 320;
  const qgedY = topY + 420;
  const subBusY = topY + 500;
  const cbY = topY + 590;
  const endPanelY = topY + 680;
  
  // Q.DEMONSTRADOR - sub-branch of QGED(E), positioned to the left of D15
  const demoX = 180;
  const demoPanelY = cbY;
  const demoBusY = endPanelY + 60;
  const demoEquipY = demoBusY + 50;
  
  // QGED(E) section - starts after demonstrador
  const qgedEStartX = 380;
  const qgedEBusWidth = 17 * cbSpacing + 120; // balanced bus length
  const qgedECenterX = qgedEStartX + (17 * cbSpacing) / 2;
  const qgedEBusCenterX = demoX + (qgedEBusWidth / 2) + 10;
  
  // QGED(N) section  
  const qgedNStartX = qgedEStartX + 17 * cbSpacing + 180;
  const qgedNBusWidth = 14 * cbSpacing + 40;
  const qgedNCenterX = qgedNStartX + qgedNBusWidth / 2;
  
  // Main bus
  const mainBusWidth = (qgedNStartX + qgedNBusWidth) - demoX + 40;
  const mainBusCenterX = demoX + mainBusWidth / 2 - 20;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-6 py-4 rounded-xl shadow-xl border border-slate-700">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Info className="w-5 h-5 text-blue-400" />
              </div>
              Diagrama Unifilar - Porto do Funchal
            </h2>
            <p className="text-slate-400 text-sm mt-1 ml-12">Esquema de distribuição elétrica do demonstrador SHIFT2DC</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleZoomOut} className="p-2.5 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors" disabled={scale <= MIN_ZOOM}>
              <ZoomOut className={`w-4 h-4 ${scale <= MIN_ZOOM ? 'text-slate-500' : 'text-slate-300'}`} />
            </button>
            <div className="px-3 py-1.5 bg-slate-700 rounded-lg min-w-[60px] text-center">
              <span className="text-slate-300 text-sm font-mono">{Math.round(scale * 100)}%</span>
            </div>
            <button onClick={handleZoomIn} className="p-2.5 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors" disabled={scale >= MAX_ZOOM}>
              <ZoomIn className={`w-4 h-4 ${scale >= MAX_ZOOM ? 'text-slate-500' : 'text-slate-300'}`} />
            </button>
            <div className="w-px h-6 bg-slate-600 mx-1" />
            <button onClick={handleReset} className="p-2.5 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors">
              <RotateCcw className="w-4 h-4 text-slate-300" />
            </button>
            <button onClick={() => setIsFullscreen(!isFullscreen)} className="p-2.5 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors">
              {isFullscreen ? <X className="w-4 h-4 text-slate-300" /> : <Maximize2 className="w-4 h-4 text-slate-300" />}
            </button>
          </div>
        </div>
      </div>

      {/* Diagram Container */}
      <div 
        className={`relative bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 rounded-xl border-2 border-slate-200 dark:border-slate-700 overflow-hidden shadow-lg ${isFullscreen ? 'fixed inset-0 z-50 rounded-none' : ''}`}
        style={{ height: isFullscreen ? '100vh' : '600px' }}
      >
        <svg
          width="100%" height="100%" viewBox={`0 0 ${W} ${H}`}
          className="cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          style={{ transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`, transformOrigin: 'center center' }}
        >
          {/* Background */}
          <defs>
            <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#eef2f7" strokeWidth="0.4" />
            </pattern>
          </defs>
          <rect width={W} height={H} fill="#f9fbfd" />
          <rect width={W} height={H} fill="url(#grid)" />

          {/* ========================================== */}
          {/* TOP: Grid → Transformer → Q.GE → QGBT */}
          {/* ========================================== */}
          
          <text x={centerX} y={topY} textAnchor="middle" fontSize={16} fontWeight="bold" fill="#dc2626">
            REDE ELÉTRICA (Utility Grid)
          </text>
          <Line x1={centerX} y1={topY + 12} x2={centerX} y2={topY + 30} color="#dc2626" width={2.5} />
          
          <Transformer x={centerX} y={topY + 55} />
          <Line x1={centerX} y1={topY + 80} x2={centerX} y2={topY + 100} color="#7c3aed" width={2.5} />
          
          {/* Q.GE */}
          <Disjuntor x={centerX} y={topY + 135} label="Q.GE" sublabel="Main Entry" id="q-ge" onClick={handleClick} size="large" color="#dc2626" />
          
          {/* Emergency Generator */}
          <Generator x={centerX - 180} y={topY + 135} label="Gerador Emergência" onClick={handleClick} />
          <Line x1={centerX - 155} y1={topY + 135} x2={centerX - 50} y2={topY + 135} color="#16a34a" dashed width={2} />
          <text x={centerX - 100} y={topY + 123} textAnchor="middle" fontSize={9} fill="#16a34a" fontWeight="600">(backup)</text>
          
          {/* Q.GE to QGBT */}
          <Line x1={centerX} y1={topY + 180} x2={centerX} y2={topY + 210} color="#1e3a8a" width={2.5} />
          
          {/* QGBT */}
          <Disjuntor x={centerX} y={topY + 250} label="QGBT (N+E)" sublabel="Main Switchboard" id="qgbt" onClick={handleClick} size="large" color="#1e3a8a" />
          
          {/* QGBT to Main Bus */}
          <Line x1={centerX} y1={topY + 295} x2={centerX} y2={mainBusY} color="#1e3a8a" width={2.5} />
          
          {/* Main Bus Bar */}
          <BusBar x={mainBusCenterX} y={mainBusY} width={mainBusWidth} color="#1e3a8a" />
          
          {/* Branch down to QGED(E) */}
          <Line x1={qgedECenterX} y1={mainBusY + 4} x2={qgedECenterX} y2={qgedY - 45} color="#f97316" width={2.5} />
          
          {/* Branch down to QGED(N) */}
          <Line x1={qgedNCenterX} y1={mainBusY + 4} x2={qgedNCenterX} y2={qgedY - 45} color="#22c55e" width={2.5} />

          {/* ========================================== */}
          {/* QGED (E) - Emergency Power */}
          {/* ========================================== */}
          
          <Disjuntor x={qgedECenterX} y={qgedY} label="QGED (E)" sublabel="Emergency Power" id="qged-e" onClick={handleClick} size="large" color="#f97316" />
          <Line x1={qgedECenterX} y1={qgedY + 50} x2={qgedECenterX} y2={subBusY} color="#f97316" width={2.5} />
          
          {/* QGED(E) Bus Bar - extends left to include Q.DEMONSTRADOR */}
          <BusBar x={qgedEBusCenterX} y={subBusY} width={qgedEBusWidth} color="#f97316" />

          {/* ========================================== */}
          {/* Q.DEMONSTRADOR - Sub-branch of QGED(E) */}
          {/* ========================================== */}
          
          {/* Line from QGED(E) bus down to Q.DEMONSTRADOR */}
          <Line x1={demoX} y1={subBusY + 4} x2={demoX} y2={demoPanelY - 35} color="#0891b2" width={2.5} />
          
          {/* Q.DEMONSTRADOR panel */}
          <Disjuntor x={demoX} y={demoPanelY} label="Q.DEMONSTRADOR" sublabel="FÍSICO" id="demonstrador" onClick={handleClick} size="medium" color="#0891b2" />
          
          {/* Line down to equipment bus */}
          <Line x1={demoX} y1={demoPanelY + 45} x2={demoX} y2={demoBusY} color="#0891b2" width={2} />
          
          {/* Demonstrador equipment bus */}
          <BusBar x={demoX + 130} y={demoBusY} width={360} color="#0891b2" />
          
          {/* 6 Equipment */}
          {[
            { l: 'Q.BAT', i: 0 },
            { l: 'Q.Vload.P', i: 1 },
            { l: 'Q.lig.AC', i: 2 },
            { l: 'Q.Empilhador', i: 3 },
            { l: 'Q.Carregadores', i: 4 },
            { l: 'Q.PV', i: 5 },
          ].map((item) => {
            const px = demoX - 10 + item.i * 58;
            return (
              <g key={`demo-${item.i}`}>
                <Line x1={px} y1={demoBusY + 4} x2={px} y2={demoEquipY - 12} color="#0891b2" />
                <EndPanel x={px} y={demoEquipY} label={item.l} id={item.l} onClick={handleClick} color="#cffafe" />
              </g>
            );
          })}

          {/* QGED(E) Circuit Breakers D15-D31 */}
          {[
            { d: 'D15', p: 'Q.P.01' },
            { d: 'D16', p: 'Q.P.02' },
            { d: 'D17', p: 'Q.P.03' },
            { d: 'D18', p: 'Q.P.04' },
            { d: 'D19', p: 'Q.P.05' },
            { d: 'D20', p: 'Q.AVAC 2' },
            { d: 'D21', p: 'Q.P.07' },
            { d: 'D22', p: 'Q.P.08' },
            { d: 'D23', p: 'Q.P.1.1' },
            { d: 'D24', p: 'Q.P.1.2' },
            { d: 'D25', p: 'Q.P.1.3' },
            { d: 'D26', p: 'Q.P.1.4' },
            { d: 'D27', p: 'Q.P.N.R.O' },
            { d: 'D28', p: 'CHILLER (E)' },
            { d: 'D29', p: 'Q.E.S.I' },
            { d: 'D30', p: 'Q.BOMBAS' },
            { d: 'D31', p: 'Q.SERVIDORES' },
          ].map((item, i) => {
            const bx = qgedEStartX + i * cbSpacing;
            return (
              <g key={`e-${i}`}>
                <Line x1={bx} y1={subBusY + 4} x2={bx} y2={cbY - 25} color="#f97316" />
                <Disjuntor x={bx} y={cbY} label={item.d} id={`e-${item.d}`} onClick={handleClick} size="small" color="#f97316" />
                <Line x1={bx} y1={cbY + 30} x2={bx} y2={endPanelY - 12} color="#f97316" />
                <EndPanel x={bx} y={endPanelY} label={item.p} id={`e-${item.p}`} onClick={handleClick} color="#ffedd5" />
              </g>
            );
          })}

          {/* ========================================== */}
          {/* QGED (N) - Normal Power */}
          {/* ========================================== */}
          
          <Disjuntor x={qgedNCenterX} y={qgedY} label="QGED (N)" sublabel="Normal Power" id="qged-n" onClick={handleClick} size="large" color="#22c55e" />
          <Line x1={qgedNCenterX} y1={qgedY + 50} x2={qgedNCenterX} y2={subBusY} color="#22c55e" width={2.5} />
          <BusBar x={qgedNCenterX} y={subBusY} width={qgedNBusWidth} color="#22c55e" />

          {/* QGED(N) Circuit Breakers D1-D14 */}
          {[
            { d: 'D1', p: 'Q.P.01' },
            { d: 'D2', p: 'Q.P.02' },
            { d: 'D3', p: 'Q.P.03' },
            { d: 'D4', p: 'Q.P.04' },
            { d: 'D5', p: 'Q.P.05' },
            { d: 'D6', p: 'Q.P.07' },
            { d: 'D7', p: 'Q.P.1.1' },
            { d: 'D8', p: 'Q.P.1.2' },
            { d: 'D9', p: 'Q.P.1.3' },
            { d: 'D10', p: 'Q.P.14' },
            { d: 'D11', p: 'Q.P.N.P.G' },
            { d: 'D12', p: 'Q.AVAC.0.2' },
            { d: 'D13', p: 'Q.AVAC 1' },
            { d: 'D14', p: 'CHILLER (N)' },
          ].map((item, i) => {
            const bx = qgedNStartX + i * cbSpacing;
            return (
              <g key={`n-${i}`}>
                <Line x1={bx} y1={subBusY + 4} x2={bx} y2={cbY - 25} color="#22c55e" />
                <Disjuntor x={bx} y={cbY} label={item.d} id={`n-${item.d}`} onClick={handleClick} size="small" color="#22c55e" />
                <Line x1={bx} y1={cbY + 30} x2={bx} y2={endPanelY - 12} color="#22c55e" />
                <EndPanel x={bx} y={endPanelY} label={item.p} id={item.p} onClick={handleClick} color="#dcfce7" />
              </g>
            );
          })}

          {/* Normal energia label */}
          <text x={qgedNCenterX} y={endPanelY + 35} textAnchor="middle" fontSize={11} fill="#166534" fontStyle="italic" fontWeight="600">(Normal energia)</text>

          {/* ========================================== */}
          {/* LEGEND & TITLE - top right */}
          {/* ========================================== */}
          <g transform={`translate(${W - 520}, ${topY + 40})`}>
            <rect x={0} y={0} width={240} height={100} fill="white" stroke="#e2e8f0" strokeWidth={1.2} rx={8} />
            <text x={14} y={18} fontSize={11} fontWeight="bold" fill="#1e293b">Legenda</text>
            
            <rect x={14} y={30} width={14} height={20} fill="white" stroke="#1e40af" strokeWidth={1.2} rx={2} />
            <line x1={16} y1={48} x2={26} y2={32} stroke="#1e40af" strokeWidth={1.2} />
            <text x={40} y={43} fontSize={9} fill="#334155">Disjuntor</text>
            
            <circle cx={22} cy={70} r={7} fill="white" stroke="#16a34a" strokeWidth={1.2} />
            <text x={22} y={73} textAnchor="middle" fontSize={7} fontWeight="bold" fill="#16a34a">G</text>
            <text x={40} y={73} fontSize={9} fill="#334155">Gerador</text>
            
            <rect x={130} y={30} width={12} height={8} fill="#22c55e" rx={2} />
            <text x={150} y={38} fontSize={8} fill="#334155">Normal</text>
            
            <rect x={130} y={46} width={12} height={8} fill="#f97316" rx={2} />
            <text x={150} y={54} fontSize={8} fill="#334155">Emergency</text>
            
            <rect x={130} y={62} width={12} height={8} fill="#0891b2" rx={2} />
            <text x={150} y={70} fontSize={8} fill="#334155">Demonstrador</text>
            
            <rect x={130} y={78} width={12} height={8} fill="#1e3a8a" rx={2} />
            <text x={150} y={86} fontSize={8} fill="#334155">Main</text>
          </g>
          
          <g transform={`translate(${W - 270}, ${topY + 40})`}>
            <rect x={0} y={0} width={200} height={90} fill="white" stroke="#1e3a8a" strokeWidth={1.5} rx={6} />
            <rect x={0} y={0} width={200} height={24} fill="#1e3a8a" rx={6} />
            <rect x={0} y={18} width={200} height={6} fill="#1e3a8a" />
            <text x={100} y={17} textAnchor="middle" fontSize={11} fontWeight="bold" fill="white">DIAGRAMA UNIFILAR</text>
            <text x={100} y={42} textAnchor="middle" fontSize={9} fill="#1e293b" fontWeight="600">Porto do Funchal - SHIFT2DC</text>
            <text x={100} y={58} textAnchor="middle" fontSize={8} fill="#475569">Distribuição Elétrica</text>
            <text x={100} y={74} textAnchor="middle" fontSize={8} fill="#94a3b8">v2.4 • 2024</text>
          </g>
        </svg>

        {/* Info Panel */}
        {selectedComponent && (
          <div className="absolute top-4 right-4 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border p-4 w-64 z-10">
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-bold text-slate-900 dark:text-white">{selectedComponent}</h4>
              <button onClick={() => setSelectedComponent(null)} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">Componente do sistema elétrico.</p>
          </div>
        )}

        {/* Controls */}
        <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur rounded-lg px-4 py-2 text-sm text-slate-600 shadow-lg border">
          <span className="font-medium">Controlos:</span> Scroll = zoom • Arrastar = mover
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'QGED(N)', value: '14', desc: 'D1-D14', color: 'bg-green-500', bg: 'bg-green-50' },
          { label: 'QGED(E)', value: '17', desc: 'D15-D31', color: 'bg-orange-500', bg: 'bg-orange-50' },
          { label: 'Demonstrador', value: '6', desc: 'Equipamentos', color: 'bg-cyan-500', bg: 'bg-cyan-50' },
          { label: 'Total', value: '31', desc: 'Disjuntores', color: 'bg-blue-500', bg: 'bg-blue-50' },
        ].map((stat, i) => (
          <div key={i} className={`${stat.bg} rounded-xl p-4 border border-slate-200`}>
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-3 h-3 rounded-full ${stat.color}`} />
              <span className="text-sm font-semibold text-slate-700">{stat.label}</span>
            </div>
            <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
            <div className="text-xs text-slate-500">{stat.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
