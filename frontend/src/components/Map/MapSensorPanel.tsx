'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { EnergyData } from '@/services/EnergyDataService';
import { Activity, Zap, ChevronLeft, ChevronRight, Waves, GripVertical } from 'lucide-react';

export interface MapSensorPanelProps {
  energyData: EnergyData[];
  isVisible?: boolean;
  selectedTime?: Date; // Optional: if provided, shows data at this specific time instead of latest
}

export default function MapSensorPanel({ energyData, isVisible = true, selectedTime }: MapSensorPanelProps) {
  const [selectedDeviceIndex, setSelectedDeviceIndex] = useState(0);
  // Use fixed initial position - will be properly set in useEffect
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 60, y: window.innerHeight - 400 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const panelRef = useRef<HTMLDivElement>(null);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Get unique devices with data at selected time (or latest if no time selected)
  // Always call hooks before any conditional returns
  const devices = useMemo(() => {
    if (!energyData || energyData.length === 0) return [];
    
    const deviceMap = new Map<string, EnergyData>();
    
    if (selectedTime) {
      // Filter data to only include points at or before selected time
      const targetTime = selectedTime.getTime();
      const filteredData = energyData.filter(
        item => new Date(item.timestamp).getTime() <= targetTime
      );
      
      // Get the closest data point for each device at the selected time
      filteredData.forEach(item => {
        const existing = deviceMap.get(item.device);
        const itemTime = new Date(item.timestamp).getTime();
        
        if (!existing) {
          deviceMap.set(item.device, item);
        } else {
          const existingTime = new Date(existing.timestamp).getTime();
          // Keep the data point closest to selected time
          if (Math.abs(targetTime - itemTime) < Math.abs(targetTime - existingTime)) {
            deviceMap.set(item.device, item);
          }
        }
      });
    } else {
      // Get the latest data for each device (live mode)
      energyData.forEach(item => {
        const existing = deviceMap.get(item.device);
        if (!existing || new Date(item.timestamp) > new Date(existing.timestamp)) {
          deviceMap.set(item.device, item);
        }
      });
    }
    
    return Array.from(deviceMap.values()).sort((a, b) => {
      const aName = a.deviceName || a.device;
      const bName = b.deviceName || b.device;
      return aName.localeCompare(bName);
    });
  }, [energyData, selectedTime]);

  // Initialize position on first load to ensure it's in the bottom left corner
  // Only run once on first render when panel ref is available
  useEffect(() => {
    if (!hasInitialized && panelRef.current) {
      // Calculate position for bottom left corner
      const viewportHeight = window.innerHeight;
      const panelHeight = panelRef.current.offsetHeight || 350;
      
      setPosition({
        x: 60, // Left side (240px sidebar + 10px margin)
        y: viewportHeight - panelHeight - 24 // Bottom corner with 24px margin from bottom
      });
      setHasInitialized(true);
    }
  }, [hasInitialized]);

  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    // Calculate offset from mouse position to current position state (not DOM position)
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
    setIsDragging(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        // Calculate new position relative to viewport
        const newX = e.clientX - dragOffset.x;
        const newY = e.clientY - dragOffset.y;
        
        // Keep panel within viewport bounds
        const maxX = window.innerWidth - (panelRef.current?.offsetWidth || 0) - 24;
        const maxY = window.innerHeight - (panelRef.current?.offsetHeight || 0) - 24;
        
        setPosition({
          x: Math.max(24, Math.min(newX, maxX)),
          y: Math.max(24, Math.min(newY, maxY))
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  // Early return after all hooks are called
  if (!isVisible) return null;

  if (devices.length === 0) {
    return (
      <div 
        ref={panelRef}
        style={{ left: `${position.x}px`, top: `${position.y}px` }}
        className="absolute bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-3 w-64 z-10"
      >
        <div className="flex items-center justify-center text-gray-500 dark:text-gray-400">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
          <span className="text-xs">Waiting for sensor data...</span>
        </div>
      </div>
    );
  }

  // Keep selectedDeviceIndex in bounds
  const currentIndex = Math.min(selectedDeviceIndex, devices.length - 1);
  const currentDevice = devices[currentIndex];

  const handlePrevDevice = () => {
    setSelectedDeviceIndex((prev) => (prev > 0 ? prev - 1 : devices.length - 1));
  };

  const handleNextDevice = () => {
    setSelectedDeviceIndex((prev) => (prev < devices.length - 1 ? prev + 1 : 0));
  };

  const totalPower = (currentDevice.L1?.P || 0) + (currentDevice.L2?.P || 0) + (currentDevice.L3?.P || 0);
  const totalCurrent = (currentDevice.L1?.I || 0) + (currentDevice.L2?.I || 0) + (currentDevice.L3?.I || 0);
  const avgVoltage = ((currentDevice.L1?.V || 0) + (currentDevice.L2?.V || 0) + (currentDevice.L3?.V || 0)) / 3;
  const avgPowerFactor = ((currentDevice.L1?.PF || 0) + (currentDevice.L2?.PF || 0) + (currentDevice.L3?.PF || 0)) / 3;

  return (
    <div 
      ref={panelRef}
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
      className={`absolute bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 w-64 z-10 overflow-hidden ${isDragging ? 'cursor-grabbing' : ''}`}
    >
      {/* Header with Device Selector */}
      <div 
        className="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-700 dark:to-blue-800 px-2 py-1.5 cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-white font-semibold text-xs flex items-center">
            <GripVertical className="h-3 w-3 mr-1 opacity-60" />
            <Activity className="h-3 w-3 mr-1" />
            Sensors
          </h3>
          <div className="text-xs text-blue-100">
            {currentIndex + 1}/{devices.length}
          </div>
        </div>
        
        {/* Device Navigation */}
        <div className="flex items-center justify-between gap-1.5">
          <button
            onClick={handlePrevDevice}
            className="p-0.5 hover:bg-white/20 rounded transition-colors"
            title="Previous device"
          >
            <ChevronLeft className="h-3 w-3 text-white" />
          </button>
          
          <div className="flex-1 text-center">
            <p className="text-white font-semibold text-xs truncate">
              {currentDevice.deviceName || currentDevice.device}
            </p>
          </div>
          
          <button
            onClick={handleNextDevice}
            className="p-0.5 hover:bg-white/20 rounded transition-colors"
            title="Next device"
          >
            <ChevronRight className="h-3 w-3 text-white" />
          </button>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="p-2 space-y-1.5">
        {/* Total Power */}
        <div className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded p-1.5 border border-yellow-200 dark:border-yellow-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Zap className="h-3 w-3 text-yellow-600 dark:text-yellow-400 mr-1.5" />
              <span className="text-xs text-gray-600 dark:text-gray-400">Power</span>
            </div>
            <span className="text-xs font-bold text-gray-900 dark:text-gray-100">
              {Math.round(totalPower).toLocaleString()} W
            </span>
          </div>
        </div>

        {/* Three-Phase Power Details */}
        <div className="bg-gray-50 dark:bg-gray-900/50 rounded p-1.5 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center">
              <Waves className="h-2.5 w-2.5 mr-1" />
              3-Phase
            </span>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center">
                <div className="w-1.5 h-1.5 bg-red-500 rounded-full mr-1"></div>
                <span className="text-gray-600 dark:text-gray-400">L1</span>
              </div>
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                {Math.round(currentDevice.L1?.P || 0).toLocaleString()}W
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1"></div>
                <span className="text-gray-600 dark:text-gray-400">L2</span>
              </div>
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                {Math.round(currentDevice.L2?.P || 0).toLocaleString()}W
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-1"></div>
                <span className="text-gray-600 dark:text-gray-400">L3</span>
              </div>
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                {Math.round(currentDevice.L3?.P || 0).toLocaleString()}W
              </span>
            </div>
          </div>
        </div>

        {/* Voltage, Current, Power Factor - Combined */}
        <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded p-1.5 border border-purple-200 dark:border-purple-700">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">V</div>
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-red-600 dark:text-red-400">{Math.round(currentDevice.L1?.V || 0)}</div>
                <div className="text-xs font-bold text-green-600 dark:text-green-400">{Math.round(currentDevice.L2?.V || 0)}</div>
                <div className="text-xs font-bold text-blue-600 dark:text-blue-400">{Math.round(currentDevice.L3?.V || 0)}</div>
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">A</div>
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-red-600 dark:text-red-400">{(currentDevice.L1?.I || 0).toFixed(1)}</div>
                <div className="text-xs font-bold text-green-600 dark:text-green-400">{(currentDevice.L2?.I || 0).toFixed(1)}</div>
                <div className="text-xs font-bold text-blue-600 dark:text-blue-400">{(currentDevice.L3?.I || 0).toFixed(1)}</div>
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">PF</div>
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-red-600 dark:text-red-400">{(currentDevice.L1?.PF || 0).toFixed(2)}</div>
                <div className="text-xs font-bold text-green-600 dark:text-green-400">{(currentDevice.L2?.PF || 0).toFixed(2)}</div>
                <div className="text-xs font-bold text-blue-600 dark:text-blue-400">{(currentDevice.L3?.PF || 0).toFixed(2)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Timestamp */}
        <div className="text-center pt-1 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
            {new Date(currentDevice.timestamp).toLocaleTimeString('en-US', { 
              hour: '2-digit', 
              minute: '2-digit', 
              second: '2-digit',
              hour12: false 
            })}
          </p>
        </div>
      </div>
    </div>
  );
}
