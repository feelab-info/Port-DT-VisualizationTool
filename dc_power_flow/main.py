import pandas as pd
import pandapower as pp
import json
import argparse
import sys
import os
from utilities_create import create_dc_network
from utilities_plot_save import (plot_network_evaluation_results_with_plotly, save_sizing_results_to_excel,
                                 plot_network_sizing_results_with_plotly, save_kpis_results_to_excel,
                                 save_timestep_load_flow_results_to_excel, save_kpis_results_to_json,
                                 save_sizing_results_to_json, save_timestep_load_flow_results_to_json)
from utilities_load_flow import (perform_dc_load_flow, perform_load_flow_with_sizing, perform_dc_load_flow_with_droop,
                                 perform_timestep_dc_load_flow)
from utilities_worst_case_sizing import perform_comprehensive_sizing, validate_network_performance
from utilities_kpis import (calculate_efficiency_kpi, calculate_total_investment_cost_cables_converters_kpi,
                            calculate_total_maintenance_cost_cables_converters_kpi,
                            calculate_total_weight_cables_converters_kpi, calculate_lifecycle_emissions_kpi,
                            calculate_energy_savings, calculate_total_capex_difference,
                            calculate_total_weight_difference, calculate_total_lifecycle_emissions_difference)
from openpyxl import load_workbook

# Setup argument parser
parser = argparse.ArgumentParser(description='Run DC power flow simulation')
parser.add_argument('--config', type=str, help='Path to the configuration JSON file')
args = parser.parse_args()

# Define default paths and configuration
config = {
    "scenario": 2,
    "input_file": "input_file_grid_data_port.xlsx",
    "cable_catalogue": "catalog_cable.xlsx",
    "converter_catalogue": "catalog_converter.xlsx",
    "device_data": []  # Default empty device data
}

# Load configuration from file if provided
if args.config:
    try:
        with open(args.config, 'r') as f:
            loaded_config = json.load(f)
            # Update the configuration with loaded values
            config.update(loaded_config)
        print(f"Loaded configuration from {args.config}")
    except Exception as e:
        print(f"Error loading configuration: {e}")
        sys.exit(1)

##########################################################
# Paths from configuration
path = config.get("input_file", "input_file_grid_data_port.xlsx")
path_cable_catalogue = config.get("cable_catalogue", "catalog_cable.xlsx")
path_converter_catalogue = config.get("converter_catalogue", "catalog_converter.xlsx")
device_data = config.get("device_data", [])


# Define the output directory
output_dir = "output"
# Create the directory if it doesn't exist
os.makedirs(output_dir, exist_ok=True)

##########################################################
# Read files and create an initial un-sized DC network
print(f"***Reading input files and creating an initial DC network.***")
net, cable_catalogue, use_case, node_data = create_dc_network(path, path_cable_catalogue, path_converter_catalogue)

##########################################################
# Size the network according to the worst case scenarios defined in the input file and to the catalogues
print(f"***Sizing the network based on worst case scenarios.***")
net = perform_comprehensive_sizing(net, cable_catalogue, use_case, node_data)
# Save sizing results - sized network
sizing_file_path = os.path.join(output_dir, 'output_sizing_results_file.xlsx')
save_sizing_results_to_excel(net, node_data, sizing_file_path)
save_sizing_results_to_json(net, node_data, sizing_file_path.replace('.xlsx', '.json'))
#plot_network_sizing_results_with_plotly(net, node_data, os.path.join(output_dir, rf'output_sizing_results_plot_network.html'))

# Execute a load flow with droop control considering time-series data (user-defined or generated profiles)
print(f"***Performing time-step load flow analysis.***")
net_snapshots, results = perform_timestep_dc_load_flow(net, use_case, node_data)    # Power Flow
# Save load flow results
timestep_file_path = os.path.join(output_dir, "1_output_timesteps_LF_results.xlsx")
save_timestep_load_flow_results_to_excel(results, timestep_file_path)
save_timestep_load_flow_results_to_json(results, timestep_file_path.replace('.xlsx', '.json'))

##########################################################
# Calculate KPIs for DC grid
print(f"***Computing KPIs.***")
# Efficiency
print(f"*Computing Efficiency KPIs.*")
timestep_hours = use_case['Parameters for annual simulations']['Simulation time step (mins)'] / 60
(efficiency_ratio, total_consumed_energy_mwh, total_generated_energy_mwh,
 total_losses_cables_mwh, total_losses_converters_mwh) = calculate_efficiency_kpi(net_snapshots, timestep_hours)
# Economic
print(f"*Computing Economic KPIs.*")
total_capex_keur, capex_details = calculate_total_investment_cost_cables_converters_kpi(net, use_case,
                                                                                        path_converter_catalogue)
total_opex_keur, opex_details = calculate_total_maintenance_cost_cables_converters_kpi(net, use_case)
# Environmental
print(f"*Computing Environmental KPIs.*")
total_weight_kg, weight_details = calculate_total_weight_cables_converters_kpi(net, use_case, path_converter_catalogue)
total_lifecycle_emissions_kg_co2 = calculate_lifecycle_emissions_kpi(net, use_case, path_converter_catalogue)

# Import KPIs for AC grid # Assumption: inputs from user
ac_total_generated_energy_mwh = (
    use_case)['Parameters of equivalent AC grid for KPIs comparison']['Total energy generated in AC grid (MWh)']
ac_efficiency_ratio = use_case['Parameters of equivalent AC grid for KPIs comparison']['Efficiency of AC grid (%)']
ac_total_capex_keur = use_case['Parameters of equivalent AC grid for KPIs comparison']['Total CAPEX of AC grid (kEUR)']
ac_total_weight_kg = use_case['Parameters of equivalent AC grid for KPIs comparison']['Total weight of AC grid (kg)']
ac_total_lifecycle_emissions_kg_co2 = use_case['Parameters of equivalent AC grid for KPIs comparison']['Total CO2 emissions of AC grid (kg CO2)']

print(f"*Computing Comparison KPIs between DC and DC grids.*")
# Compare KPIs for AC grid and DC grid
energy_savings_mwh, energy_savings_percent = calculate_energy_savings(total_generated_energy_mwh,
                                                                      ac_total_generated_energy_mwh)
capex_difference_keur, capex_difference_percent = calculate_total_capex_difference(total_capex_keur,
                                                                                   ac_total_capex_keur)
weight_difference_kg, weight_difference_percentage = calculate_total_weight_difference(total_weight_kg,
                                                                                       ac_total_weight_kg)
lifecycle_emissions_difference_kg_co2, lifecycle_emissions_difference_percentage = (
    calculate_total_lifecycle_emissions_difference(total_lifecycle_emissions_kg_co2,
                                                   ac_total_lifecycle_emissions_kg_co2)
)

# Save KPIs results
kpi_file_path = os.path.join(output_dir, 'output_kpis_results_file.xlsx')
save_kpis_results_to_excel(
    kpi_file_path,
    (efficiency_ratio, total_consumed_energy_mwh, total_generated_energy_mwh, total_losses_cables_mwh,
     total_losses_converters_mwh, energy_savings_mwh, energy_savings_percent),
    (total_capex_keur, capex_details, capex_difference_keur, capex_difference_percent, total_opex_keur, opex_details),
    (total_weight_kg, weight_details, total_lifecycle_emissions_kg_co2, weight_difference_kg,
     weight_difference_percentage, lifecycle_emissions_difference_kg_co2, lifecycle_emissions_difference_percentage)
)
save_kpis_results_to_json(
    kpi_file_path.replace('.xlsx', '.json'),
    (efficiency_ratio, total_consumed_energy_mwh, total_generated_energy_mwh, total_losses_cables_mwh,
     total_losses_converters_mwh, energy_savings_mwh, energy_savings_percent),
    (total_capex_keur, capex_details, capex_difference_keur, capex_difference_percent, total_opex_keur, opex_details),
    (total_weight_kg, weight_details, total_lifecycle_emissions_kg_co2, weight_difference_kg,
     weight_difference_percentage, lifecycle_emissions_difference_kg_co2, lifecycle_emissions_difference_percentage)
)

# Clean up the temporary file if it was created
if path.startswith("temp_") and os.path.exists(path):
    try:
        os.remove(path)
        print(f"Removed temporary input file")
    except Exception as e:
        print(f"Error removing temporary file: {e}")
