import pandas as pd

from vessel_functions.registed_vessels import (
    plot_energy_consumption_for_ship,
    plot_energy_graph_for_closest_ship
)

from vessel_functions.input_vessels import (
    get_user_inputs,
    find_closest_ship,
    generate_energy_profile
)

from vessel_functions.utilities_functions import (
    create_and_show_plot
)

def main():
    """Main function to execute the energy profile generation process."""

    print("\nChoose an option:")
    print("1 - Use registered vessel data")
    print("2 - Input new vessel data")
    
    choice = input("\nEnter your choice (1 or 2): ").strip()

    # Define folder path
    folder_path = "./Data/CruisesSlices_Resampled"

    if choice == "1":
        # Option 1: Use registered vessel
        target_ship = input("\nEnter the name of the registered ship: ").strip()
        arrival_time = input("Enter Arrival Time (HH:MM:SS): ").strip()
        departure_time = input("Enter Departure Time (HH:MM:SS): ").strip()

        # Find the closest registered ship and its scaling factor
        closest_ship, scaling_factor = plot_energy_consumption_for_ship(target_ship)

        if closest_ship:
            print(f"\nThe closest ship to {target_ship} is {closest_ship}. Scaling Factor: {scaling_factor:.2f}\n")

            # Generate and save the energy profile
            json_output = plot_energy_graph_for_closest_ship(target_ship, closest_ship, folder_path, arrival_time, departure_time, scaling_factor)

            if json_output:
                df = pd.DataFrame(json_output["energy_profile_data"])
                create_and_show_plot(df, target_ship)
                print("Energy data successfully saved to vessel_output.json")
            else:
                print("Failed to generate energy data.")
        else:
            print(f"No closest ship found for {target_ship}.")

    elif choice == "2":
        # Option 2: Input new vessel data
        user_ship = get_user_inputs()

        # Find the closest ship from the dataset
        closest_ship, scaling_factor = find_closest_ship(user_ship)

        if closest_ship:
            print(f"\nThe closest ship to {user_ship['name']} is {closest_ship}. Scaling Factor: {scaling_factor:.2f}\n")

            # Generate and save the energy profile
            df, json_output = generate_energy_profile(user_ship, closest_ship, folder_path, scaling_factor)

            if json_output:
                df = pd.DataFrame(json_output["energy_profile_data"])
                create_and_show_plot(df, user_ship["name"])
                print("Energy data successfully saved to vessel_output.json")
            else:
                print("Failed to generate energy data.")
        else:
            print(f"No closest ship found for {user_ship['name']}.")

    else:
        print("Invalid choice. Please enter either '1' or '2'.")

if __name__ == "__main__":
    main()
