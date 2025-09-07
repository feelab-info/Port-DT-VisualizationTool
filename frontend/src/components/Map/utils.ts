import { SimulationDetail } from '@/services/VesselSimulationService';

/**
 * Calculate total energy consumption from a vessel simulation
 */
export const calculateTotalEnergy = (simulation: SimulationDetail): number => {
  if (!simulation.data.energy_profile_data || simulation.data.energy_profile_data.length === 0) {
    return 0;
  }
  
  return simulation.data.energy_profile_data.reduce((sum, point) => {
    return sum + (point['Chillers Power'] + point['Hotel Power']);
  }, 0) / 12; // Assuming 5-minute intervals (12 readings per hour)
};

/**
 * Calculate stay duration in hours from a vessel simulation
 */
export const getStayDuration = (simulation: SimulationDetail): number => {
  if (!simulation.data.arrival_time || !simulation.data.departure_time) {
    return 0;
  }
  
  const arrivalParts = simulation.data.arrival_time.split(':').map(Number);
  const departureParts = simulation.data.departure_time.split(':').map(Number);
  
  const arrivalHours = arrivalParts[0] + arrivalParts[1] / 60;
  const departureHours = departureParts[0] + departureParts[1] / 60;
  
  return departureHours - arrivalHours;
};

/**
 * Smoothly interpolate between angles with the shortest path
 */
export const smoothRotation = (currentRotation: number, targetRotation: number, smoothFactor = 0.1): number => {
  // Find the shortest angle between the current and target rotations
  let angleDiff = targetRotation - currentRotation;
  
  // Normalize the angle difference to be between -180 and 180 degrees
  if (angleDiff > 180) angleDiff -= 360;
  if (angleDiff < -180) angleDiff += 360;
  
  // Apply smoothing
  return currentRotation + angleDiff * smoothFactor;
}; 