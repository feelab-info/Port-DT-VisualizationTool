from flask import Flask, request, jsonify, send_file
import os
import subprocess
import json
import time
import sys
import logging
import math
import pandas as pd
import atexit
import signal
from openpyxl import load_workbook

# Ensure logs directory exists for file logging
os.makedirs("logs", exist_ok=True)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("logs/api_server.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Check and install required dependencies
required_packages = ['flask_cors', 'flask_socketio', 'openpyxl', 'pandas']
for package in required_packages:
    try:
        __import__(package)
    except ImportError:
        logger.info(f"Installing missing dependency: {package}")
        subprocess.run([sys.executable, '-m', 'pip', 'install', package], check=True)

# Now import the packages after ensuring they're installed
from flask_cors import CORS
from flask_socketio import SocketIO

# Add a custom JSON encoder to handle NaN values
class CustomJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, float) and math.isnan(obj):
            return None
        return super().default(obj)

# Function to replace NaN values with None in loaded JSON data
def replace_nan_with_none(obj):
    if isinstance(obj, dict):
        return {k: replace_nan_with_none(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [replace_nan_with_none(i) for i in obj]
    elif isinstance(obj, float) and math.isnan(obj):
        return None
    else:
        return obj

app = Flask(__name__)
# Set the custom JSON encoder for Flask
app.json_encoder = CustomJSONEncoder
# Enable CORS for all routes with proper configuration
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)
socketio = SocketIO(app, cors_allowed_origins="*")

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "OK", "service": "dc-power-flow"})

# Global variable to store the latest simulation results
latest_results = None

# Path to the device data JSON file
DEVICE_DATA_JSON = 'device_data.json'

# Global variable to store the simulation process
simulation_process = None

# Global variables
is_shutting_down = False

# Function to initialize the device data JSON file if it doesn't exist
def initialize_device_data_json():
    if not os.path.exists(DEVICE_DATA_JSON):
        # Create default device data with zeros for all 31 devices
        default_data = [{"device_id": f"D{i+1}", "value": 0} for i in range(31)]
        with open(DEVICE_DATA_JSON, 'w') as f:
            json.dump(default_data, f, indent=2)
        logger.info(f"Created default device data JSON file: {DEVICE_DATA_JSON}")
    else:
        logger.info(f"Device data JSON file already exists: {DEVICE_DATA_JSON}")

# Initialize the device data JSON file on startup
initialize_device_data_json()

# Function to get the current device data from JSON
def get_device_data():
    try:
        if os.path.exists(DEVICE_DATA_JSON):
            with open(DEVICE_DATA_JSON, 'r') as f:
                return json.load(f)
        else:
            # If file doesn't exist, initialize it
            initialize_device_data_json()
            with open(DEVICE_DATA_JSON, 'r') as f:
                return json.load(f)
    except Exception as e:
        logger.error(f"Error loading device data from JSON: {e}")
        # Return empty default data
        return [{"device_id": f"D{i+1}", "value": 0} for i in range(31)]

# Mock data to use when simulation fails
mock_bus_data = [
    {
        "vm_pu": 1.0,
        "va_degree": 0.0,
        "p_mw": 100.0,
        "q_mvar": 50.0
    },
    {
        "vm_pu": 0.98,
        "va_degree": -1.2,
        "p_mw": 80.0,
        "q_mvar": 40.0
    },
    {
        "vm_pu": 0.97,
        "va_degree": -2.5,
        "p_mw": 60.0,
        "q_mvar": 30.0
    }
]

def run_simulation_with_json_data(params=None):
    """Run the simulation with the current device data from JSON"""
    try:
        # Get current device data from JSON
        device_data = get_device_data()
        
        # Create a configuration that includes both scenario parameters and device data
        config = {
            "scenario": 2,  # Default scenario
        }
        
        # If additional parameters were provided, merge them
        if params:
            config.update(params)
        
        # Add the device data to the configuration
        config["device_data"] = device_data
        
        # Save the configuration to a temporary file
        with open('temp_config.json', 'w') as f:
            json.dump(config, f, cls=CustomJSONEncoder)
        
        # Get the absolute path to the script directory
        script_dir = os.path.dirname(os.path.abspath(__file__))
        
        # Create a new environment with the current environment variables
        env = os.environ.copy()
        
        # Add the script directory to PYTHONPATH
        if 'PYTHONPATH' in env:
            env['PYTHONPATH'] = f"{script_dir}:{env['PYTHONPATH']}"
        else:
            env['PYTHONPATH'] = script_dir
            
        # Run the simulation with the temporary configuration file
        process = subprocess.Popen(
            [sys.executable, 'main.py', '--config', 'temp_config.json'],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            cwd=script_dir,  # Set working directory to script directory
            env=env,  # Use the modified environment
            bufsize=1,  # Line buffered
            universal_newlines=True
        )
        
        # Set a timeout for the process
        try:
            stdout, stderr = process.communicate(timeout=300)  # 5 minute timeout
            
            if process.returncode != 0:
                logger.error(f"Simulation error: {stderr}")
                return {
                    'success': False,
                    'error': stderr,
                    'mock_data': True
                }
            
            logger.info(f"Simulation completed successfully. Output: {stdout[:200]}...")
            return {
                'success': True,
                'mock_data': False
            }
            
        except subprocess.TimeoutExpired:
            # Kill the process if it times out
            process.kill()
            logger.error("Simulation timed out after 5 minutes")
            return {
                'success': False,
                'error': 'Simulation timed out',
                'mock_data': True
            }
            
    except Exception as e:
        logger.error(f"Error running simulation with JSON data: {e}")
        return {
            'success': False,
            'error': str(e),
            'mock_data': True
        }

@app.route('/run-simulation', methods=['POST', 'OPTIONS'])
def run_simulation():
    """Run a simulation with the provided parameters and return results"""
    # Handle preflight OPTIONS request
    if request.method == 'OPTIONS':
        return _build_cors_preflight_response()
        
    try:
        # Get parameters from request
        params = request.json if request.is_json else {}
        
        # Run the simulation
        result = run_simulation_with_json_data(params)
        
        if not result['success']:
            return _corsify_response(jsonify({
                'res_bus': mock_bus_data,
                'is_mock': True
            }))
        
        # Return the path to the output file or the content directly
        output_file = 'output/output_evaluation_results_scenario_2_file.json'
        
        if os.path.exists(output_file):
            with open(output_file, 'r') as f:
                output_data = json.load(f)
                
                # Replace NaN values with None
                output_data = replace_nan_with_none(output_data)
                
            return _corsify_response(jsonify(output_data))
        else:
            logger.error(f"Output file not found: {output_file}")
            return _corsify_response(jsonify({
                'res_bus': mock_bus_data,
                'is_mock': True
            }))
    
    except Exception as e:
        logger.error(f"Error in run_simulation: {str(e)}")
        return _corsify_response(jsonify({
            'error': str(e),
            'res_bus': mock_bus_data,
            'is_mock': True
        }))

# Function to start the simulation service
def start_simulation_service():
    global simulation_process
    try:
        # Get the absolute path to the script directory
        script_dir = os.path.dirname(os.path.abspath(__file__))
        script_path = os.path.join(script_dir, 'run_simulation.sh')
        
        # Make the script executable
        os.chmod(script_path, 0o755)
        
        # Start the script in the background using bash
        simulation_process = subprocess.Popen(
            ['bash', script_path],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            preexec_fn=os.setpgrp,  # Create new process group
            cwd=script_dir,  # Set working directory to script directory
            env=os.environ.copy()  # Use current environment
        )
        
        # Check if process started successfully
        if simulation_process.poll() is not None:
            # Process ended immediately
            stdout, stderr = simulation_process.communicate()
            logger.error(f"Simulation service failed to start. Error: {stderr.decode()}")
            return False
        
        logger.info("Simulation service started successfully")
        return True
    except Exception as e:
        logger.error(f"Error starting simulation service: {str(e)}")
        return False

# Function to stop the simulation service
def stop_simulation_service():
    global simulation_process
    try:
        # Kill all processes running the simulation script
        subprocess.run(['pkill', '-f', 'run_simulation.sh'],
                      stdout=subprocess.PIPE,
                      stderr=subprocess.PIPE)
        
        # Also kill any remaining Python processes running main.py
        subprocess.run(['pkill', '-f', 'python.*main.py'],
                      stdout=subprocess.PIPE,
                      stderr=subprocess.PIPE)
        
        logger.info("Simulation service stopped")
        return True
    except Exception as e:
        logger.error(f"Error stopping simulation service: {str(e)}")
        return False

# Function to handle cleanup when the server stops
def cleanup():
    global is_shutting_down
    if is_shutting_down:
        return
    is_shutting_down = True
    
    logger.info("Cleaning up before server shutdown...")
    stop_simulation_service()
    
    # Give processes time to clean up
    time.sleep(1)

# Register cleanup function
atexit.register(cleanup)

# Handle SIGINT and SIGTERM signals
def signal_handler(signum, frame):
    logger.info(f"Received signal {signum}")
    cleanup()
    # Use os._exit to prevent further cleanup attempts
    os._exit(0)

# Register signal handlers
signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)

@app.route('/start-simulation-service', methods=['POST', 'OPTIONS'])
def api_start_simulation_service():
    """Start the simulation service using the shell script"""
    # Handle preflight OPTIONS request
    if request.method == 'OPTIONS':
        return _build_cors_preflight_response()
        
    if start_simulation_service():
        return _corsify_response(jsonify({'status': 'Simulation service started'}))
    else:
        return _corsify_response(jsonify({'error': 'Failed to start simulation service'})), 500

@app.route('/stop-simulation-service', methods=['POST', 'OPTIONS'])
def api_stop_simulation_service():
    """Stop the simulation service"""
    # Handle preflight OPTIONS request
    if request.method == 'OPTIONS':
        return _build_cors_preflight_response()
        
    if stop_simulation_service():
        return _corsify_response(jsonify({'status': 'Simulation service stopped'}))
    else:
        return _corsify_response(jsonify({'error': 'Failed to stop simulation service'})), 500

@app.route('/get-results/<scenario_id>', methods=['GET', 'OPTIONS'])
def get_results(scenario_id):
    """Get results for a specific scenario"""
    # Handle preflight OPTIONS request
    if request.method == 'OPTIONS':
        return _build_cors_preflight_response()
        
    try:
        file_path = f'output/output_evaluation_results_scenario_{scenario_id}_file.json'
        
        if not os.path.exists(file_path):
            return _corsify_response(jsonify({'error': 'Results not found'})), 404
            
        with open(file_path, 'r') as f:
            output_data = json.load(f)
            
            # Replace NaN values with None
            output_data = replace_nan_with_none(output_data)
            
        return _corsify_response(jsonify(output_data))
    
    except Exception as e:
        logger.error(f"Error in get_results: {str(e)}")
        return _corsify_response(jsonify({'error': str(e)})), 500

@app.route('/get-latest-results', methods=['GET', 'OPTIONS'])
def get_latest_results():
    """Get the latest simulation results"""
    # Handle preflight OPTIONS request
    if request.method == 'OPTIONS':
        return _build_cors_preflight_response()
        
    global latest_results
    
    if latest_results is None:
        # Return mock data if no simulation results are available
        mock_response = {
            'timestamp': time.time(),
            'res_bus': mock_bus_data,
            'is_mock': True
        }
        return _corsify_response(jsonify(mock_response))
        
    return _corsify_response(jsonify(latest_results))

@app.route('/update-device-data', methods=['POST', 'OPTIONS'])
def update_device_data():
    """Update the device data JSON file with received data"""
    # Handle preflight OPTIONS request
    if request.method == 'OPTIONS':
        return _build_cors_preflight_response()
        
    try:
        # Get device data from request
        incoming_data = request.json if request.is_json else {}
        
        if not incoming_data:
            return _corsify_response(jsonify({'error': 'No device data provided'})), 400
            
        logger.info(f"Received device data update for {len(incoming_data)} devices")
        
        # Get current device data from JSON
        current_data = get_device_data()
        
        # Create a device ID to data mapping for easier updates
        device_map = {item.get('device_id', f"D{i+1}"): item for i, item in enumerate(current_data)}
        
        # Track statistics for logging
        total_devices = 0
        skipped_negative = 0
        converted_floats = 0
        
        # Update the device data with the incoming data
        for i, device in enumerate(incoming_data):
            if i >= 31:  # Only update up to 31 devices
                break
                
            total_devices += 1
            
            # Get the device value
            device_value = device.get('value', 0)
            friendly_name = device.get('friendly_name', f"D{i+1}")
            device_id = device.get('device_id', friendly_name)
            
            # Skip negative values to avoid simulation issues
            if device_value < 0:
                skipped_negative += 1
                logger.info(f"Skipping negative value {device_value} for device {device_id}")
                continue
            
            # Keep float values as is - no conversion needed
            if isinstance(device_value, (int, float)):
                logger.info(f"Processing value {device_value} for device {device_id}")
            
            # Update the device in our map or add a new entry
            if device_id in device_map:
                device_map[device_id]['value'] = device_value
            else:
                # If the device ID doesn't exist, create a new entry
                device_map[device_id] = {
                    'device_id': device_id,
                    'friendly_name': friendly_name,
                    'value': device_value
                }
        
        # Convert the map back to a list
        updated_data = list(device_map.values())
        
        # Save the updated device data to JSON
        with open(DEVICE_DATA_JSON, 'w') as f:
            json.dump(updated_data, f, indent=2)
        
        logger.info(f"Successfully updated device data JSON. Processed {total_devices} devices, "
                   f"skipped {skipped_negative} negative values, converted {converted_floats} float values.")
        
        return _corsify_response(jsonify({
            'status': 'success', 
            'message': 'Device data updated successfully',
            'statistics': {
                'total_devices': total_devices,
                'skipped_negative': skipped_negative,
                'converted_floats': converted_floats
            }
        }))
    
    except Exception as e:
        logger.error(f"Error updating device data JSON: {str(e)}")
        return _corsify_response(jsonify({'error': str(e)})), 500

@app.route('/get-device-data', methods=['GET', 'OPTIONS'])
def api_get_device_data():
    """Get the current device data from JSON"""
    # Handle preflight OPTIONS request
    if request.method == 'OPTIONS':
        return _build_cors_preflight_response()
        
    try:
        device_data = get_device_data()
        return _corsify_response(jsonify(device_data))
    except Exception as e:
        logger.error(f"Error getting device data: {str(e)}")
        return _corsify_response(jsonify({'error': str(e)})), 500

@app.route('/get-timesteps-results', methods=['GET', 'OPTIONS'])
def get_timesteps_results():
    """Get the timesteps load flow results"""
    # Handle preflight OPTIONS request
    if request.method == 'OPTIONS':
        return _build_cors_preflight_response()
        
    try:
        output_file = 'output/1_output_timesteps_LF_results.json'
        
        if not os.path.exists(output_file):
            logger.error(f"Timesteps results file not found: {output_file}")
            return _corsify_response(jsonify({'error': 'Timesteps load flow results not found'})), 404
            
        with open(output_file, 'r') as f:
            raw_data = json.load(f)
            
            # Replace NaN values with None
            raw_data = replace_nan_with_none(raw_data)
            
            # Transform the data into a format more compatible with the frontend
            transformed_data = []
            
            for i, timestep in enumerate(raw_data):
                # Create an entry for each bus/node
                bus_counts = sum(1 for k in timestep.keys() if k.startswith("node") and "v_pu" in k)
                
                for node_id in range(bus_counts):
                    node_key = f"node {node_id}: v_pu"
                    load_key = f"load load {node_id}: p_mw"
                    
                    if node_key in timestep:
                        entry = {
                            "timestamp": f"Timestep {i+1}",
                            "bus_id": node_id,
                            "voltage": timestep.get(node_key),
                            "power": None,  # We'll calculate total power if needed
                            "load": timestep.get(load_key)
                        }
                        
                        # Add any converter data related to this bus if available
                        for key, value in timestep.items():
                            if key.startswith(f"Conv_") and "p_mw" in key:
                                conv_id = key.split(":")[0].replace("Conv_", "")
                                entry[f"converter_{conv_id}_power"] = value
                                
                            if key.startswith(f"Conv_") and "loading" in key:
                                conv_id = key.split(":")[0].replace("Conv_", "")
                                entry[f"converter_{conv_id}_loading"] = value
                        
                        transformed_data.append(entry)
            
            logger.info(f"Successfully transformed timesteps load flow results: {len(transformed_data)} entries")
            return _corsify_response(jsonify(transformed_data))
    
    except Exception as e:
        logger.error(f"Error in get_timesteps_results: {str(e)}")
        return _corsify_response(jsonify({'error': str(e)})), 500

def _build_cors_preflight_response():
    """Build a response for CORS preflight requests"""
    response = jsonify({})
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
    return response

def _corsify_response(response):
    """Add CORS headers to a response"""
    response.headers.add('Access-Control-Allow-Origin', '*')
    return response

if __name__ == '__main__':
    # Change port from 5000 to 5002 to avoid conflicts with AirPlay
    port = 5002

    logger.info(f"Starting Flask-SocketIO server on port {port}...")
    # Run the Flask app with Socket.IO
    socketio.run(app, debug=False, port=port, host='0.0.0.0', allow_unsafe_werkzeug=True)