#!/bin/bash

# Set up logging
LOG_FILE="simulation_service.log"
LOCK_FILE="/tmp/simulation_service.lock"

# Function to check if another instance is running
check_single_instance() {
    if [ -f "$LOCK_FILE" ]; then
        local pid=$(cat "$LOCK_FILE")
        if ps -p "$pid" > /dev/null 2>&1; then
            echo "Another instance is already running (PID: $pid). Exiting."
            exit 1
        else
            echo "Stale lock file found. Removing..."
            rm -f "$LOCK_FILE"
        fi
    fi
    
    # Create lock file with current PID
    echo $$ > "$LOCK_FILE"
}

# Function to remove lock file
remove_lock() {
    rm -f "$LOCK_FILE"
}

# Set up logging (redirect after lock check to avoid log conflicts)
exec 1> >(tee -a "$LOG_FILE")
exec 2>&1

echo "=== Starting simulation service at $(date) ==="

# Check for single instance
check_single_instance

# Debug: Print environment information
echo "=== ENVIRONMENT DEBUG INFO ==="
echo "Current working directory: $(pwd)"
echo "Script directory: $(dirname "$0")"
echo "User: $(whoami)"
echo "Shell: $SHELL"
echo "PATH: $PATH"
echo "PYTHONPATH: $PYTHONPATH"

# Get absolute paths
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
VENV_PATH="$SCRIPT_DIR/venv"
PYTHON_PATH="$VENV_PATH/bin/python"
MAIN_SCRIPT="$SCRIPT_DIR/main.py"
CONFIG_FILE="$SCRIPT_DIR/temp_config.json"

echo "=== PATH DEBUG INFO ==="
echo "Script directory (absolute): $SCRIPT_DIR"
echo "Virtual environment: $VENV_PATH"
echo "Python executable: $PYTHON_PATH"
echo "Main script: $MAIN_SCRIPT"
echo "Config file: $CONFIG_FILE"

# Check if files exist
echo "=== FILE EXISTENCE CHECK ==="
[ -f "$PYTHON_PATH" ] && echo "✓ Python executable exists" || echo "✗ Python executable NOT found"
[ -f "$MAIN_SCRIPT" ] && echo "✓ Main script exists" || echo "✗ Main script NOT found"
[ -f "$CONFIG_FILE" ] && echo "✓ Config file exists" || echo "✗ Config file NOT found"
[ -d "$VENV_PATH" ] && echo "✓ Virtual environment directory exists" || echo "✗ Virtual environment directory NOT found"

# Function to run the simulation
run_simulation() {
    echo "=== Starting simulation at $(date) ==="
    
    # Change to script directory
    cd "$SCRIPT_DIR"
    echo "Changed to directory: $(pwd)"
    
    # Check if virtual environment activation works
    if [ -f "$VENV_PATH/bin/activate" ]; then
        echo "Activating virtual environment..."
        source "$VENV_PATH/bin/activate"
        echo "Virtual environment activated"
        echo "Python version: $(python --version)"
        echo "Python path: $(which python)"
    else
        echo "ERROR: Virtual environment activation script not found!"
        return 1
    fi
    
    # Verify Python can import required modules
    echo "=== PYTHON MODULE CHECK ==="
    python -c "
import sys
print(f'Python executable: {sys.executable}')
print(f'Python version: {sys.version}')
print(f'Python path: {sys.path[:3]}...')

# Test critical imports
try:
    import pandas as pd
    print('✓ pandas imported successfully')
except ImportError as e:
    print(f'✗ pandas import failed: {e}')

try:
    import numpy as np
    print('✓ numpy imported successfully')
except ImportError as e:
    print(f'✗ numpy import failed: {e}')

try:
    import json
    print('✓ json imported successfully')
except ImportError as e:
    print(f'✗ json import failed: {e}')
"
    
    # Check if config file is readable
    if [ -f "$CONFIG_FILE" ]; then
        echo "Config file size: $(wc -c < "$CONFIG_FILE") bytes"
        echo "Config file first few lines:"
        head -5 "$CONFIG_FILE" 2>/dev/null || echo "Could not read config file"
    fi
    
    # Run the simulation with explicit paths and verbose output
    echo "=== RUNNING MAIN SIMULATION ==="
    echo "Command: $PYTHON_PATH $MAIN_SCRIPT --config $CONFIG_FILE"
    
    # Set environment variables that might be needed
    export PYTHONUNBUFFERED=1
    export PYTHONDONTWRITEBYTECODE=1
    
    # Run with timeout to prevent hanging
    timeout 300 "$PYTHON_PATH" "$MAIN_SCRIPT" --config "$CONFIG_FILE"
    local exit_code=$?
    
    echo "=== SIMULATION COMPLETED ==="
    echo "Exit code: $exit_code"
    echo "Simulation completed at $(date)"
    
    if [ $exit_code -eq 124 ]; then
        echo "WARNING: Simulation timed out after 300 seconds"
    elif [ $exit_code -ne 0 ]; then
        echo "ERROR: Simulation failed with exit code $exit_code"
    else
        echo "SUCCESS: Simulation completed successfully"
    fi
    
    return $exit_code
}

# Function to handle script termination
cleanup() {
    echo "=== Stopping simulation service at $(date)... ==="
    # Kill any remaining Python processes running main.py
    pkill -f "python.*main.py" || true
    # Remove lock file
    remove_lock
    exit 0
}

# Set up trap to catch termination signals
trap cleanup SIGINT SIGTERM EXIT

echo "Simulation service initialized, starting main loop..."

# Main loop with error handling
while true; do
    if run_simulation; then
        echo "Simulation completed successfully"
    else
        echo "Simulation failed, will retry in next cycle"
    fi
    
    echo "Waiting 60 seconds before next simulation..."
    sleep 60
done