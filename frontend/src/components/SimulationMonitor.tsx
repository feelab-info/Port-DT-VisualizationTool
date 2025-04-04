'use client';

import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

interface BusData {
  vm_pu: number;
  va_degree: number;
  p_mw: number;
  q_mvar: number;
}

interface SimulationData {
  timestamp: number;
  res_bus: BusData[];
  is_mock?: boolean;
}

export default function SimulationMonitor() {
  const [simulationData, setSimulationData] = useState<SimulationData | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string>('No updates yet');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    // Connect to the backend Socket.IO server
    const socket = io(process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001');
    
    // Fetch initial data
    const fetchInitialData = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001'}/api/simulation/latest-results`);
        if (response.ok) {
          const data = await response.json();
          setSimulationData(data);
          setLastUpdate(new Date(data.timestamp * 1000).toLocaleTimeString());
          setIsRunning(true);
        } else {
          const errorData = await response.json();
          setError(`Error fetching data: ${errorData.error || response.statusText}`);
        }
      } catch (error) {
        console.error('Error fetching initial simulation data:', error);
        setError(`Error connecting to server: ${(error as Error).message}`);
      }
    };
    
    fetchInitialData();
    
    // Listen for real-time updates
    socket.on('simulation_update', (data: SimulationData) => {
      setSimulationData(data);
      setLastUpdate(new Date(data.timestamp * 1000).toLocaleTimeString());
      setIsRunning(true);
    });
    
    // Clean up on unmount
    return () => {
      socket.off('simulation_update');
      socket.disconnect();
    };
  }, []);
  
  // Function to start the simulation service
  const startSimulationService = async () => {
    try {
      setError(null);
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001'}/api/simulation/start-service`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Simulation service status:', data.status);
        setIsRunning(true);
      } else {
        const errorData = await response.json();
        setError(`Failed to start simulation: ${errorData.error || response.statusText}`);
      }
    } catch (error) {
      console.error('Error starting simulation service:', error);
      setError(`Error connecting to server: ${(error as Error).message}`);
    }
  };
  
  // Function to stop the simulation service
  const stopSimulationService = async () => {
    try {
      setError(null);
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001'}/api/simulation/stop-service`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Simulation service status:', data.status);
        setIsRunning(false);
      } else {
        const errorData = await response.json();
        setError(`Failed to stop simulation: ${errorData.error || response.statusText}`);
      }
    } catch (error) {
      console.error('Error stopping simulation service:', error);
      setError(`Error connecting to server: ${(error as Error).message}`);
    }
  };
  
  return (
    <div className="p-4 bg-white rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Power Flow Simulation Monitor</h2>
        <div className="space-x-2">
          <button 
            onClick={startSimulationService}
            className={`px-4 py-2 ${isRunning ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600'} text-white rounded`}
            disabled={isRunning}
          >
            Start Simulation
          </button>
          <button 
            onClick={stopSimulationService}
            className={`px-4 py-2 ${!isRunning ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-500 hover:bg-red-600'} text-white rounded`}
            disabled={!isRunning}
          >
            Stop Simulation
          </button>
        </div>
      </div>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}
      
      <div className="mb-2 flex items-center">
        <span className="font-semibold mr-2">Last Update:</span> {lastUpdate}
        {simulationData?.is_mock && (
          <span className="ml-2 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
            Using mock data
          </span>
        )}
      </div>
      
      {simulationData ? (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200">
            <thead>
              <tr className="bg-gray-100">
                <th className="py-2 px-4 border">Bus</th>
                <th className="py-2 px-4 border">Voltage (p.u.)</th>
                <th className="py-2 px-4 border">Angle (deg)</th>
                <th className="py-2 px-4 border">Active Power (MW)</th>
                <th className="py-2 px-4 border">Reactive Power (Mvar)</th>
              </tr>
            </thead>
            <tbody>
              {simulationData.res_bus.map((bus, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                  <td className="py-2 px-4 border">{`Bus ${index}`}</td>
                  <td className="py-2 px-4 border">{bus.vm_pu.toFixed(4)}</td>
                  <td className="py-2 px-4 border">{typeof bus.va_degree === 'number' ? 
                    bus.va_degree.toFixed(4) : bus.va_degree}</td>
                  <td className="py-2 px-4 border">{bus.p_mw.toFixed(6)}</td>
                  <td className="py-2 px-4 border">{typeof bus.q_mvar === 'number' ? 
                    bus.q_mvar.toFixed(6) : bus.q_mvar}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-4">
          <p>No simulation data available yet. Please start the simulation service.</p>
        </div>
      )}
    </div>
  );
}