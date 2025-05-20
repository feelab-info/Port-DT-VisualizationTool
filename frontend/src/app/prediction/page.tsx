/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import VesselInput from '@/components/VesselInput';
import Link from 'next/link';
import vesselSimulationService, { 
  VesselSimulationResult, 
  VesselData, 
  DetailedSimulationsResponse,
  SimulationDetail 
} from '@/services/VesselSimulationService';

export default function PredictionPage() {
  const [vesselResult, setVesselResult] = useState<VesselSimulationResult | null>(null);
  const [simulationResults, setSimulationResults] = useState<VesselSimulationResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [simulationsData, setSimulationsData] = useState<DetailedSimulationsResponse | null>(null);
  const [detailedSimulationError, setDetailedSimulationError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    // Fetch initial vessel simulation data using the service
    const fetchVesselSimulations = async () => {
      try {
        setIsLoading(true);
        const data = await vesselSimulationService.getVesselSimulations();
        setSimulationResults(data);
      } catch (error) {
        console.error('Error fetching vessel simulations:', error);
        setError(`Error fetching data: ${(error as Error).message}`);
      } finally {
        setIsLoading(false);
      }
    };
    
    // Fetch detailed energy profiles
    const fetchDetailedSimulations = async () => {
      setDetailedSimulationError(null);
      try {
        const data = await vesselSimulationService.getDetailedSimulations(selectedDate);
        setSimulationsData(data);
      } catch (error) {
        console.error('Error fetching detailed simulations:', error);
        setDetailedSimulationError((error as Error).message);
      }
    };
    
    fetchVesselSimulations();
    fetchDetailedSimulations();
    
    // Set up a polling interval to refresh data periodically if needed
    const intervalId = setInterval(() => {
      fetchVesselSimulations();
      fetchDetailedSimulations();
    }, 3000000); // Refresh every 3000 seconds
    
    // Clean up on unmount
    return () => {
      clearInterval(intervalId);
    };
  }, [selectedDate]); // Add selectedDate as a dependency

  const handleVesselSubmit = async (data: VesselData) => {
    try {
      setIsLoading(true);
      setError(null);
      setVesselResult(null); // Clear previous result
      
      // Use the service to predict energy
      const result = await vesselSimulationService.predictVesselEnergy(data);
      setVesselResult(result);
      
      
    } catch (error) {
      console.error('Error submitting vessel data:', error);
      setError(`Prediction failed: ${(error as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // The useEffect will automatically trigger with the new selectedDate
  };

  // Function to calculate total energy consumption from energy profile data
  const calculateTotalEnergy = (simulation: SimulationDetail): number => {
    if (!simulation.data.energy_profile_data || simulation.data.energy_profile_data.length === 0) {
      return 0;
    }
    
    return simulation.data.energy_profile_data.reduce((sum, point) => {
      return sum + (point['Chillers Power'] + point['Hotel Power']);
    }, 0) / 12; // Assuming 5-minute intervals (12 readings per hour)
  };

  // Function to get stay duration in hours
  const getStayDuration = (simulation: SimulationDetail): number => {
    if (!simulation.data.arrival_time || !simulation.data.departure_time) {
      return 0;
    }
    
    const arrivalParts = simulation.data.arrival_time.split(':').map(Number);
    const departureParts = simulation.data.departure_time.split(':').map(Number);
    
    const arrivalHours = arrivalParts[0] + arrivalParts[1] / 60;
    const departureHours = departureParts[0] + departureParts[1] / 60;
    
    return departureHours - arrivalHours;
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">Ship Energy Prediction</h1>
        
        <div className="grid grid-cols-1 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Enter Vessel Details</h2>
            <VesselInput onSubmit={handleVesselSubmit} />
            
            {isLoading && (
              <div className="text-center py-4">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
                <p className="mt-2 text-gray-600">Processing simulation...</p>
              </div>
            )}
            
            {error && (
              <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                {error}
              </div>
            )}
            
            {vesselResult && (
              <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="text-lg font-medium text-green-800 mb-2">Prediction Results</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Vessel Name</p>
                    <p className="font-medium">{vesselResult.vesselName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Estimated Energy Consumption</p>
                    <p className="font-medium">{vesselResult.energyConsumption || 'N/A'} kWh</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Arrival Time</p>
                    <p className="font-medium">{vesselResult.arrivalTime ? new Date(vesselResult.arrivalTime).toLocaleString() : 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Departure Time</p>
                    <p className="font-medium">{vesselResult.departureTime ? new Date(vesselResult.departureTime).toLocaleString() : 'N/A'}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Date Selection Form */}
      <div className="container mx-auto px-6 mb-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Select Date for Detailed Simulations</h2>
          <form onSubmit={handleDateSubmit} className="flex gap-4 items-end">
            <div className="flex-1">
              <label htmlFor="simulation-date" className="block text-sm font-medium text-gray-700 mb-1">
                Date
              </label>
              <input
                type="date"
                id="simulation-date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Update
            </button>
          </form>
        </div>
      </div>

      {/* Vessel Energy Cards - Simplified View */}
      {detailedSimulationError ? (
        <div className="container mx-auto p-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Vessel Energy Profiles</h2>
            <div className="p-4 bg-yellow-50 border border-yellow-400 text-yellow-800 rounded">
              <p><strong>Note:</strong> There was an issue fetching detailed vessel data.</p>
              <p className="text-sm mt-1">{detailedSimulationError}</p>
              <p className="text-sm mt-2">The server may not have any vessel data available yet or is experiencing technical difficulties.</p>
            </div>
          </div>
        </div>
      ) : (
        simulationsData && simulationsData.success && (
          <div className="container mx-auto p-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Vessel Energy Profiles</h2>
              
              {simulationsData.simulations.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {simulationsData.simulations.map((simulation, index) => {
                    const totalEnergy = calculateTotalEnergy(simulation);
                    const stayDuration = getStayDuration(simulation);
                    
                    // Create a URL-friendly vessel identifier
                    const vesselId = encodeURIComponent(simulation.data.vessel.replace(/\s+/g, '-').toLowerCase());
                    
                    return (
                      <div key={index} className="border rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
                        <div className="p-5 border-b bg-blue-50">
                          <h3 className="text-lg font-semibold text-blue-800">{simulation.data.vessel}</h3>
                          <p className="text-sm text-gray-600">Based on {simulation.closest_ship} model</p>
                        </div>
                        
                        <div className="p-5">
                          <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                              <p className="text-xs text-gray-500">Arrival</p>
                              <p className="font-medium">{simulation.data.arrival_time}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Departure</p>
                              <p className="font-medium">{simulation.data.departure_time}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Duration</p>
                              <p className="font-medium">{stayDuration.toFixed(1)} hours</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Est. Energy</p>
                              <p className="font-medium">{totalEnergy.toFixed(2)} kWh</p>
                            </div>
                          </div>
                          
                          <Link 
                            href={`/vessel/${vesselId}?date=${simulation.data.energy_profile_data[0]?.Timestamp?.split(' ')[0] || ''}`} 
                            className="block w-full py-2 px-4 text-center bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors duration-200"
                          >
                            View Detailed Profile
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500">
                  No vessel energy profiles available.
                </div>
              )}
            </div>
          </div>
        )
      )}
    </DashboardLayout>
  );
}