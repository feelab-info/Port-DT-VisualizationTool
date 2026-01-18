import os
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
import seaborn as sns
import numpy as np
from datetime import datetime


color_palette= sns.color_palette()

def find_best_slice_for_arrival_departure(arrival_time_str, departure_time_str, folder_path, ship_name):
    
    # Convert arrival and departure times from string to time objects
    arrival_time = datetime.strptime(arrival_time_str, '%H:%M:%S').time()
    departure_time = datetime.strptime(departure_time_str, '%H:%M:%S').time()

    ship_folder_path = os.path.join(folder_path, ship_name)
    files = [f for f in os.listdir(ship_folder_path) if f.endswith('.xlsx')]

    best_slice = None
    best_combined_diff = float('inf')

    for file in files:

        file_path = os.path.join(ship_folder_path, file)
        df = pd.read_excel(file_path)

        df['Timestamp'] = pd.to_datetime(df['Timestamp'])
        df = df.sort_values('Timestamp')

        # Extract first and last timestamp
        first_timestamp = df['Timestamp'].iloc[0].time()
        last_timestamp = df['Timestamp'].iloc[-1].time()

        # Calculate differences for arrival and departure
        arrival_diff = abs(datetime.combine(datetime.today(), first_timestamp) - datetime.combine(datetime.today(), arrival_time))
        departure_diff = abs(datetime.combine(datetime.today(), last_timestamp) - datetime.combine(datetime.today(), departure_time))

        combined_diff = arrival_diff.total_seconds() + departure_diff.total_seconds()

        # Compare and select the best file
        if combined_diff < best_combined_diff:
            best_slice = file
            best_combined_diff = combined_diff

    print(f"The best file selected based on arrival and departure times is: {best_slice}")

    # Return the best-matching slice
    return best_slice

# Function to resample the data based on the required number of points
def resample_dataframe(df, num_points):
    current_points = len(df)
    
    if num_points < current_points:
        # Downsample by selecting evenly spaced points
        factor = current_points / num_points
        indices = np.linspace(0, current_points - 1, num_points, dtype=int)
        df_resampled = df.iloc[indices]
    
    elif num_points > current_points:
        # Upsample by interpolating additional points
        new_index = np.linspace(0, current_points - 1, num_points)
        df_resampled = pd.DataFrame(index=new_index, columns=df.columns)
        
        # Interpolate for each column
        for col in df.columns:
            df_resampled[col] = np.interp(new_index, np.arange(current_points), df[col])
    
    else:
        # If the number of points is the same, return the original DataFrame
        df_resampled = df
    
    # Reset the index to make it sequential
    df_resampled = df_resampled.reset_index(drop=True)
    
    return df_resampled

# Function to resample the energy data for the ship
def resample_data(df, arrival_time, departure_time, start_datetime, end_datetime):
    # Convert arrival and departure time to datetime if they are strings
    if isinstance(arrival_time, str):
        arrival_time = pd.to_datetime(arrival_time)
    if isinstance(departure_time, str):
        departure_time = pd.to_datetime(departure_time)
    
    # Handle multi-day stays: if departure is before arrival, add one day to departure
    if departure_time <= arrival_time:
        departure_time = departure_time + pd.Timedelta(days=1)
        # Also update end_datetime if it's being used
        if isinstance(end_datetime, str):
            end_datetime = pd.to_datetime(end_datetime)
        if end_datetime <= start_datetime:
            end_datetime = end_datetime + pd.Timedelta(days=1)
    
    # Select the columns we are interested in
    data = df[['Chillers Power', 'Hotel Power']]

    # Calculate the time range for the actual ship presence (arrival to departure)
    time_range_minutes = int((departure_time - arrival_time).total_seconds() / 60)
    
    # Ensure we have a positive time range
    if time_range_minutes <= 0:
        raise ValueError(f"Invalid time range: arrival={arrival_time}, departure={departure_time}. Time range is {time_range_minutes} minutes.")
    
    required_data_points = time_range_minutes // 5
    
    # Ensure we have at least 1 data point
    if required_data_points < 1:
        required_data_points = 1
    
    # Resample the data
    data_resampled = resample_dataframe(data, required_data_points)
    
    # Generate timeline with 5-minute intervals
    timeline = pd.date_range(start=start_datetime, end=end_datetime, freq='5min')

    # Create new DataFrame for the resampled data with proper handling of timestamps
    new_data = pd.DataFrame()
    new_data['Timestamp'] = timeline

    # Ensure we don't initialize values to zero. We want to keep the resampled data from the original ship data.
    # If the resampling results in interpolating the original values, that will be reflected here.
    new_data['Chillers Power'] = np.interp(np.arange(len(timeline)), np.arange(len(data_resampled)), data_resampled['Chillers Power'])
    new_data['Hotel Power'] = np.interp(np.arange(len(timeline)), np.arange(len(data_resampled)), data_resampled['Hotel Power'])

    return new_data

def create_and_show_plot(df, vessel_name):
    """Plot energy consumption for the selected time slice."""
    if df is None or df.empty:
        print("No valid data to plot.")
        return

    df['Timestamp'] = pd.to_datetime(df['Timestamp'])

    # Create the plot
    plt.figure(figsize=(12, 6))
    
    # Plot the data
    plt.plot((df['Timestamp']), df['Hotel Power'], linestyle='-', color=color_palette[0], label=f'{vessel_name} Hotel Power')
    plt.plot((df['Timestamp']), df['Chillers Power'], linestyle='-', color=color_palette[1], label=f'{vessel_name} Chillers Power')

    
    plt.xlabel('Time (24 hours)')
    plt.ylabel('Hotel Power (kW)')
    plt.title(f'Time Series for Hotel Power of {vessel_name}')
    plt.grid(True, linestyle='--', alpha=0.6)
    plt.xticks(rotation=45)
    plt.legend()

    # Set the X-axis limits to cover a 24-hour period based on the first timestamp
    start_time = df['Timestamp'].min().replace(hour=0, minute=0, second=0, microsecond=0)
    end_time = start_time + pd.Timedelta(hours=23)

    # Adjust the X-axis limits to show the full 24-hour range
    plt.xlim(start_time, end_time)

    # Format the X-axis
    plt.gca().xaxis.set_major_locator(mdates.HourLocator(interval=1))  
    plt.gca().xaxis.set_minor_locator(mdates.MinuteLocator(interval=30))  
    plt.gca().xaxis.set_major_formatter(mdates.DateFormatter('%H:%M'))

    # Set Y-axis close to the maximum value
    max_value = df["Hotel Power"].max()
    y_upper_limit = max_value + (max_value * 0.1)

    plt.ylim(0, y_upper_limit)
    plt.yticks(range(0, int(y_upper_limit) + 1, 1000))
    
    # Show the plot
    plt.show()