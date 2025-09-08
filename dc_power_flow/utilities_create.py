import pandas as pd
import pandapower as pp
from ast import literal_eval
import numpy as np
import json
from utilities_read import read_uc_definition, read_cable_catalogue, process_cable_catalogue
from utilities_net_topology import separate_subnetworks, sorting_network, merge_networks
from utilities_assets_profile import generate_load_profile


def create_dc_network(path: str, path_cable_catalogue: str, path_converter_catalogue: str) -> tuple:
    """
    Creates a DC network from the provided Excel file and cable catalogue.

    Args:
        path (str): Path to the Excel file containing network data.
        path_cable_catalogue (str): Path to the cable catalogue file.
        path_converter_catalogue (str): Path to the converter catalogue file.

    Returns:
        tuple: A tuple containing:
            - net (pandapower.Network): The created pandapower network.
            - cable_catalogue (pd.DataFrame): The processed cable catalogue.
            - use_case (dict): Dictionary containing UC definition data.
            - node_data
    """
    # Create an empty pandapower network
    net = pp.create_empty_network()

    # Read Excel file and UC definition
    xl_file = pd.ExcelFile(path)
    use_case = read_uc_definition(xl_file)

    # Parse necessary sheets from the Excel file
    line_data = xl_file.parse('Lines')
    node_data = xl_file.parse('Assets Nodes')
    converter_data = xl_file.parse('Converters')
    converter_default = xl_file.parse('Default Droop Curves')
    user_profile_data = xl_file.parse('User-defined Assets Profiles').dropna(axis=0)
    default_assets_profile = xl_file.parse('Default Assets Profiles')
    # Read and process the cable catalogue
    cable_catalogue = read_cable_catalogue(path_cable_catalogue)
    cable_info = use_case['Conductor parameters']
    cable_catalogue = process_cable_catalogue(cable_catalogue, cable_info)

    # Read and filter the converter catalogue
    converter_catalogue = pd.ExcelFile(path_converter_catalogue).parse('Converters')
    converter_catalogue = converter_catalogue.loc[
        converter_catalogue['Ecosystem'] == use_case['Project details']['Ecosystem']
    ]

    # Create buses and components
    _create_buses_and_components(net, node_data, converter_default, user_profile_data, default_assets_profile, use_case)
    
    # Create converters
    _create_converters(net, converter_data, converter_default, converter_catalogue)

    _create_lines(net, line_data, cable_catalogue)

    # Handle subnetworks and merge them
    subnetworks = separate_subnetworks(net)
    for subnetwork in subnetworks:
        _fix_zero_voltages(subnetwork)
    net = merge_networks(subnetworks)

    # Create converters
    _create_converters(net, converter_data, converter_default, converter_catalogue)

    return net, cable_catalogue, use_case, node_data


def _create_buses_and_components(net: pp.pandapowerNet, node_data: pd.DataFrame, converter_default, user_profile_data,
                                 default_assets_profile, use_case) -> None:
    """
    Creates buses and components (loads, storages, etc.) in the network.

    Args:
        net (pp.pandapowerNet): The pandapower network.
        node_data (pd.DataFrame): DataFrame containing node data.
    """
    timestep = use_case['Parameters for annual simulations']['Simulation time step (mins)']
    timelaps = use_case['Parameters for annual simulations']['Simulation period (days)']

    # Load device data from JSON
    try:
        with open('device_data.json', 'r') as f:
            device_data = json.load(f)
            # Create a mapping of friendly_name to value
            device_values = {item['friendly_name']: item['value'] for item in device_data}
    except Exception as e:
        print(f"Warning: Could not load device_data.json: {e}")
        device_values = {}

    for _, row in node_data.iterrows():
        # Convert Node number to integer to prevent type errors
        node_number = int(row['Node number'])
        bus = pp.create_bus(
            net,
            index=node_number,
            vn_kv=row['Operating nominal voltage (V)'] / 1000,
            name=f"Bus {node_number}"
        )

        component_type = row['Component type'].replace(' ', '').lower()
        if component_type == 'acgrid':
            pp.create_ext_grid(net, bus=bus, vm_pu=1.0)
        elif component_type in ['dcload', 'acload']:
            # Get the friendly name for this bus (D1, D2, etc.)
            friendly_name = f"D{node_number}"
            
            # Use device data if available, otherwise fall back to Excel data
            power_value = device_values.get(friendly_name, row['Maximum power (kW)'])
            
            # Validate and limit power value to prevent convergence issues
            max_allowed_power = row['Maximum power (kW)'] * 1.5  # Allow up to 150% of max power
            if power_value > max_allowed_power:
                print(f"Warning: Power value {power_value} kW for {friendly_name} exceeds maximum allowed {max_allowed_power} kW. Limiting to maximum.")
                power_value = max_allowed_power
            elif power_value < 0:
                print(f"Warning: Negative power value {power_value} kW for {friendly_name}. Setting to 0.")
                power_value = 0
            
            l = pp.create_load(
                net,
                name='load ' + str(bus),
                bus=bus,
                p_mw=power_value / 1000,  # Convert kW to MW
                q_mvar=0,
                scaling=np.sqrt(3)
            )

            if 'default' in row['Droop curve of asset']:
                if 'droop_curve' not in net.load.columns:
                    net.load['droop_curve'] = np.nan
                    net.load['droop_curve'] = net.load['droop_curve'].astype('object')
                str_dc = converter_default.loc[converter_default['Converter type'] == row['Component type'], 'Default Droop curve'].values[0]
                net.load.at[l, 'droop_curve'] = np.array(literal_eval('[' + str_dc.replace(';', ',') + ']'))
            
            if 'p_nom_mw' not in net.load.columns:
                net.load['p_nom_mw'] = np.nan
                net.load['p_nom_mw'] = net.load['p_nom_mw'].astype('object')
            net.load.at[l, 'p_nom_mw'] = power_value / 1000

            if 'user-defined' in row['Asset profile type']:
                if 'power_profile' not in net.load.columns:
                    net.load['power_profile'] = np.nan
                    net.load['power_profile'] = net.load['power_profile'].astype('object')
                if 'default_power_profile' not in net.load.columns:
                    net.load['default_power_profile'] = np.nan
                    net.load['default_power_profile'] = net.load['default_power_profile'].astype('object')

                net.load.at[l, 'default_power_profile'] = None
                net.load.at[l, 'power_profile'] = user_profile_data[bus].values

            else:
                if 'power_profile' not in net.load.columns:
                    net.load['power_profile'] = np.nan
                    net.load['power_profile'] = net.load['power_profile'].astype('object')
                if 'default_power_profile' not in net.load.columns:
                    net.load['default_power_profile'] = np.nan
                    net.load['default_power_profile'] = net.load['default_power_profile'].astype('object')

                net.load.at[l, 'default_power_profile'] = default_assets_profile[row['Asset profile type']].values
                _, load_profile, _ = generate_load_profile(timelaps, timestep, net.load.at[l, 'default_power_profile'],
                                                           noise_std=0.1, summer_coeficient=0.95, winter_coeficient=1.1,
                                                           holiday_coefficient=1/5, weekend_coeficent=1/20,
                                                           day_varation_sigma=0.1)
                net.load.at[l, 'power_profile'] = load_profile

        elif component_type == 'ev':
            ev = pp.create_storage(
                net,
                name='EV ' + str(bus),
                bus=bus,
                p_mw=row['Maximum power (kW)'] / 1000,  # Convert kW to MW
                max_e_mwh=row['Maximum power (kW)'] / 1000 * 4,  # Convert kWh to MWh
                soc_percent=100,  # Initial state of charge
                scaling=np.sqrt(3)
            )

            if 'p_nom_mw' not in net.storage.columns:
                net.storage['p_nom_mw'] = np.nan
                net.storage['p_nom_mw'] = net.storage['p_nom_mw'].astype('object')
            net.storage.at[ev, 'p_nom_mw'] = row['Maximum power (kW)'] / 1000

            if 'user-defined' in row['Asset profile type']:
                if 'power_profile' not in net.storage.columns:
                    net.storage['power_profile'] = np.nan
                    net.storage['power_profile'] = net.storage['power_profile'].astype('object')
                if 'default_power_profile' not in net.storage.columns:
                    net.storage['default_power_profile'] = np.nan
                    net.storage['default_power_profile'] = net.storage['default_power_profile'].astype('object')

                net.storage.at[ev, 'default_power_profile'] = None
                net.storage.at[ev, 'power_profile'] = user_profile_data[bus].values

            else:
                if 'power_profile' not in net.storage.columns:
                    net.storage['power_profile'] = np.nan
                    net.storage['power_profile'] = net.storage['power_profile'].astype('object')
                if 'default_power_profile' not in net.storage.columns:
                    net.storage['default_power_profile'] = np.nan
                    net.storage['default_power_profile'] = net.storage['default_power_profile'].astype('object')

                net.storage.at[ev, 'default_power_profile'] = default_assets_profile[row['Asset profile type']].values
                _, load_profile, _ = generate_load_profile(timelaps, timestep,
                                                           net.storage.at[ev, 'default_power_profile'],
                                                           noise_std=0.1, summer_coeficient=0.9, winter_coeficient=1.2,
                                                           holiday_coefficient=1/5, weekend_coeficent=1/20,
                                                           day_varation_sigma=0.1)
                net.storage.at[ev, 'power_profile'] = load_profile

        elif component_type == 'storage':
            if not np.isnan(row['Maximum power (kW)']):
                pp.create_storage(
                    net,
                    name='Battery ' + str(bus),
                    bus=bus,
                    p_mw=row['Maximum power (kW)'] / 1000,  # Convert kW to MW
                    max_e_mwh=row['Capacity (kWh)'] / 1000,  # Convert kWh to MWh
                    p_nom_mw=row['Maximum power (kW)'] / 1000,  # Convert kW to MW
                    soc_percent=100,  # Initial state of charge at 50%
                    scaling=np.sqrt(3)
                )
            else:
                pp.create_storage(
                    net,
                    name='Battery ' + str(bus),
                    bus=bus,
                    p_mw=0,  # Convert kW to MW
                    max_e_mwh=0,  # Convert kWh to MWh
                    soc_percent=50,  # Initial state of charge at 50%
                    scaling=np.sqrt(3)
                )
        elif component_type == 'pv':
            sgen = pp.create_sgen(
                net,
                bus=bus,
                name=f'PV {bus}',
                p_mw=row['Maximum power (kW)'] / 1000,  # Active power in MW
                scaling=np.sqrt(3)
            )

            if 'p_nom_mw' not in net.sgen.columns:
                net.sgen['p_nom_mw'] = np.nan
                net.sgen['p_nom_mw'] = net.sgen['p_nom_mw'].astype('object')
            net.sgen.at[sgen, 'p_nom_mw'] = row['Maximum power (kW)'] / 1000

            if 'user-defined' in row['Asset profile type']:
                if 'power_profile' not in net.sgen.columns:
                    net.sgen['power_profile'] = np.nan
                    net.sgen['power_profile'] = net.sgen['power_profile'].astype('object')
                if 'default_power_profile' not in net.sgen.columns:
                    net.sgen['default_power_profile'] = np.nan
                    net.sgen['default_power_profile'] = net.sgen['default_power_profile'].astype('object')

                net.sgen.at[sgen, 'default_power_profile'] = None
                net.sgen.at[sgen, 'power_profile'] = user_profile_data[bus].values

            else:
                if 'power_profile' not in net.sgen.columns:
                    net.sgen['power_profile'] = np.nan
                    net.sgen['power_profile'] = net.sgen['power_profile'].astype('object')
                if 'default_power_profile' not in net.sgen.columns:
                    net.sgen['default_power_profile'] = np.nan
                    net.sgen['default_power_profile'] = net.sgen['default_power_profile'].astype('object')

                net.sgen.at[sgen, 'default_power_profile'] = default_assets_profile[row['Asset profile type']].values
                _, load_profile, _ = generate_load_profile(timelaps, timestep,
                                                           net.sgen.at[sgen, 'default_power_profile'],
                                                           noise_std=0.1, summer_coeficient=1, winter_coeficient=0.4,
                                                           holiday_coefficient=1, weekend_coeficent=1,
                                                           day_varation_sigma=0.4)
                net.sgen.at[sgen, 'power_profile'] = load_profile

        # Create linked converter bus if needed
        if not np.isnan(row['Node number for directly linked converter']):
            linked_bus_index = int(row['Node number for directly linked converter'])
            if linked_bus_index not in net.bus.index:
                pp.create_bus(
                    net,
                    index=linked_bus_index,
                    vn_kv=0,
                    name=f"Bus {linked_bus_index}"
                )


def _create_lines(net: pp.pandapowerNet, line_data: pd.DataFrame, cable_catalogue: pd.DataFrame) -> None:
    """
    Creates lines in the network based on the line data.

    Args:
        net (pp.pandapowerNet): The pandapower network.
        line_data (pd.DataFrame): DataFrame containing line data.
        cable_catalogue (pd.DataFrame): Processed cable catalogue.
    """
    for _, row in line_data.iterrows():
        # Create buses if they don't exist
        for node in [row['Node_i'], row['Node_j']]:
            if node not in net.bus.index:
                # Convert node to integer to avoid type errors
                node_int = int(node)
                pp.create_bus(
                    net,
                    index=node_int,
                    vn_kv=0,
                    name=f"Bus {node_int}"
                )

        # Create the line
        if not np.isnan(row['Resistance (ohm/m)']):
            pp.create_line_from_parameters(
                net,
                from_bus=int(row['Node_i']),
                to_bus=int(row['Node_j']),
                length_km=row['Line length (m)'] / 1000,
                r_ohm_per_km=row['Resistance (ohm/m)']*1000,
                x_ohm_per_km=1e-20,
                c_nf_per_km=0,
                max_i_ka=1e3,
                cable_rank=None,
                section=None
            )
        else:
            cable = cable_catalogue.iloc[-1]
            pp.create_line_from_parameters(
                net,
                from_bus=int(row['Node_i']),
                to_bus=int(row['Node_j']),
                length_km=row['Line length (m)'] / 1000,
                r_ohm_per_km=cable['R'] * 1000,
                x_ohm_per_km=1e-20,
                c_nf_per_km=0,
                max_i_ka=cable['Imax'] / 1000,
                cable_rank=len(cable_catalogue) - 1,
                section=cable['section']
            )


def _fix_zero_voltages(subnetwork: pp.pandapowerNet) -> None:
    """
    Fixes zero voltages in the subnetwork by setting them to the first non-zero voltage.

    Args:
        subnetwork (pp.pandapowerNet): The subnetwork to fix.
    """
    if sum(np.isclose(subnetwork.bus.vn_kv.values, 0)):
        non_zero_voltage = subnetwork.bus.loc[~np.isclose(subnetwork.bus.vn_kv.values, 0), 'vn_kv'].iloc[0]
        subnetwork.bus.loc[np.isclose(subnetwork.bus.vn_kv.values, 0), 'vn_kv'] = non_zero_voltage


def _create_converters(net: pp.pandapowerNet, converter_data: pd.DataFrame, converter_default: pd.DataFrame,
                       converter_catalogue: pd.DataFrame) -> None:
    """
    Creates converters in the network based on the converter data.

    Args:
        net (pp.pandapowerNet): The pandapower network.
        converter_data (pd.DataFrame): DataFrame containing converter data.
        converter_default (pd.DataFrame): DataFrame containing default converter data.
        converter_catalogue (pd.DataFrame): DataFrame containing converter catalogue data.
    """
    net.converter = pd.DataFrame(
        columns=[
            'name', 'from_bus', 'to_bus', 'type', 'P', 'efficiency', 'stand_by_loss',
            'efficiency curve', 'droop_curve', 'conv_rank', 'converter_catalogue'
        ]
    )

    converter_data = converter_data.rename(columns={
        "Converter name": "name",
        "Node_i number": 'from_bus',
        "Node_j number": 'to_bus',
        "Converter type": "type",
        "Nominal power (kW)": 'Nominal power (kW)',
        "Efficiency curve if user-defined": 'efficiency curve',
        "Voltage level V_i (V)": "V_i",
        "Voltage level V_j (V)": "V_j",
        "Droop curve if user-defined": 'droop_curve'
    })

    for _, row in converter_data.iterrows():
        if not np.isnan(row['Nominal power (kW)']):
            _add_converter(net, row, converter_catalogue, converter_default)
        else:
            _add_converter_from_catalogue(net, row, converter_catalogue, converter_default)


def _add_converter(net: pp.pandapowerNet, row: pd.Series, converter_catalogue: pd.DataFrame,
                   converter_default: pd.DataFrame) -> None:
    """
    Adds a converter to the network based on the provided row data.

    Args:
        net (pp.pandapowerNet): The pandapower network.
        row (pd.Series): Row containing converter data.
        converter_catalogue (pd.DataFrame): DataFrame containing converter catalogue data.
        converter_default (pd.DataFrame): DataFrame containing default converter data.
    """

    # Create buses if they don't exist
    for bus_key in ['from_bus', 'to_bus']:
        # Skip NaN values - cannot create a bus with NaN index
        if pd.isna(row[bus_key]):
            continue
            
        # Convert bus index to integer
        bus_index = int(row[bus_key])
        if bus_index not in net.bus.index:
            voltage_key = 'V_i' if bus_key == 'from_bus' else 'V_j'
            voltage = row[voltage_key] / 1000 if not np.isnan(row[voltage_key]) else 0 / 1000
            pp.create_bus(
                net,
                index=bus_index,
                vn_kv=voltage,
                name=f"Bus {bus_index}"
            )
        else:
            voltage_key = 'V_i' if bus_key == 'from_bus' else 'V_j'
            if not np.isnan(row[voltage_key]):
                net.bus.loc[bus_index, 'vn_kv'] = row[voltage_key] / 1000

    # Check if from_bus or to_bus is NaN - if so, we can't create a converter
    if pd.isna(row['from_bus']) or pd.isna(row['to_bus']):
        print(f"Warning: Skipping converter '{row['name']}' because from_bus or to_bus is NaN")
        return

    # Calculate efficiency and droop curves
    if row['Efficiency curve'] == 'default':
        type_c = row['type']
        tmp_cc = converter_catalogue.loc[converter_catalogue['Converter type'] == type_c].copy()
        conv = tmp_cc.loc[tmp_cc['Nominal power (kW)'].idxmin()]
        row['efficiency curve'] = conv['Efficiency curve [Xi;Yi], i={1,2,3,4}, \nwith X= Factor of Nominal Power (%), Y=Efficiency (%)']
    efficiency = _calculate_efficiency(row)
    droop_curve = _calculate_droop_curve(row, converter_default)

    # Add converter to the network
    new_row = {
        "name": row['name'],
        "from_bus": int(row['from_bus']),
        "to_bus": int(row['to_bus']),
        "type": row['type'],
        "P": row['Nominal power (kW)'] / 1000,  # Convert kW to MW
        "efficiency": efficiency,
        "efficiency curve": row['efficiency curve'],
        "droop_curve": droop_curve,
        'converter_catalogue': None,
        'conv_rank': None,
        'stand_by_loss': 0
    }
    net.converter.loc[len(net.converter)] = new_row


def _add_converter_from_catalogue(net: pp.pandapowerNet, row: pd.Series, converter_catalogue: pd.DataFrame,
                                  converter_default: pd.DataFrame) -> None:
    """
    Adds a converter to the network based on the converter catalogue.

    Args:
        net (pp.pandapowerNet): The pandapower network.
        row (pd.Series): Row containing converter data.
        converter_catalogue (pd.DataFrame): DataFrame containing converter catalogue data.
        converter_default (pd.DataFrame): DataFrame containing default converter data.
    """
    type_c = row['type']
    tmp_cc = converter_catalogue.loc[converter_catalogue['Converter type'] == type_c].copy()

    if np.isnan(row["V_i"]):
        tmp_cc = tmp_cc.loc[
            (tmp_cc['Voltage level V1 (V)'] == row["V_j"]) |
            (tmp_cc['Voltage level V2 (V)'] == row["V_j"])
        ]
    else:
        tmp_cc = tmp_cc.loc[
            ((tmp_cc['Voltage level V1 (V)'] == row["V_j"]) & (tmp_cc['Voltage level V2 (V)'] == row["V_i"])) |
            ((tmp_cc['Voltage level V1 (V)'] == row["V_i"]) & (tmp_cc['Voltage level V2 (V)'] == row["V_j"]))
        ]

    tmp_cc.reset_index(inplace=True, drop=True)
    conv = tmp_cc.loc[tmp_cc['Nominal power (kW)'].idxmin()]

    # Create buses if they don't exist
    for bus_key in ['from_bus', 'to_bus']:
        # Skip NaN values - cannot create a bus with NaN index
        if pd.isna(row[bus_key]):
            continue
            
        # Convert bus index to integer
        bus_index = int(row[bus_key])
        if bus_index not in net.bus.index:
            voltage_key = 'V_i' if bus_key == 'from_bus' else 'V_j'
            voltage = row[voltage_key] / 1000 if not np.isnan(row[voltage_key]) else 0 / 1000
            pp.create_bus(
                net,
                index=bus_index,
                vn_kv=voltage,
                name=f"Bus {bus_index}"
            )
        else:
            voltage_key = 'V_i' if bus_key == 'from_bus' else 'V_j'
            if not np.isnan(row[voltage_key]):
                net.bus.loc[bus_index, 'vn_kv'] = row[voltage_key] / 1000

    # Check if from_bus or to_bus is NaN - if so, we can't create a converter
    if pd.isna(row['from_bus']) or pd.isna(row['to_bus']):
        print(f"Warning: Skipping converter '{row['name']}' because from_bus or to_bus is NaN")
        return

    # Calculate efficiency and droop curves
    efficiency = _calculate_efficiency(row, conv)
    droop_curve = _calculate_droop_curve(row, converter_default)

    # Add converter to the network
    new_row = {
        "name": row['name'],
        "from_bus": int(row['from_bus']),
        "to_bus": int(row['to_bus']),
        "type": row['type'],
        "P": conv['Nominal power (kW)'] / 1000,  # Convert kW to MW
        "efficiency": efficiency,
        "efficiency curve": row['efficiency curve'],
        "droop_curve": droop_curve,
        'converter_catalogue': tmp_cc,
        "conv_rank": tmp_cc['Nominal power (kW)'].idxmin(),
        'stand_by_loss': conv['Stand-by losses (W)'] / 1e6
    }
    net.converter.loc[len(net.converter)] = new_row


def _calculate_efficiency(row: pd.Series, conv: pd.Series = None) -> np.ndarray:
    """
    Calculates the efficiency curve for a converter.

    Args:
        row (pd.Series): Row containing converter data.
        conv (pd.Series, optional): Row containing converter catalogue data.

    Returns:
        np.ndarray: Efficiency curve as a numpy array.
    """
    if row['Efficiency curve'] == 'user-defined':
        eff = np.array(literal_eval(row['efficiency curve']))
        e = eff[:, 1].astype('float') / 100
        p = eff[:, 0] / 100 * (row['Nominal power (kW)'] if conv is None else conv['Nominal power (kW)'])
        return np.vstack((p, e)).T
    else:
        eff_str = row['efficiency curve'] if conv is None else conv['Efficiency curve [Xi;Yi], i={1,2,3,4}, \nwith X= Factor of Nominal Power (%), Y=Efficiency (%)']
        eff = np.array(literal_eval('[' + eff_str.replace(';', ',') + ']'))
        e = eff[:, 1].astype('float') / 100
        p = eff[:, 0] / 100 * (row['Nominal power (kW)'] if conv is None else conv['Nominal power (kW)'])
        return np.vstack((p, e)).T


def _calculate_droop_curve(row: pd.Series, converter_default: pd.DataFrame) -> np.ndarray:
    """
    Calculates the droop curve for a converter.

    Args:
        row (pd.Series): Row containing converter data.
        converter_default (pd.DataFrame): DataFrame containing default converter data.

    Returns:
        np.ndarray: Droop curve as a numpy array.
    """
    if 'droop control' in row["Voltage control mode"]:
        if 'user-defined' in row["Droop curve"]:
            return np.array(literal_eval(row['droop_curve']))
        else:
            str_dc = converter_default.loc[
                converter_default['Converter type'] == row['type'],
                'Default Droop curve'
            ].values[0]
            return np.array(literal_eval('[' + str_dc.replace(';', ',') + ']'))
    else:
        return np.array([[1.025, 1], [1, 1], [1, 1], [1, 1], [1, 1], [0.975, 1]])
