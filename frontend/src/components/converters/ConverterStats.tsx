import React from 'react';
import { ConverterData } from '@/services/ConverterDataService';

interface ConverterStatsProps {
  data: ConverterData[];
}

/**
 * SYSTEM OVERVIEW COMPONENT
 * 
 * IMPORTANT: Understanding the Data Fields
 * ==========================================
 * Each converter has two power measurement fields:
 * - "grid" field = INPUT power ENTERING the converter
 * - "battery" field = OUTPUT power LEAVING the converter
 * 
 * These are NOT actual grid/battery connections, they are INPUT/OUTPUT measurements!
 * 
 * Converter-Specific Meanings:
 * 
 * N01 - ConverterBAT (Battery Storage)
 *   - grid: Input from system
 *   - battery: Output to/from ACTUAL PHYSICAL BATTERY
 *   - This is the ONLY converter with a real battery!
 * 
 * N02 - ConverterPV (Solar)
 *   - grid: Input from solar panels
 *   - battery: Output to system (solar power being delivered)
 * 
 * N03 - ConverterEV1 (EV Charger 1)
 *   - grid: Input from system
 *   - battery: Output to EV charger port
 * 
 * N04 - ConverterEV2 (EV Charger 2)
 *   - grid: Input from system
 *   - battery: Output to EV charger port
 * 
 * N05 - ConverterACDC (Grid Connection)
 *   - grid: Input/Output from ACTUAL UTILITY GRID
 *   - battery: Output to system
 */
export default function ConverterStats({ data }: ConverterStatsProps) {
  // 1. GRID POWER: From N05 (ConverterACDC) - Connection to ACTUAL utility grid
  //    grid.P = Power from utility grid (positive = importing, negative = exporting)
  const converterACDC = data.find(c => c.node === 'N05');
  const gridPower = converterACDC ? (converterACDC.grid?.P || 0) / 1000 : 0;

  // 2. BATTERY POWER: From N01 (ConverterBAT) - ONLY converter with real battery
  //    battery.P = Power to/from actual battery (positive = discharging, negative = charging)
  const converterBAT = data.find(c => c.node === 'N01');
  const batteryPower = converterBAT ? (converterBAT.battery?.P || 0) / 1000 : 0;

  // 3. SOLAR POWER: From N02 (ConverterPV) OUTPUT to system
  //    battery.P = OUTPUT power leaving converter (solar generation delivered to system)
  const converterPV = data.find(c => c.node === 'N02');
  const solarPower = converterPV ? (converterPV.battery?.P || 0) / 1000 : 0;

  // 4. EV CHARGING POWER: From N03 and N04 OUTPUT to EV chargers
  //    battery.P = OUTPUT power leaving converter to charge EVs
  const converterEV1 = data.find(c => c.node === 'N03');
  const converterEV2 = data.find(c => c.node === 'N04');
  const ev1Power = converterEV1 ? (converterEV1.battery?.P || 0) / 1000 : 0;
  const ev2Power = converterEV2 ? (converterEV2.battery?.P || 0) / 1000 : 0;
  const evPower = ev1Power + ev2Power;

  // 5. TOTAL AVAILABLE CAPACITY: How much spare power is available across all converters
  const totalCapacity = data.reduce((sum, converter) => {
    return sum + (converter.available_power?.itfc_pos_active_available_power || 0) / 1000;
  }, 0);

  // 6. COUNT: Number of converters currently operational
  const activeConverters = data.filter(c => c.status?.SystemState === 1).length;
  
  // 7. COUNT: Number of converters without faults
  const healthyConverters = data.filter(c => c.status?.itfc_critical_fault_word === 0).length;

  return (
    <div className="bg-gradient-to-br from-slate-800 via-slate-700 to-slate-800 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 rounded-xl shadow-2xl p-8 text-white border border-slate-600/30">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
        <div className="flex-1">
          <h2 className="text-2xl font-bold tracking-tight">System Overview</h2>
          <p className="text-sm text-slate-300 mt-2">
            Aggregate power metrics calculated from real-time data across all 5 converters
          </p>
        </div>
        <div className="text-left md:text-right">
          <div className="text-sm text-slate-400 mb-1">Health Status</div>
          <div className="flex items-center gap-2">
            <div className={`px-4 py-2 rounded-full text-sm font-semibold ${
              healthyConverters === data.length 
                ? 'bg-green-500/20 text-green-300 border border-green-500/30' 
                : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
            }`}>
              {healthyConverters}/{data.length} Healthy
            </div>
          </div>
        </div>
      </div>
      
      {/* 
        METRICS GRID
        Shows 5 key power flow metrics from the converter system
        Focus on actual power flows rather than abstract totals
      */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        {/* 
          METRIC 1: GRID POWER (Most Important)
          Source: N05 (ConverterACDC) grid.P field
          This is the connection to the ACTUAL utility grid
          
          Positive = Importing from utility grid (buying power)
          Negative = Exporting to utility grid (selling power)
          Zero = Self-sufficient (balanced)
        */}
        <div className="bg-white/5 backdrop-blur-sm rounded-lg p-5 border border-white/10 hover:bg-white/10 transition-all hover:scale-105">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-slate-300 font-semibold uppercase tracking-wider">Grid Power</p>
            <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
          <p className={`text-4xl font-bold mb-1 ${
            gridPower > 0.1 ? 'text-red-400' : gridPower < -0.1 ? 'text-green-400' : 'text-white'
          }`}>
            {gridPower.toFixed(1)}
          </p>
          <p className="text-xs text-slate-400">
            {gridPower > 0.1 ? 'kW importing' : gridPower < -0.1 ? 'kW exporting' : 'kW balanced'}
          </p>
        </div>

        {/* 
          METRIC 2: BATTERY POWER
          Source: N01 (ConverterBAT) battery.P field
          ONLY converter with actual physical battery
          
          Positive = Battery discharging (supplying power to system)
          Negative = Battery charging (storing power from system)
          Zero = Battery idle
        */}
        <div className="bg-white/5 backdrop-blur-sm rounded-lg p-5 border border-white/10 hover:bg-white/10 transition-all hover:scale-105">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-slate-300 font-semibold uppercase tracking-wider">Battery</p>
            <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
          </div>
          <p className={`text-4xl font-bold mb-1 ${
            batteryPower > 0.1 ? 'text-green-400' : batteryPower < -0.1 ? 'text-blue-400' : 'text-white'
          }`}>
            {batteryPower.toFixed(1)}
          </p>
          <p className="text-xs text-slate-400">
            {batteryPower > 0.1 ? 'kW discharging' : batteryPower < -0.1 ? 'kW charging' : 'kW idle'}
          </p>
        </div>

        {/* 
          METRIC 3: SOLAR GENERATION
          Source: N02 (ConverterPV) battery.P field (OUTPUT from converter)
          battery.P = Power LEAVING the converter (delivered to system)
          
          This shows solar power being delivered to the system
        */}
        <div className="bg-white/5 backdrop-blur-sm rounded-lg p-5 border border-white/10 hover:bg-white/10 transition-all hover:scale-105">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-slate-300 font-semibold uppercase tracking-wider">Solar Output</p>
            <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
          </div>
          <p className="text-4xl font-bold mb-1 text-yellow-400">
            {Math.abs(solarPower).toFixed(1)}
          </p>
          <p className="text-xs text-slate-400">kW to system</p>
        </div>

        {/* 
          METRIC 4: EV CHARGING POWER
          Source: N03 + N04 (ConverterEV1/2) battery.P fields (OUTPUT from converters)
          battery.P = Power LEAVING converters (delivered to EV chargers)
          
          This shows power being delivered to charge electric vehicles
        */}
        <div className="bg-white/5 backdrop-blur-sm rounded-lg p-5 border border-white/10 hover:bg-white/10 transition-all hover:scale-105">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-slate-300 font-semibold uppercase tracking-wider">EV Charging</p>
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </div>
          </div>
          <p className="text-4xl font-bold mb-1 text-blue-400">
            {Math.abs(evPower).toFixed(1)}
          </p>
          <p className="text-xs text-slate-400">kW to vehicles</p>
        </div>

        {/* 
          METRIC 5: SYSTEM CAPACITY
          Total available spare capacity
          Note: This is CAPACITY not current power
        */}
        <div className="bg-white/5 backdrop-blur-sm rounded-lg p-5 border border-white/10 hover:bg-white/10 transition-all hover:scale-105">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-slate-300 font-semibold uppercase tracking-wider">Capacity</p>
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="text-4xl font-bold mb-1 text-emerald-400">
            {totalCapacity.toFixed(1)}
          </p>
          <p className="text-xs text-slate-400">kW available</p>
        </div>
      </div>
    </div>
  );
}
