'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, History, Radio, GripVertical } from 'lucide-react';

interface TimeSliderProps {
  startTime: Date;
  endTime: Date;
  currentTime: Date;
  onTimeChange: (time: Date) => void;
  isPlaying: boolean;
  onPlayPause: () => void;
  onReset: () => void;
}

export default function TimeSlider({
  startTime,
  endTime,
  currentTime,
  onTimeChange,
  isPlaying,
  onPlayPause,
  onReset
}: TimeSliderProps) {
  const [isDraggingSlider, setIsDraggingSlider] = useState(false);
  const [isDraggingPanel, setIsDraggingPanel] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [hasInitialized, setHasInitialized] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const totalDuration = endTime.getTime() - startTime.getTime();
  const currentProgress = ((currentTime.getTime() - startTime.getTime()) / totalDuration) * 100;
  const isLive = currentProgress >= 99.9;

  // Initialize panel position in top right corner
  useEffect(() => {
    if (!hasInitialized && panelRef.current) {
      const rect = panelRef.current.getBoundingClientRect();
      setPosition({
        x: window.innerWidth - rect.width - 284, // 24px from right edge
        y: 24 // 10px from top (closer to top)
      });
      setHasInitialized(true);
    }
  }, [hasInitialized]);

  // Panel drag handlers
  const handlePanelMouseDown = (e: React.MouseEvent) => {
    if (!panelRef.current) return;
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
    setIsDraggingPanel(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingPanel) {
        const newX = e.clientX - dragOffset.x;
        const newY = e.clientY - dragOffset.y;
        setPosition({ x: newX, y: newY });
      }
    };

    const handleMouseUp = () => {
      setIsDraggingPanel(false);
    };

    if (isDraggingPanel) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingPanel, dragOffset]);

  // Slider drag handlers
  const handleSliderMouseDown = (e: React.MouseEvent) => {
    setIsDraggingSlider(true);
    updateTimeFromPosition(e.clientX);
  };

  const updateTimeFromPosition = (clientX: number) => {
    if (!sliderRef.current) return;

    const rect = sliderRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percentage = x / rect.width;
    const newTime = new Date(startTime.getTime() + percentage * totalDuration);
    onTimeChange(newTime);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingSlider) {
        updateTimeFromPosition(e.clientX);
      }
    };

    const handleMouseUp = () => {
      setIsDraggingSlider(false);
    };

    if (isDraggingSlider) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingSlider]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  const getRelativeTime = () => {
    const diffMs = endTime.getTime() - currentTime.getTime();
    const diffMins = Math.round(diffMs / 60000);
    
    if (diffMins < 1) return 'Live data';
    if (diffMins < 60) return `${diffMins} min ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    const remainingMins = diffMins % 60;
    return `${diffHours}h ${remainingMins}m ago`;
  };

  return (
    <div 
      ref={panelRef}
      style={hasInitialized ? { left: `${position.x}px`, top: `${position.y}px` } : undefined}
      className={`${hasInitialized ? 'absolute' : 'absolute top-2.5 right-9'} bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 z-10 w-[500px] ${isDraggingPanel ? 'cursor-grabbing' : ''}`}
    >
      {/* Draggable Header */}
      <div 
        className="flex items-center justify-center px-2 py-1 border-b border-gray-200 dark:border-gray-700 cursor-grab active:cursor-grabbing"
        onMouseDown={handlePanelMouseDown}
      >
        <GripVertical className="h-3 w-3 text-gray-400" />
      </div>

      <div className="px-3 py-2">
        {/* Compact Header: Mode Indicator + Time Display + Back to Live */}
        <div className="flex items-center justify-between mb-2">
          {/* Left: Mode Indicator */}
          <div className="flex items-center space-x-1.5">
            {isLive ? (
              <>
                <div className="relative">
                  <Radio className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                  <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                </div>
                <div>
                  <span className="text-xs font-bold text-green-600 dark:text-green-400 uppercase tracking-wide">
                    LIVE
                  </span>
                </div>
              </>
            ) : (
              <>
                <History className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                <div>
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide">
                    HISTORICAL
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Center: Time Display */}
          <div className="text-center bg-gray-50 dark:bg-gray-900/50 rounded-lg py-1 px-3">
            <div className="text-lg font-bold text-gray-900 dark:text-gray-100 tabular-nums">
              {formatTime(currentTime)}
            </div>
          </div>
          
          {/* Right: Back to Live Button */}
          <button
            onClick={onReset}
            disabled={isLive}
            className={`flex items-center space-x-1 px-2 py-1 rounded-lg text-xs font-medium transition-all ${
              isLive 
                ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50'
            }`}
            title="Return to live data"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Back</span>
          </button>
        </div>

        {/* Slider with Clear Labels */}
        <div className="mb-2">
          <div
            ref={sliderRef}
            className="relative h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full cursor-pointer hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            onMouseDown={handleSliderMouseDown}
          >
            {/* Progress Bar */}
            <div
              className={`absolute h-full rounded-full transition-all duration-150 ${
                isLive 
                  ? 'bg-gradient-to-r from-green-500 to-green-600' 
                  : 'bg-gradient-to-r from-amber-500 to-amber-600'
              }`}
              style={{ width: `${currentProgress}%` }}
            />
            
            {/* Thumb */}
            <div
              className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 bg-white dark:bg-gray-800 rounded-full shadow-lg cursor-grab active:cursor-grabbing transition-all ${
                isLive 
                  ? 'border-2 border-green-500' 
                  : 'border-2 border-amber-500'
              }`}
              style={{ left: `${currentProgress}%` }}
            />
          </div>

          {/* Time Range Labels - Fixed: Left = Past, Right = Now */}
          <div className="flex justify-between mt-1 text-xs text-gray-600 dark:text-gray-400">
            <span>{formatTime(startTime)}</span>
            <span>{formatTime(endTime)}</span>
          </div>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center justify-center pt-1.5 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onPlayPause}
            disabled={isLive}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
              isLive
                ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                : isPlaying
                  ? 'bg-amber-500 hover:bg-amber-600 text-white'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
            title={isPlaying ? 'Pause playback' : 'Auto-play through history'}
          >
            {isPlaying ? (
              <>
                <Pause className="h-3 w-3" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="h-3 w-3 ml-0.5" />
                <span>Play</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
