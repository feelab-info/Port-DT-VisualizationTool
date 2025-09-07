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

def get_user_inputs():
    """Collect ship details from user input and return as a dictionary."""
    return {
        "name": input("Enter the Ship Name: ").strip(),
        "gross_tonnage": float(input("Enter the Gross Tonnage: ")),
        "length": float(input("Enter the Ship Length (meters): ")),
        "hotel_energy": float(input("Enter the Hotel Energy (kW): ")),
        "arrival_time": input("Enter Arrival Time (HH:MM:SS): ").strip(),
        "departure_time": input("Enter Departure Time (HH:MM:SS): ").strip()
    }

def find_closest_ship(user_ship):
    """Find the closest ship from a predefined dataset based on ship characteristics."""

    # Predefined dataset (Fincantieri ship characteristics)
    reference_ships = {
        'Name': ['Ship1', 'Ship2', 'Ship3', 'Ship4'],
        'Length (m)': [320, 220, 290, 210],
        'Gross Tonnage (GT)': [150000, 55000, 140000, 41000],
        'Hotel Energy (kW)': [15000, 6300, 13000, 4500]
    }
    df_reference = pd.DataFrame(reference_ships)

    # Standardize features
    scaler = StandardScaler()

    # Fit the scaler on the reference dataset
    reference_scaled = scaler.fit_transform(df_reference[['Length (m)', 'Gross Tonnage (GT)', 'Hotel Energy (kW)']])

    # Create a DataFrame for user_ship with the same column names as the reference dataset
    user_ship_data = pd.DataFrame(
        [[user_ship["length"], user_ship["gross_tonnage"], user_ship["hotel_energy"]]],
        columns=['Length (m)', 'Gross Tonnage (GT)', 'Hotel Energy (kW)']
    )

    # Transform the user input using the same scaler
    user_ship_scaled = scaler.transform(user_ship_data)

    # Find the closest ship
    distances = cdist(user_ship_scaled, reference_scaled, metric='euclidean')
    closest_idx = np.argmin(distances)

    closest_ship = df_reference.iloc[closest_idx]
    scaling_factor = user_ship["hotel_energy"] / closest_ship["Hotel Energy (kW)"]

    print(f"\nClosest ship found: {closest_ship['Name']}. Scaling Factor: {scaling_factor:.2f}\n")
    return closest_ship['Name'], scaling_factor

def generate_energy_profile(user_ship, closest_ship_name, folder_path, scaling_factor):
    """Generate and save the energy profile based on real-time user input."""
    
    ship_folder_path = os.path.join(folder_path, closest_ship_name)
    
    if os.path.exists(ship_folder_path):
        best_slice = find_best_slice_for_arrival_departure(
            user_ship["arrival_time"], user_ship["departure_time"], folder_path, closest_ship_name
        )

        if best_slice:
            file_path = os.path.join(ship_folder_path, best_slice)
            df = pd.read_excel(file_path, engine='openpyxl')

            required_columns = {'Timestamp', 'Hotel Power', 'Chillers Power'}
            if required_columns.issubset(df.columns):
                df['Timestamp'] = pd.to_datetime(df['Timestamp'])
                df = df.sort_values('Timestamp')

                # Apply scaling factor
                df['Hotel Power'] *= scaling_factor
                df['Chillers Power'] *= scaling_factor
                
                start_datetime = pd.to_datetime(user_ship["arrival_time"])
                end_datetime = pd.to_datetime(user_ship["departure_time"])
                
                # Resample data based on the given arrival and departure time
                resampled_data = resample_data(df, start_datetime, end_datetime, start_datetime, end_datetime)
                
                # Prepare the output data in JSON format
                json_output = {
                    "vessel": user_ship["name"],
                    "gross_tonnage": user_ship["gross_tonnage"],
                    "length": user_ship["length"],
                    "hotel_energy": user_ship["hotel_energy"],
                    "arrival_time": user_ship["arrival_time"],
                    "departure_time": user_ship["departure_time"],
                    "energy_profile_data": resampled_data.assign(Timestamp=resampled_data['Timestamp'].astype(str)).to_dict(orient="records")
                }

                with open("vessel_output.json", "w") as json_file:
                    json.dump(json_output, json_file, indent=4)

                return df, json_output
            else:
                print(f"Error: The file {best_slice} is missing required columns.")
        else:
            print(f"No suitable file found for {closest_ship_name}.")
    else:
        print(f"Folder for {closest_ship_name} not found.")
    return None, None