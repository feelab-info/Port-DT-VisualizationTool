'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import VesselEnergyProfile from '@/components/VesselEnergyProfile';
import vesselSimulationService, { 
  SimulationDetail
} from '@/services/VesselSimulationService';

export function VesselDetailPageClient({ id }: { id: string }) {
  const searchParams = useSearchParams();
  const date = searchParams.get('date');
  const decodedVesselId = decodeURIComponent(id);
  const vesselName = decodedVesselId.replace(/-/g, ' ');
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vesselData, setVesselData] = useState<SimulationDetail | null>(null);

  useEffect(() => {
    const fetchVesselData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Fetch simulation data for the date
        const formattedDate = date || new Date().toISOString().split('T')[0];
        const simulationsData = await vesselSimulationService.getDetailedSimulations(formattedDate);
        
        if (!simulationsData.success || !simulationsData.simulations || simulationsData.simulations.length === 0) {
          throw new Error('No vessel data available for the selected date');
        }
        
        // Find the vessel by name (case insensitive)
        const vessel = simulationsData.simulations.find(
          sim => sim.data.vessel.toLowerCase() === vesselName.toLowerCase()
        );
        
        if (!vessel) {
          throw new Error(`Vessel "${vesselName}" not found in the simulation data`);
        }
        
        setVesselData(vessel);
      } catch (error) {
        console.error('Error fetching vessel data:', error);
        setError((error as Error).message);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchVesselData();
  }, [id, date, vesselName]);
  
  // Calculate total energy consumption
  const calculateTotalEnergy = (): number => {
    if (!vesselData || !vesselData.data.energy_profile_data || vesselData.data.energy_profile_data.length === 0) {
      return 0;
    }
    
    return vesselData.data.energy_profile_data.reduce((sum, point) => {
      return sum + (point['Chillers Power'] + point['Hotel Power']);
    }, 0) / 12; // Assuming 5-minute intervals (12 readings per hour)
  };
  
  // Get stay duration in hours
  const getStayDuration = (): number => {
    if (!vesselData || !vesselData.data.arrival_time || !vesselData.data.departure_time) {
      return 0;
    }
    
    const arrivalParts = vesselData.data.arrival_time.split(':').map(Number);
    const departureParts = vesselData.data.departure_time.split(':').map(Number);
    
    const arrivalHours = arrivalParts[0] + arrivalParts[1] / 60;
    const departureHours = departureParts[0] + departureParts[1] / 60;
    
    return departureHours - arrivalHours;
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Vessel Energy Profile</h1>
          <Link href="/prediction" className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded transition-colors duration-200">
            Back to Vessels
          </Link>
        </div>
        
        {isLoading ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent mb-4"></div>
            <p className="text-gray-600">Loading vessel data...</p>
          </div>
        ) : error ? (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="p-4 bg-red-50 border border-red-400 text-red-700 rounded">
              <p className="font-medium mb-2">Error loading vessel data</p>
              <p>{error}</p>
              <Link href="/prediction" className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors duration-200">
                Return to Vessels List
              </Link>
            </div>
          </div>
        ) : vesselData ? (
          <>
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <div className="flex flex-wrap justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-blue-800">{vesselData.data.vessel}</h2>
                  <p className="text-gray-600 mb-4">Based on {vesselData.closest_ship} model</p>
                </div>
                <div className="bg-blue-50 rounded-lg px-4 py-2 mt-2 md:mt-0">
                  <p className="text-sm text-gray-600">Scaling Factor</p>
                  <p className="font-medium text-blue-800">{vesselData.scaling_factor.toFixed(4)}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-medium mb-2">Vessel Details</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-xs text-gray-500">Gross Tonnage</p>
                      <p className="font-medium">{vesselData.data.gross_tonnage.toLocaleString()} GT</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Length</p>
                      <p className="font-medium">{vesselData.data.length} m</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Hotel Energy</p>
                      <p className="font-medium">{vesselData.data.hotel_energy.toLocaleString()} kWh</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-medium mb-2">Port Visit</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-xs text-gray-500">Arrival Time</p>
                      <p className="font-medium">{vesselData.data.arrival_time}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Departure Time</p>
                      <p className="font-medium">{vesselData.data.departure_time}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Stay Duration</p>
                      <p className="font-medium">{getStayDuration().toFixed(1)} hours</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-medium mb-2">Energy Summary</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-xs text-gray-500">Total Energy</p>
                      <p className="font-medium">{calculateTotalEnergy().toFixed(2)} kWh</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Data Points</p>
                      <p className="font-medium">{vesselData.data.energy_profile_data.length}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Energy Rate</p>
                      <p className="font-medium">
                        {(calculateTotalEnergy() / getStayDuration()).toFixed(2)} kWh/h
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-md p-6">
              <VesselEnergyProfile 
                closest_ship={vesselData.closest_ship}
                data={vesselData.data}
                message={vesselData.message}
                scaling_factor={vesselData.scaling_factor}
                success={vesselData.success}
              />
            </div>
          </>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <p className="text-gray-600">No vessel data found.</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
} 