// MapCoordinatesHelper.tsx

import React, { useState } from 'react';
import { MapRef } from 'react-map-gl/maplibre';

// Types for boat paths data structure
interface PathPoint {
  longitude: number;
  latitude: number;
  elevation: number;
}

interface BoatPath {
  points: PathPoint[];
  dockingTime: number;
  direction: number; // 0 for coming to port, 1 for leaving port
}

interface MapCoordinatesHelperProps {
  mapRef: React.RefObject<MapRef>;
  paths: BoatPath[];
  onPathsUpdated: (paths: BoatPath[]) => void;
}

export const MapCoordinatesHelper: React.FC<MapCoordinatesHelperProps> = ({ 
  mapRef, 
  paths, 
  onPathsUpdated 
}) => {
  const [activePath, setActivePath] = useState<number>(0);
  const [editMode, setEditMode] = useState<boolean>(false);
  const [isRecordingPath, setIsRecordingPath] = useState<boolean>(false);
  const [recordedPoints, setRecordedPoints] = useState<PathPoint[]>([]);
  const [showControls, setShowControls] = useState<boolean>(true);
  
  // Clone paths to avoid direct mutation
  const [workingPaths, setWorkingPaths] = useState<BoatPath[]>(JSON.parse(JSON.stringify(paths)));
  
  // Toggle edit mode
  const toggleEditMode = (): void => {
    if (editMode && hasChanges()) {
      const confirmed = window.confirm("You have unsaved changes. Apply changes?");
      if (confirmed) {
        applyChanges();
      }
    }
    setEditMode(!editMode);
  };
  
  // Check if there are unsaved changes
  const hasChanges = (): boolean => {
    return JSON.stringify(workingPaths) !== JSON.stringify(paths);
  };
  
  // Apply changes and notify parent
  const applyChanges = (): void => {
    onPathsUpdated(workingPaths);
  };
  
  // Start recording map clicks as path points
  const startRecordPath = (): void => {
    if (mapRef && mapRef.current) {
      setIsRecordingPath(true);
      setRecordedPoints([]);
      
      // Add a temporary click handler to the map
      const map = mapRef.current.getMap();
      map.on('click', handleMapClick);
      
      // Inform the user
      alert("Recording path. Click on the map to add points. Click 'Stop Recording' when finished.");
    } else {
      alert("Map not ready. Please try again.");
    }
  };
  
  // Handle map clicks when recording a path
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleMapClick = (e: any): void => {
    const newPoint: PathPoint = {
      longitude: e.lngLat.lng,
      latitude: e.lngLat.lat,
      elevation: 0
    };
    
    setRecordedPoints(prev => [...prev, newPoint]);
  };
  
  // Stop recording and add points to current path
  const stopRecordPath = (): void => {
    if (mapRef && mapRef.current) {
      // Remove the click handler
      const map = mapRef.current.getMap();
      map.off('click', handleMapClick);
      
      if (recordedPoints.length > 0) {
        // Update the working paths with recorded points
        const updatedPaths = [...workingPaths];
        updatedPaths[activePath] = {
          ...updatedPaths[activePath],
          points: recordedPoints
        };
        
        setWorkingPaths(updatedPaths);
      }
      
      setIsRecordingPath(false);
    }
  };
  
  // Add a single point to the current path
  const addPoint = (): void => {
    if (mapRef && mapRef.current) {
      const map = mapRef.current.getMap();
      const center = map.getCenter();
      
      const newPoint: PathPoint = {
        longitude: center.lng,
        latitude: center.lat,
        elevation: 0
      };
      
      const updatedPaths = [...workingPaths];
      updatedPaths[activePath] = {
        ...updatedPaths[activePath],
        points: [...updatedPaths[activePath].points, newPoint]
      };
      
      setWorkingPaths(updatedPaths);
    }
  };
  
  // Remove the last point from the current path
  const removeLastPoint = (): void => {
    const updatedPaths = [...workingPaths];
    const currentPoints = [...updatedPaths[activePath].points];
    
    if (currentPoints.length > 0) {
      currentPoints.pop();
      updatedPaths[activePath] = {
        ...updatedPaths[activePath],
        points: currentPoints
      };
      
      setWorkingPaths(updatedPaths);
    }
  };
  
  // Update a point in the current path
  const updatePoint = (pointIndex: number, field: keyof PathPoint, value: string): void => {
    const updatedPaths = [...workingPaths];
    const currentPoints = [...updatedPaths[activePath].points];
    
    currentPoints[pointIndex] = {
      ...currentPoints[pointIndex],
      [field]: parseFloat(value)
    };
    
    updatedPaths[activePath] = {
      ...updatedPaths[activePath],
      points: currentPoints
    };
    
    setWorkingPaths(updatedPaths);
  };
  
  // Calculate boat rotation between two points
  const calculateRotation = (startPoint: PathPoint, endPoint: PathPoint, direction: number): string => {
    const dx = endPoint.longitude - startPoint.longitude;
    const dy = endPoint.latitude - startPoint.latitude;
    let angle = Math.atan2(dy, dx) * (180 / Math.PI) - 90;
    
    // For leaving port, add 180 degrees
    if (direction === 1) {
      angle += 180;
    }
    
    return angle.toFixed(1);
  };
  
  // Toggle the direction of the path (arriving/leaving)
  const toggleDirection = (): void => {
    const updatedPaths = [...workingPaths];
    updatedPaths[activePath] = {
      ...updatedPaths[activePath],
      direction: updatedPaths[activePath].direction === 0 ? 1 : 0
    };
    
    setWorkingPaths(updatedPaths);
  };
  
  // Add a new path
  const addNewPath = (): void => {
    const newPath: BoatPath = {
      points: [],
      dockingTime: 0,
      direction: 0
    };
    
    setWorkingPaths([...workingPaths, newPath]);
    setActivePath(workingPaths.length);
  };
  
  // Delete the current path
  const deletePath = (): void => {
    if (workingPaths.length <= 1) {
      alert("Cannot delete the only path.");
      return;
    }
    
    const updatedPaths = workingPaths.filter((_, index) => index !== activePath);
    setWorkingPaths(updatedPaths);
    setActivePath(Math.max(0, activePath - 1));
  };
  
  // Update docking time
  const updateDockingTime = (value: string): void => {
    const updatedPaths = [...workingPaths];
    updatedPaths[activePath] = {
      ...updatedPaths[activePath],
      dockingTime: parseInt(value, 10)
    };
    
    setWorkingPaths(updatedPaths);
  };
  
  // Export paths to console for copy-paste
  const exportPaths = (): void => {
    console.log(JSON.stringify(workingPaths, null, 2));
    alert("Paths exported to console. Press F12 to open developer tools and copy the data.");
  };
  
  // Copy current coordinates to clipboard
  const copyCurrentCoordinates = (): void => {
    if (mapRef && mapRef.current) {
      const map = mapRef.current.getMap();
      const center = map.getCenter();
      
      const coordText = `{ longitude: ${center.lng.toFixed(8)}, latitude: ${center.lat.toFixed(8)}, elevation: 0 }`;
      navigator.clipboard.writeText(coordText).then(() => {
        alert("Current coordinates copied to clipboard.");
      });
    }
  };
  
  // Component styling
  const styles = {
    container: {
      position: 'absolute',
      bottom: showControls ? '10px' : '-340px',
      left: '10px',
      backgroundColor: 'white',
      padding: '10px',
      borderRadius: '5px',
      boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
      zIndex: 1000,
      maxWidth: '400px',
      maxHeight: '80vh',
      overflowY: 'auto',
      transition: 'bottom 0.3s ease'
    } as React.CSSProperties,
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: '10px'
    } as React.CSSProperties,
    toggleButton: {
      position: 'absolute',
      bottom: '10px',
      left: '10px',
      zIndex: 999,
      padding: '5px 10px',
      backgroundColor: '#4a89dc',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer'
    } as React.CSSProperties,
    editModeIndicator: {
      padding: '3px 6px',
      backgroundColor: editMode ? '#4CAF50' : '#9E9E9E',
      color: 'white',
      borderRadius: '3px',
      fontSize: '12px',
      marginLeft: '10px'
    } as React.CSSProperties,
    pointList: {
      marginTop: '10px',
      border: '1px solid #ddd',
      borderRadius: '4px',
      padding: '5px'
    } as React.CSSProperties,
    point: {
      marginBottom: '10px',
      padding: '5px',
      borderBottom: '1px dashed #eee'
    } as React.CSSProperties,
    coordInput: {
      width: '80px',
      padding: '3px',
      margin: '0 5px'
    } as React.CSSProperties,
    buttonGroup: {
      display: 'flex',
      gap: '5px',
      marginTop: '10px',
      flexWrap: 'wrap'
    } as React.CSSProperties,
    button: {
      padding: '5px 10px',
      backgroundColor: '#4a89dc',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer'
    } as React.CSSProperties,
    dangerButton: {
      backgroundColor: '#e74c3c'
    } as React.CSSProperties,
    successButton: {
      backgroundColor: '#2ecc71'
    } as React.CSSProperties,
    warningButton: {
      backgroundColor: '#f39c12'
    } as React.CSSProperties,
    recordingIndicator: {
      color: '#e74c3c',
      fontWeight: 'bold',
      marginTop: '5px'
    } as React.CSSProperties,
    pathSelector: {
      marginBottom: '10px',
      display: 'flex',
      alignItems: 'center'
    } as React.CSSProperties,
    directionBadge: {
      padding: '2px 6px',
      borderRadius: '10px',
      fontSize: '12px',
      backgroundColor: workingPaths[activePath]?.direction === 0 ? '#3498db' : '#e74c3c',
      color: 'white',
      marginLeft: '10px'
    } as React.CSSProperties
  };
  
  return (
    <>
      {!showControls && (
        <button 
          style={styles.toggleButton}
          onClick={() => setShowControls(true)}
        >
          Show Map Tools
        </button>
      )}
      
      <div style={styles.container}>
        <div style={styles.header}>
          <h3>Map Coordinates Helper
            <span style={styles.editModeIndicator}>{editMode ? 'Edit Mode ON' : 'View Mode'}</span>
          </h3>
          <button onClick={() => setShowControls(false)}>Hide</button>
        </div>
        
        <div style={styles.pathSelector}>
          <select 
            value={activePath} 
            onChange={(e) => setActivePath(parseInt(e.target.value, 10))}
            disabled={!editMode || isRecordingPath}
          >
            {workingPaths.map((path, index) => (
              <option key={index} value={index}>Path {index + 1}</option>
            ))}
          </select>
          <span style={styles.directionBadge}>
            {workingPaths[activePath]?.direction === 0 ? 'Arriving' : 'Departing'}
          </span>
        </div>
        
        <div>
          <label>
            Docking Time (ms):
            <input 
              type="number" 
              value={workingPaths[activePath]?.dockingTime || 0} 
              onChange={(e) => updateDockingTime(e.target.value)}
              disabled={!editMode || isRecordingPath}
              style={{width: '100px', marginLeft: '5px'}}
            />
          </label>
        </div>
        
        {editMode && (
          <div style={styles.buttonGroup}>
            <button 
              style={styles.button}
              onClick={toggleDirection}
              disabled={isRecordingPath}
            >
              Toggle Direction
            </button>
            <button 
              style={{...styles.button, ...styles.warningButton}}
              onClick={copyCurrentCoordinates}
            >
              Copy Current Coords
            </button>
          </div>
        )}
        
        {isRecordingPath && (
          <div style={styles.recordingIndicator}>
            Recording Path: {recordedPoints.length} points added
          </div>
        )}
        
        <div style={styles.pointList}>
          <h4>Path Points</h4>
          {workingPaths[activePath]?.points.map((point, idx) => (
            <div key={idx} style={styles.point}>
              <div>Point {idx + 1}:</div>
              {editMode && !isRecordingPath ? (
                <>
                  <div>
                    Lng: 
                    <input 
                      type="number" 
                      value={point.longitude} 
                      onChange={(e) => updatePoint(idx, 'longitude', e.target.value)}
                      style={styles.coordInput}
                      step="0.000001"
                    />
                    Lat: 
                    <input 
                      type="number" 
                      value={point.latitude} 
                      onChange={(e) => updatePoint(idx, 'latitude', e.target.value)}
                      style={styles.coordInput}
                      step="0.000001"
                    />
                  </div>
                </>
              ) : (
<div>Lng: {point.longitude.toFixed(8)}, Lat: {point.latitude.toFixed(8)}</div>
              )}
              {idx < workingPaths[activePath]?.points.length - 1 && (
                <div style={{fontSize: '12px', color: '#666', marginTop: '3px'}}>
                  Rotation to next: {calculateRotation(point, workingPaths[activePath]?.points[idx + 1], workingPaths[activePath]?.direction)}°
                </div>
              )}
            </div>
          ))}
          
          {workingPaths[activePath]?.points.length === 0 && (
            <div style={{color: '#666', fontStyle: 'italic'}}>No points added yet</div>
          )}
        </div>
        
        <div style={styles.buttonGroup}>
          <button 
            style={{...styles.button, ...(!editMode ? {opacity: 0.5} : {})}}
            onClick={toggleEditMode}
          >
            {editMode ? 'Exit Edit Mode' : 'Enter Edit Mode'}
          </button>
          
          {editMode && (
            <>
              <button 
                style={{...styles.button, ...styles.successButton}}
                onClick={applyChanges}
                disabled={!hasChanges()}
              >
                Apply Changes
              </button>
              
              {isRecordingPath ? (
                <button 
                  style={{...styles.button, ...styles.dangerButton}}
                  onClick={stopRecordPath}
                >
                  Stop Recording
                </button>
              ) : (
                <button 
                  style={{...styles.button}}
                  onClick={startRecordPath}
                >
                  Record New Path
                </button>
              )}
              
              <button 
                style={{...styles.button}}
                onClick={addPoint}
                disabled={isRecordingPath}
              >
                Add Current Point
              </button>
              
              <button 
                style={{...styles.button, ...styles.warningButton}}
                onClick={removeLastPoint}
                disabled={isRecordingPath || workingPaths[activePath]?.points.length === 0}
              >
                Remove Last Point
              </button>
              
              <button 
                style={{...styles.button}}
                onClick={addNewPath}
                disabled={isRecordingPath}
              >
                Add New Path
              </button>
              
              <button 
                style={{...styles.button, ...styles.dangerButton}}
                onClick={deletePath}
                disabled={isRecordingPath || workingPaths.length <= 1}
              >
                Delete Path
              </button>
              
              <button 
                style={{...styles.button, ...styles.successButton}}
                onClick={exportPaths}
              >
                Export Paths
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
};