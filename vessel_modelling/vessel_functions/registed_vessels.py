import os
import pandas as pd
import numpy as np
import json

from sklearn.preprocessing import StandardScaler
from scipy.spatial.distance import cdist

from vessel_functions.utilities_functions import(
    find_best_slice_for_arrival_departure,
    resample_data
)


def plot_energy_consumption_for_ship(target_ship_name):
    
    # Load the regression ships characteristics
    regression_data_path = "./Data/Predicted_Hotel_Energy.xlsx"
    df_regression = pd.read_excel(regression_data_path)

    # Predefined dataset (Fincantieri ship characteristics)
    slice_data = {
        'Name': ['Ship1', 'Ship2', 'Ship3', 'Ship4'],
        'Length (m)': [320, 220, 290, 210],
        'Gross Tonnage (GT)': [150000, 55000, 140000, 41000],
        'Hotel Energy (kW)': [15000, 6300, 13000, 4500]
    }
    df_slices = pd.DataFrame(slice_data)

    # Standardize features for better comparison
    scaler = StandardScaler()
    regression_features = df_regression[['Length (m)', 'Gross Tonnage (GT)', 'Hotel Energy (kW)']]
    slice_features = df_slices[['Length (m)', 'Gross Tonnage (GT)', 'Hotel Energy (kW)']]

    # Normalize data using StandardScaler
    regression_scaled = scaler.fit_transform(regression_features)
    slice_scaled = scaler.transform(slice_features)

    distances = cdist(regression_scaled, slice_scaled, metric='euclidean')
    closest_vessels_idx = np.argmin(distances, axis=1)

    # Store closest ship mappings and corresponding scaling factors
    closest_ships_mapping = {}
    scaling_factors = {}

    for i, reg_idx in enumerate(closest_vessels_idx):
        reg_vessel_name = df_regression.iloc[i]['Name']
        closest_ship_name = df_slices.iloc[reg_idx]['Name']
        reg_hotel_energy = df_regression.iloc[i]['Hotel Energy (kW)']
        closest_hotel_energy = df_slices.iloc[reg_idx]['Hotel Energy (kW)']
        
        scaling_factor = reg_hotel_energy / closest_hotel_energy
        closest_ships_mapping[reg_vessel_name] = closest_ship_name
        scaling_factors[reg_vessel_name] = scaling_factor

    # Return the closest matching ship and its scaling factor
    return closest_ships_mapping.get(target_ship_name, None), scaling_factors.get(target_ship_name, 1)

def plot_energy_graph_for_closest_ship(target_ship, closest_ship_name, folder_path, arrival_time, departure_time, scaling_factor):
    # Construct the path to the closest ship's folder
    closest_ship_folder_path = os.path.join(folder_path, closest_ship_name)

    if os.path.exists(closest_ship_folder_path):
        
        # Find the best slice of data based on the arrival and departure times
        best_slice = find_best_slice_for_arrival_departure(arrival_time, departure_time, folder_path, closest_ship_name)

        if best_slice:
            file_path = os.path.join(closest_ship_folder_path, best_slice)
            
            df = pd.read_excel(file_path)

            # Define the required columns for energy profile data
            required_columns = {'Timestamp', 'Hotel Power', 'Chillers Power'}
            
            # Check if any required columns are missing in the DataFrame
            missing_columns = required_columns - set(df.columns)

            if not missing_columns:
                # Convert 'Timestamp' to datetime format and sort the DataFrame by timestamp
                df['Timestamp'] = pd.to_datetime(df['Timestamp'])
                df = df.sort_values('Timestamp')

                # Determine the start and end datetime for the resampling
                start_datetime = arrival_time
                end_datetime = departure_time

                # Resample the data using the resample_data function
                resampled_df = resample_data(df, arrival_time, departure_time, start_datetime, end_datetime)

                # Apply the scaling factor to the energy values
                resampled_df['Hotel Power'] *= scaling_factor
                resampled_df['Chillers Power'] *= scaling_factor
                
                # Prepare the output data in JSON format
                json_output = {
                    "vessel": target_ship,
                    "arrival_time": arrival_time,
                    "departure_time": departure_time,
                    "energy_profile_data": resampled_df.assign(Timestamp=resampled_df['Timestamp'].astype(str)).to_dict(orient="records")  # Assign the 'Timestamp' as a string (for compatibility with JSON)
                }

                # Save the output to a JSON file
                with open("vessel_output.json", "w") as json_file:
                    json.dump(json_output, json_file, indent=4)

                return json_output

            else:
                print(f"Error: The file {best_slice} doesn't have required columns.")
        else:
            print(f"No suitable file found in the folder for {closest_ship_name}.")
    else:
        print(f"Folder for {closest_ship_name} not found.")
    
    return None, None