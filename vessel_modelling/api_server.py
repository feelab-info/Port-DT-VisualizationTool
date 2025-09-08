import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import json
import os
import logging
import sys

# Add the current directory to the path so we can import the vessel functions
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from vessel_functions.registed_vessels import (
    plot_energy_consumption_for_ship,
    plot_energy_graph_for_closest_ship
)

from vessel_functions.input_vessels import (
    find_closest_ship,
    generate_energy_profile
)

# Ensure logs directory exists for file logging
os.makedirs("logs", exist_ok=True)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("logs/vessel_api.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)

FOLDER_PATH = "./Data/CruisesSlices_Resampled"

# Add this near the top of the file, after the imports
DEFAULT_SIMULATION_DATE = "2025-04-28"  # You can change this to any date you want

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({"status": "OK", "service": "vessel-modeling-api"})

@app.route('/api/registered-vessel', methods=['POST'])
def process_registered_vessel():
    """Process a registered vessel and generate energy profile"""
    try:
        data = request.json
        
        # Extract parameters
        target_ship = data.get('vessel_name')
        arrival_time = data.get('arrival_time')
        departure_time = data.get('departure_time')
        
        if not all([target_ship, arrival_time, departure_time]):
            return jsonify({
                "error": "Missing required parameters: vessel_name, arrival_time, or departure_time"
            }), 400
        
        # Find the closest registered ship and its scaling factor
        closest_ship, scaling_factor = plot_energy_consumption_for_ship(target_ship)
        
        if not closest_ship:
            return jsonify({
                "error": f"No closest ship found for {target_ship}"
            }), 404
        
        # Generate and save the energy profile
        json_output = plot_energy_graph_for_closest_ship(
            target_ship, closest_ship, FOLDER_PATH, arrival_time, departure_time, scaling_factor
        )
        
        if not json_output:
            return jsonify({
                "error": "Failed to generate energy data"
            }), 500
        
        # Return the energy profile data
        return jsonify({
            "success": True,
            "message": f"Energy profile generated for {target_ship}",
            "closest_ship": closest_ship,
            "scaling_factor": scaling_factor,
            "data": json_output
        })
        
    except Exception as e:
        logger.error(f"Error processing registered vessel: {str(e)}")
        return jsonify({
            "error": str(e)
        }), 500

@app.route('/api/custom-vessel', methods=['POST'])
def process_custom_vessel():
    """Process a custom vessel and generate energy profile"""
    try:
        data = request.json
        
        # Extract parameters
        user_ship = {
            "name": data.get('name'),
            "gross_tonnage": float(data.get('gross_tonnage', 0)),
            "length": float(data.get('length', 0)),
            "hotel_energy": float(data.get('hotel_energy', 0)),
            "arrival_time": data.get('arrival_time'),
            "departure_time": data.get('departure_time')
        }
        
        # Validate required fields
        required_fields = ["name", "gross_tonnage", "length", "hotel_energy", "arrival_time", "departure_time"]
        missing_fields = [field for field in required_fields if not user_ship.get(field)]
        
        if missing_fields:
            return jsonify({
                "error": f"Missing required fields: {', '.join(missing_fields)}"
            }), 400
        
        # Find the closest ship from the dataset
        closest_ship, scaling_factor = find_closest_ship(user_ship)
        
        if not closest_ship:
            return jsonify({
                "error": f"No closest ship found for {user_ship['name']}"
            }), 404
        
        # Generate and save the energy profile
        df, json_output = generate_energy_profile(user_ship, closest_ship, FOLDER_PATH, scaling_factor)
        
        if not json_output:
            return jsonify({
                "error": "Failed to generate energy data"
            }), 500
        
        # Return the energy profile data
        return jsonify({
            "success": True,
            "message": f"Energy profile generated for {user_ship['name']}",
            "closest_ship": closest_ship,
            "scaling_factor": scaling_factor,
            "data": json_output
        })
        
    except Exception as e:
        logger.error(f"Error processing custom vessel: {str(e)}")
        return jsonify({
            "error": str(e)
        }), 500

@app.route('/api/available-vessels', methods=['GET'])
def get_available_vessels():
    """Get a list of available registered vessels"""
    try:
        # Load the regression ships characteristics
        regression_data_path = "./Data/Predicted_Hotel_Energy.xlsx"
        
        if not os.path.exists(regression_data_path):
            return jsonify({
                "error": f"Regression data file not found: {regression_data_path}"
            }), 404
        
        df_regression = pd.read_excel(regression_data_path)
        
        # Extract vessel names
        vessel_names = df_regression['Name'].tolist()
        
        return jsonify({
            "success": True,
            "vessels": vessel_names
        })
        
    except Exception as e:
        logger.error(f"Error getting available vessels: {str(e)}")
        return jsonify({
            "error": str(e)
        }), 500

@app.route('/api/simulations', methods=['GET'])
def get_simulations():
    """Get all vessel simulations, optionally filtered by date"""
    try:
        # Get date parameter from query string, default to DEFAULT_SIMULATION_DATE
        date_str = request.args.get('date')
        target_date = None
        
        if date_str:
            try:
                # Parse date from string in format YYYY-MM-DD
                target_date = datetime.datetime.strptime(date_str, "%Y-%m-%d").date()

            except ValueError:
                return jsonify({
                    "error": f"Invalid date format: {date_str}. Expected format: YYYY-MM-DD"
                }), 400
        
        # Define output directory
        output_dir = "output"
        
        if not os.path.exists(output_dir):
            return jsonify({
                "success": True,
                "simulations": []
            })
        
        # Get all simulation files
        simulation_files = os.listdir(output_dir)

        # Filter files by date if specified
        if target_date:
            date_prefix = target_date.strftime("%Y-%m-%d")
            simulation_files = [f for f in simulation_files if f.startswith(date_prefix)]
        
        # Load simulation data from files
        simulations = []
        for file in simulation_files:
            file_path = os.path.join(output_dir, file)
            try:
                with open(file_path, 'r') as f:
                    simulation_data = json.load(f)
                    # Add filename to data for reference
                    simulation_data['filename'] = file
                    simulations.append(simulation_data)
            except Exception as e:
                logger.error(f"Error loading simulation file {file}: {str(e)}")
                continue
        
        return jsonify({
            "success": True,
            "simulations": simulations
        })
        
    except Exception as e:
        logger.error(f"Error getting simulations: {str(e)}")
        return jsonify({
            "error": str(e)
        }), 500

@app.route('/api/simulations/<date>', methods=['GET'])
def get_simulations_by_date(date):
    """Get all vessel simulations for a specific date"""
    try:
        try:
            # Parse date from string in format YYYY-MM-DD
            target_date = datetime.datetime.strptime(date, "%Y-%m-%d").date()
        except ValueError:
            return jsonify({
                "error": f"Invalid date format: {date}. Expected format: YYYY-MM-DD"
            }), 400
        
        # Define output directory
        output_dir = "output"
        
        if not os.path.exists(output_dir):
            return jsonify({
                "success": True,
                "simulations": []
            })
        
        # Get simulation files for the specified date
        date_prefix = target_date.strftime("%Y-%m-%d")
        simulation_files = [f for f in os.listdir(output_dir) if f.startswith(date_prefix)]
        
        # Load simulation data from files
        simulations = []
        for file in simulation_files:
            file_path = os.path.join(output_dir, file)
            try:
                with open(file_path, 'r') as f:
                    simulation_data = json.load(f)
                    # Add filename to data for reference
                    simulation_data['filename'] = file
                    simulations.append(simulation_data)
            except Exception as e:
                logger.error(f"Error loading simulation file {file}: {str(e)}")
                continue
        
        return jsonify({
            "success": True,
            "date": date,
            "simulations": simulations
        })
        
    except Exception as e:
        logger.error(f"Error getting simulations for date {date}: {str(e)}")
        return jsonify({
            "error": str(e)
        }), 500

@app.route('/api/current-simulations', methods=['GET'])
def get_current_simulations():
    """Get all vessel simulations for the current date"""
    try:
        # Get current date
        current_date = datetime.datetime.now().date()
        date_str = current_date.strftime("%Y-%m-%d")
        
        # Define output directory
        output_dir = "output"
        
        if not os.path.exists(output_dir):
            return jsonify({
                "success": True,
                "simulations": []
            })
        
        # Get simulation files for the current date
        date_prefix = date_str
        simulation_files = [f for f in os.listdir(output_dir) if f.startswith(date_prefix)]
        
        # Load simulation data from files
        simulations = []
        for file in simulation_files:
            file_path = os.path.join(output_dir, file)
            try:
                with open(file_path, 'r') as f:
                    simulation_data = json.load(f)
                    # Add filename to data for reference
                    simulation_data['filename'] = file
                    simulations.append(simulation_data)
            except Exception as e:
                logger.error(f"Error loading simulation file {file}: {str(e)}")
                continue
        
        return jsonify({
            "success": True,
            "date": date_str,
            "simulations": simulations
        })
        
    except Exception as e:
        logger.error(f"Error getting current simulations: {str(e)}")
        return jsonify({
            "error": str(e)
        }), 500

if __name__ == '__main__':
    # Change port to 5003 to avoid conflicts with other services
    port = 5003
    logger.info(f"Starting Vessel Modeling API server on port {port}...")
    app.run(debug=False, port=port, host='0.0.0.0')