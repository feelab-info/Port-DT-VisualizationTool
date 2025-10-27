from flask import Flask, request, jsonify
import os
import subprocess
import json
import sys
import logging
import math

os.makedirs("logs", exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("logs/api_server.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

required_packages = ['flask_cors']
for package in required_packages:
    try:
        __import__(package)
    except ImportError:
        logger.info(f"Installing missing dependency: {package}")
        subprocess.run([sys.executable, '-m', 'pip', 'install', package], check=True)

from flask_cors import CORS

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
app.json_encoder = CustomJSONEncoder
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "OK", "service": "dc-power-flow"})

DEVICE_DATA_JSON = 'device_data.json'

def initialize_device_data_json():
    if not os.path.exists(DEVICE_DATA_JSON):
        default_data = [{"device_id": f"D{i+1}", "value": 0} for i in range(31)]
        with open(DEVICE_DATA_JSON, 'w') as f:
            json.dump(default_data, f, indent=2)
        logger.info(f"Created default device data JSON: {DEVICE_DATA_JSON}")

initialize_device_data_json()

def get_device_data():
    try:
        if os.path.exists(DEVICE_DATA_JSON):
            with open(DEVICE_DATA_JSON, 'r') as f:
                return json.load(f)
        initialize_device_data_json()
        with open(DEVICE_DATA_JSON, 'r') as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Error loading device data: {e}")
        return [{"device_id": f"D{i+1}", "value": 0} for i in range(31)]

def run_simulation_with_json_data(params=None):
    try:
        device_data = get_device_data()
        config = {"scenario": 2}
        if params:
            config.update(params)
        config["device_data"] = device_data
        
        with open('temp_config.json', 'w') as f:
            json.dump(config, f, cls=CustomJSONEncoder)
        
        script_dir = os.path.dirname(os.path.abspath(__file__))
        env = os.environ.copy()
        env['PYTHONPATH'] = script_dir
            
        process = subprocess.Popen(
            [sys.executable, 'main.py', '--config', 'temp_config.json'],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            cwd=script_dir,
            env=env
        )
        
        try:
            stdout, stderr = process.communicate(timeout=300)
            if process.returncode != 0:
                logger.error(f"Simulation error: {stderr}")
                return {'success': False, 'error': stderr}
            logger.info("Simulation completed successfully")
            return {'success': True}
        except subprocess.TimeoutExpired:
            process.kill()
            logger.error("Simulation timed out")
            return {'success': False, 'error': 'Simulation timed out'}
    except Exception as e:
        logger.error(f"Error running simulation: {e}")
        return {'success': False, 'error': str(e)}

@app.route('/run-simulation', methods=['POST', 'OPTIONS'])
def run_simulation():
    if request.method == 'OPTIONS':
        return jsonify({})
    try:
        params = request.json if request.is_json else {}
        result = run_simulation_with_json_data(params)
        
        if not result['success']:
            return jsonify({'error': result.get('error', 'Simulation failed')}), 500
        
        output_file = 'output/output_evaluation_results_scenario_2_file.json'
        if os.path.exists(output_file):
            with open(output_file, 'r') as f:
                output_data = replace_nan_with_none(json.load(f))
            return jsonify(output_data)
        return jsonify({'error': 'Output file not found'}), 404
    except Exception as e:
        logger.error(f"Error in run_simulation: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/start-simulation-service', methods=['POST', 'OPTIONS'])
def start_simulation_service():
    if request.method == 'OPTIONS':
        return jsonify({})
    logger.info("Simulation service ready")
    return jsonify({'status': 'Simulation service ready'})

@app.route('/update-device-data', methods=['POST', 'OPTIONS'])
def update_device_data():
    if request.method == 'OPTIONS':
        return jsonify({})
    try:
        incoming_data = request.json if request.is_json else []
        if not incoming_data:
            return jsonify({'error': 'No device data provided'}), 400
            
        logger.info(f"Received device data update for {len(incoming_data)} devices")
        current_data = get_device_data()
        device_map = {item.get('device_id', f"D{i+1}"): item for i, item in enumerate(current_data)}
        
        stats = {'total': 0, 'skipped_negative': 0}
        for device in incoming_data[:31]:
            stats['total'] += 1
            device_id = device.get('device_id', device.get('friendly_name', f"D{stats['total']}"))
            device_value = device.get('value', 0)
            friendly_name = device.get('friendly_name', device_id)
            
            if device_value < 0:
                stats['skipped_negative'] += 1
                continue
            
            device_map[device_id] = {
                'device_id': device_id,
                'friendly_name': friendly_name,
                'value': float(device_value)
            }
        
        with open(DEVICE_DATA_JSON, 'w') as f:
            json.dump(list(device_map.values()), f, indent=2)
        
        logger.info(f"Updated {stats['total']} devices, skipped {stats['skipped_negative']}")
        return jsonify({'status': 'success', 'statistics': stats})
    except Exception as e:
        logger.error(f"Error updating device data: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/get-timesteps-results', methods=['GET', 'OPTIONS'])
def get_timesteps_results():
    if request.method == 'OPTIONS':
        return jsonify({})
    try:
        output_file = 'output/1_output_timesteps_LF_results.json'
        if not os.path.exists(output_file):
            return jsonify({'error': 'Timesteps results not found'}), 404
            
        with open(output_file, 'r') as f:
            raw_data = replace_nan_with_none(json.load(f))
            
        transformed_data = []
        for i, timestep in enumerate(raw_data):
            bus_counts = sum(1 for k in timestep.keys() if k.startswith("node") and "v_pu" in k)
            for node_id in range(bus_counts):
                node_key = f"node {node_id}: v_pu"
                if node_key in timestep:
                    # Start with all timestep data to preserve line information
                    entry = dict(timestep)
                    # Add/override specific fields
                    entry["timestamp"] = f"Timestep {i+1}"
                    entry["timestep"] = i + 1
                    entry["bus_id"] = node_id
                    entry["voltage"] = timestep.get(node_key)
                    entry["power"] = timestep.get(f"node {node_id}: p_mw")
                    entry["load"] = timestep.get(f"load load {node_id}: p_mw")
                    
                    # Add converter data
                    for key, value in timestep.items():
                        if "Conv_" in key and "p_mw" in key:
                            entry["converter_power"] = value
                        elif "Conv_" in key and "loading" in key:
                            entry["converter_loading"] = value
                    
                    transformed_data.append(entry)
        
        logger.info(f"Transformed {len(transformed_data)} timestep entries with line data")
        return jsonify(transformed_data)
    except Exception as e:
        logger.error(f"Error in get_timesteps_results: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    port = 5002
    logger.info(f"Starting DC Power Flow API on port {port}...")
    app.run(debug=False, port=port, host='0.0.0.0')