import React from 'react';
import Link from 'next/link';
import { SimulationDetail } from '@/services/VesselSimulationService';
import { StationaryVessel } from './layers';
import { calculateTotalEnergy, getStayDuration } from './utils';

interface VesselDetailsPopoverProps {
  vessel: StationaryVessel & {
    simulation?: SimulationDetail;
  };
  onClose: () => void;
}

const VesselDetailsPopover: React.FC<VesselDetailsPopoverProps> = ({ vessel, onClose }) => {
  return (
    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-lg p-4 max-w-sm w-full z-20">
      <button 
        className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
        onClick={onClose}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      
      <h3 className="text-xl font-bold text-blue-800 mb-2">{vessel.name}</h3>
      <p className="text-gray-600 mb-2">Docked at: {vessel.dockName || 'Port'}</p>
      
      {/* Show schedule from vessel data if available */}
      {vessel.arrivalTime && vessel.departureTime && !vessel.simulation && (
        <div className="bg-blue-50 p-3 rounded-lg my-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-xs text-gray-500">Arrival</p>
              <p className="font-medium">{vessel.arrivalTime}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Departure</p>
              <p className="font-medium">{vessel.departureTime}</p>
            </div>
          </div>
        </div>
      )}
      
      {vessel.simulation ? (
        <>
          <div className="bg-gray-50 p-3 rounded-lg my-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-xs text-gray-500">Arrival</p>
                <p className="font-medium">{vessel.simulation.data.arrival_time}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Departure</p>
                <p className="font-medium">{vessel.simulation.data.departure_time}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Stay Duration</p>
                <p className="font-medium">{getStayDuration(vessel.simulation).toFixed(1)} hours</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Gross Tonnage</p>
                <p className="font-medium">{vessel.simulation.data.gross_tonnage.toLocaleString()} GT</p>
              </div>
            </div>
            
            {/* Energy Consumption Information */}
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs text-gray-500">Est. Energy Consumption</p>
                  <p className="font-medium text-blue-700">{calculateTotalEnergy(vessel.simulation).toFixed(2)} kWh</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Based on</p>
                  <p className="font-medium">{vessel.simulation.closest_ship} model</p>
                </div>
              </div>
            </div>
          </div>
          
          {vessel.simulation.data.energy_profile_data && vessel.simulation.data.energy_profile_data.length > 0 && (
            <div className="mt-4">
              <Link 
                href={`/vessel/${encodeURIComponent(vessel.name.replace(/\s+/g, '-').toLowerCase())}?date=${vessel.simulation.data.energy_profile_data[0]?.Timestamp?.split(' ')[0] || ''}`}
                className="block w-full py-2 px-4 text-center bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors duration-200"
                onClick={onClose}
              >
                View Energy Profile
              </Link>
            </div>
          )}
        </>
      ) : (
        <div className="bg-yellow-50 p-3 rounded-lg my-3 text-yellow-800">
          <p>No detailed information available for this vessel.</p>
        </div>
      )}
    </div>
  );
};

export default VesselDetailsPopover; 