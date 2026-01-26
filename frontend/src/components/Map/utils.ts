import { SimulationDetail } from '@/services/VesselSimulationService';

/**
 * Parse time string to hours (handles both HH:MM:SS and YYYY-MM-DD HH:MM:SS formats)
 */
const parseTimeToHours = (timeStr: string): number => {
  // Check if it's full datetime format (YYYY-MM-DD HH:MM:SS)
  if (timeStr.includes(' ')) {
    const timePart = timeStr.split(' ')[1]; // Get HH:MM:SS part
    const [hours, minutes] = timePart.split(':').map(Number);
    return hours + minutes / 60;
  }
  
  // Old format (HH:MM:SS)
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours + minutes / 60;
};

/**
 * Parse time string to Date object (handles both formats)
 */
const parseTimeToDate = (timeStr: string): Date => {
  // Check if it's full datetime format (YYYY-MM-DD HH:MM:SS)
  if (timeStr.includes(' ')) {
    return new Date(timeStr);
  }
  
  // Old format (HH:MM:SS) - use today's date
  const today = new Date();
  const [hours, minutes, seconds] = timeStr.split(':').map(Number);
  today.setHours(hours, minutes, seconds || 0, 0);
  return today;
};

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
  
  // Use full datetime parsing if available for accurate multi-day calculation
  if (simulation.data.arrival_time.includes(' ') && simulation.data.departure_time.includes(' ')) {
    const arrivalDate = parseTimeToDate(simulation.data.arrival_time);
    const departureDate = parseTimeToDate(simulation.data.departure_time);
    return (departureDate.getTime() - arrivalDate.getTime()) / (1000 * 60 * 60);
  }
  
  // Fall back to time-only calculation for backward compatibility
  const arrivalHours = parseTimeToHours(simulation.data.arrival_time);
  let departureHours = parseTimeToHours(simulation.data.departure_time);
  
  // If departure time is less than arrival time, the vessel stayed overnight
  // Add 24 hours to account for the next day
  if (departureHours < arrivalHours) {
    departureHours += 24;
  }
  
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