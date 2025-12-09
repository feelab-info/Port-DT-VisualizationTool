'use client';

import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

// Interface for timesteps data
interface TimestepData {
  timestamp: string;
  bus_id?: number;
  voltage?: number;
  power?: number;
  load?: number;
  [key: string]: string | number | boolean | object | undefined;
}

// Add a KPI interface for future implementation
// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface KpiData {
  efficiency?: {
    [key: string]: number;
  };
  economic?: {
    [key: string]: number;
  };
  environmental?: {
    [key: string]: number;
  };
  [key: string]: Record<string, number> | undefined;
}

export default function SimulationMonitor() {
  const [timestepsData, setTimestepsData] = useState<TimestepData[] | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string>('Waiting for simulation...');
  const [simulationTime, setSimulationTime] = useState<string>('--');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connecting');
  const [activeTab, setActiveTab] = useState<'timesteps' | 'kpi'>('timesteps');
  const [visualizationType, setVisualizationType] = useState<'barChart' | 'table'>('barChart');
  const [chartMetric, setChartMetric] = useState<'voltage' | 'load'>('voltage');
  
  useEffect(() => {
    const socketConnection = io(process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001');
    
    socketConnection.on('connect', () => {
      setConnectionStatus('connected');
      setError(null);
      console.log('Connected to backend - waiting for simulation data...');
    });
    
    socketConnection.on('disconnect', () => {
      setConnectionStatus('disconnected');
      setIsRunning(false);
    });
    
    socketConnection.on('connect_error', (err) => {
      console.error('Connection error:', err);
      setConnectionStatus('disconnected');
      setError(`Connection error: ${err.message}`);
    });
    
    // Listen for simulation timestep updates (runs every minute)
    socketConnection.on('simulation_timestep_update', (payload: {
      timestamp: string;
      simulationTime: string;
      data: TimestepData[];
    }) => {
      console.log('Received simulation timestep update:', payload);
      setTimestepsData(payload.data);
      setLastUpdate(new Date().toLocaleTimeString('pt-PT'));
      setSimulationTime(payload.simulationTime);
      setIsRunning(true);
      setError(null);
    });
    
    return () => {
      socketConnection.disconnect();
    };
  }, []);
  
  return (
    <div className="space-y-8">
      {/* Status Header Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-700 dark:to-blue-900/20 px-6 py-4 border-b border-gray-200 dark:border-gray-600">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className={`h-4 w-4 rounded-full ${
                  connectionStatus === 'connected' ? 'bg-green-500' : 
                  connectionStatus === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'
                }`}></div>
                <span className={`text-sm font-medium ${
                  connectionStatus === 'connected' ? 'text-green-700 dark:text-green-400' : 
                  connectionStatus === 'connecting' ? 'text-yellow-700 dark:text-yellow-400' : 'text-red-700 dark:text-red-400'
                }`}>
                  {connectionStatus === 'connected' ? 'Connected' : 
                   connectionStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
                </span>
              </div>
              <div className="flex items-center space-x-6 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center">
                  <span className="font-medium mr-2">Last Update:</span>
                  <span className="font-mono text-blue-600 dark:text-blue-400">{lastUpdate}</span>
                </div>
                <div className="flex items-center">
                  <span className="font-medium mr-2">Simulation Time:</span>
                  <span className="font-mono text-green-600 dark:text-green-400">{simulationTime}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {isRunning && (
                <span className="px-4 py-2 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400 text-sm rounded-lg border border-green-200 dark:border-green-700 font-medium flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                  Running (every 1 min)
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-6">
            <div className="flex items-start space-x-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-red-100 dark:bg-red-900/40 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-red-800 dark:text-red-300 mb-2">Connection Error</h3>
                <p className="text-red-700 dark:text-red-400">{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="border-b border-gray-200 dark:border-gray-600">
          <div className="flex px-6">
            <button
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'timesteps' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}`}
              onClick={() => setActiveTab('timesteps')}
            >
              Timesteps Results
            </button>
            <button
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'kpi' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}`}
              onClick={() => setActiveTab('kpi')}
            >
              KPI Results
            </button>
          </div>
        </div>
        
        <div className="p-6">
          {activeTab === 'timesteps' && (
            timestepsData ? (
              <div className="space-y-8">
                <div className="text-sm text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-700">
                  <p>Real-time DC power flow simulation results. Data automatically updates every minute with the latest grid state for all buses.</p>
                </div>
                
                {/* Visualization controls */}
                <div className="flex flex-wrap items-center gap-6">
                  <div className="flex items-center gap-3">
                    <h3 className="text-md font-medium text-gray-900 dark:text-gray-100">View:</h3>
                    <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                      <button 
                        onClick={() => setVisualizationType('barChart')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                          visualizationType === 'barChart' 
                            ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow' 
                            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        Bar Chart
                      </button>
                      <button 
                        onClick={() => setVisualizationType('table')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                          visualizationType === 'table' 
                            ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow' 
                            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        Table
                      </button>
                    </div>
                  </div>
                  
                  {visualizationType === 'barChart' && (
                    <div className="flex items-center gap-3">
                      <h3 className="text-md font-medium text-gray-900 dark:text-gray-100">Metric:</h3>
                      <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                        <button 
                          onClick={() => setChartMetric('voltage')}
                          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                            chartMetric === 'voltage' 
                              ? 'bg-white dark:bg-gray-600 text-emerald-600 dark:text-emerald-400 shadow' 
                              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                          }`}
                        >
                          Voltage (pu)
                        </button>
                        <button 
                          onClick={() => setChartMetric('load')}
                          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                            chartMetric === 'load' 
                              ? 'bg-white dark:bg-gray-600 text-amber-600 dark:text-amber-400 shadow' 
                              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                          }`}
                        >
                          Load (kW)
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900">
                  <svg className="h-6 w-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="mt-4 text-sm font-medium text-gray-900 dark:text-gray-100">Waiting for simulation data...</h3>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">The simulation runs automatically every minute. Data will appear here shortly.</p>
              </div>
            )
          )}
          
          {activeTab === 'kpi' && (
            <div className="text-center py-12">
              <div className="mx-auto max-w-md">
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 dark:bg-blue-900/20">
                  <svg className="h-8 w-8 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div className="mt-6 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-700">
                  <h3 className="text-lg font-semibold text-blue-700 dark:text-blue-300 mb-3">KPI Results - Coming Soon</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    The Key Performance Indicators (KPI) view is under development. This tab will display efficiency, economic, and environmental metrics for your DC power flow simulations.
                  </p>
                  <div className="text-left bg-white dark:bg-gray-800 rounded-lg p-4 border border-blue-200 dark:border-blue-600">
                    <p className="text-gray-600 dark:text-gray-400 mb-3 font-medium">
                      Future metrics will include:
                    </p>
                    <ul className="space-y-2 text-gray-600 dark:text-gray-400">
                      <li className="flex items-center">
                        <div className="h-1.5 w-1.5 bg-blue-500 rounded-full mr-3"></div>
                        Energy efficiency and losses
                      </li>
                      <li className="flex items-center">
                        <div className="h-1.5 w-1.5 bg-blue-500 rounded-full mr-3"></div>
                        Capital and operational expenses
                      </li>
                      <li className="flex items-center">
                        <div className="h-1.5 w-1.5 bg-blue-500 rounded-full mr-3"></div>
                        Carbon footprint and environmental impact
                      </li>
                      <li className="flex items-center">
                        <div className="h-1.5 w-1.5 bg-blue-500 rounded-full mr-3"></div>
                        System reliability statistics
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chart and Table Sections - Only show when timestepsData is available */}
      {activeTab === 'timesteps' && timestepsData && timestepsData.length > 0 && (
        <>
          {/* Bar Chart visualization */}
          {visualizationType === 'barChart' && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className={`bg-gradient-to-r ${chartMetric === 'voltage' ? 'from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20' : 'from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20'} px-6 py-4 border-b border-gray-200 dark:border-gray-600`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 bg-gradient-to-br ${chartMetric === 'voltage' ? 'from-emerald-500 to-teal-600' : 'from-amber-500 to-orange-600'} rounded-lg flex items-center justify-center`}>
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {chartMetric === 'voltage' ? 'Bus Voltage Distribution' : 'Bus Load Distribution'}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {chartMetric === 'voltage' ? 'Voltage per unit (pu) across all buses' : 'Power load (kW) across all buses'}
                      </p>
                    </div>
                  </div>
                  <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Simulation Time: <span className={`font-mono ${chartMetric === 'voltage' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>{simulationTime}</span>
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart
                    data={timestepsData.map((step) => ({
                      name: `Bus ${step.bus_id ?? '?'}`,
                      busId: step.bus_id,
                      voltage: step.voltage ?? 0,
                      load: step.load !== undefined && step.load !== null ? Number(step.load) * 1000 : 0,
                    }))}
                    margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:opacity-20" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fill: '#6b7280', fontSize: 12 }}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis 
                      tick={{ fill: '#6b7280', fontSize: 12 }}
                      label={{ 
                        value: chartMetric === 'voltage' ? 'Voltage (pu)' : 'Load (kW)', 
                        angle: -90, 
                        position: 'insideLeft',
                        style: { fill: '#6b7280', fontSize: 14 }
                      }}
                      domain={chartMetric === 'voltage' ? [0.990, 1.010] : [0, 'auto']}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      }}
                      formatter={(value: number) => [
                        chartMetric === 'voltage' 
                          ? `${value.toFixed(4)} pu` 
                          : `${value.toFixed(3)} kW`,
                        chartMetric === 'voltage' ? 'Voltage' : 'Load'
                      ]}
                      labelStyle={{ fontWeight: 600, color: '#374151' }}
                    />
                    <Bar 
                      dataKey={chartMetric} 
                      radius={[4, 4, 0, 0]}
                    >
                      {timestepsData.map((_, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={chartMetric === 'voltage' 
                            ? `hsl(160, ${70 + (index * 3) % 30}%, ${45 + (index * 5) % 15}%)` 
                            : `hsl(35, ${70 + (index * 3) % 30}%, ${50 + (index * 5) % 15}%)`
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              
              {/* Statistics summary */}
              <div className="px-6 pb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className={`p-4 rounded-lg ${chartMetric === 'voltage' ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700' : 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700'}`}>
                    <div className={`text-sm font-medium ${chartMetric === 'voltage' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                      {chartMetric === 'voltage' ? 'Average Voltage' : 'Total Load'}
                    </div>
                    <div className={`text-2xl font-bold ${chartMetric === 'voltage' ? 'text-emerald-900 dark:text-emerald-100' : 'text-amber-900 dark:text-amber-100'}`}>
                      {chartMetric === 'voltage' 
                        ? `${(timestepsData.reduce((sum, d) => sum + (d.voltage || 0), 0) / timestepsData.length).toFixed(4)} pu`
                        : `${(timestepsData.reduce((sum, d) => sum + (Number(d.load) || 0) * 1000, 0)).toFixed(2)} kW`
                      }
                    </div>
                  </div>
                  <div className={`p-4 rounded-lg ${chartMetric === 'voltage' ? 'bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-700' : 'bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700'}`}>
                    <div className={`text-sm font-medium ${chartMetric === 'voltage' ? 'text-teal-600 dark:text-teal-400' : 'text-orange-600 dark:text-orange-400'}`}>
                      {chartMetric === 'voltage' ? 'Min Voltage' : 'Min Load'}
                    </div>
                    <div className={`text-2xl font-bold ${chartMetric === 'voltage' ? 'text-teal-900 dark:text-teal-100' : 'text-orange-900 dark:text-orange-100'}`}>
                      {chartMetric === 'voltage' 
                        ? `${Math.min(...timestepsData.map(d => d.voltage || 0)).toFixed(4)} pu`
                        : `${(Math.min(...timestepsData.map(d => (Number(d.load) || 0) * 1000))).toFixed(2)} kW`
                      }
                    </div>
                  </div>
                  <div className={`p-4 rounded-lg ${chartMetric === 'voltage' ? 'bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-700' : 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700'}`}>
                    <div className={`text-sm font-medium ${chartMetric === 'voltage' ? 'text-cyan-600 dark:text-cyan-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
                      {chartMetric === 'voltage' ? 'Max Voltage' : 'Max Load'}
                    </div>
                    <div className={`text-2xl font-bold ${chartMetric === 'voltage' ? 'text-cyan-900 dark:text-cyan-100' : 'text-yellow-900 dark:text-yellow-100'}`}>
                      {chartMetric === 'voltage' 
                        ? `${Math.max(...timestepsData.map(d => d.voltage || 0)).toFixed(4)} pu`
                        : `${(Math.max(...timestepsData.map(d => (Number(d.load) || 0) * 1000))).toFixed(2)} kW`
                      }
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Table visualization */}
          {visualizationType === 'table' && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-700 dark:to-slate-700/50 px-6 py-4 border-b border-gray-200 dark:border-gray-600">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-slate-500 to-gray-600 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0V7a2 2 0 012-2h8a2 2 0 012 2v13H5z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Simulation Data Table</h3>
                      <div className="flex items-center space-x-4 mt-1">
                        <p className="text-sm text-gray-600 dark:text-gray-400">Power flow simulation timestep data</p>
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">•</span>
                        <p className="text-sm font-medium text-green-600 dark:text-green-400">
                          Simulation Time: <span className="font-mono">{simulationTime}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {timestepsData.length} records
                  </div>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Bus ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Voltage (pu)</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Load (KW)</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-600">
                    {timestepsData.map((step, index) => {
                      return (
                        <tr key={index} className={`${index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700/30'} hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors duration-150`}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{step.bus_id !== undefined ? step.bus_id : '—'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{step.voltage !== undefined && step.voltage !== null ? step.voltage.toFixed(4) : '—'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{step.load !== undefined && step.load !== null ? (Number(step.load) * 1000).toFixed(3) : '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              
              <div className="bg-white dark:bg-gray-800 px-6 py-3 border-t border-gray-200 dark:border-gray-600">
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  Showing {timestepsData.length} {timestepsData.length === 1 ? 'bus' : 'buses'} from latest simulation
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}