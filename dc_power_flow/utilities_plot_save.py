import matplotlib.pyplot as plt
import pandapower.plotting.plotly as pplotly
from pandas import Series
import pandas as pd
import pandapower as pp
import copy
import plotly.graph_objects as go
import plotly.express as px
import os
import json

# Define the output directory
output_dir = "output"
# Create the directory if it doesn't exist
os.makedirs(output_dir, exist_ok=True)


def plot_voltage(net):
    """
    Plots the voltage profiles of the buses in the given pandapower network.

    Parameters:
    net (pandapowerNet): The pandapower network object.
    """
    bus_indices = net.bus.index
    bus_voltages = net.res_bus.vm_pu

    plt.figure(figsize=(10, 6))
    plt.plot(bus_indices, bus_voltages, marker='o', linestyle='None', color='b', label="Voltage (p.u.)")

    plt.title("Voltage Profiles")
    plt.xlabel("Bus Index")
    plt.ylabel("Voltage (p.u.)")
    plt.grid(True)

    # Ensure x-axis limits cover all bus indices
    plt.xlim(min(bus_indices) - 1, max(bus_indices) + 1)  # Add some margin

    # Set dynamic y-axis limits with a fixed margin
    margin = 0.02  # Add a 2% margin for better visualization
    plt.ylim(min(bus_voltages) - margin, max(bus_voltages) + margin)

    # Ensure x-ticks match bus indices and rotate if necessary
    plt.xticks(ticks=bus_indices, labels=bus_indices, rotation=45)

    plt.legend()
    plt.show()


def plot_network_evaluation_results_with_plotly(net, node_data, file_name):
    net_plot = copy.deepcopy(net)
    # Add equivalent transformers for visualization
    for _, row in net_plot.converter.iterrows():
        if row.type != 'ILC':
            v1 = net_plot.bus.vn_kv.loc[net_plot.bus.index == row.from_bus].values[0]
            v2 = net_plot.bus.vn_kv.loc[net_plot.bus.index == row.to_bus].values[0]

            if v1 > v2:
                pp.create_transformer_from_parameters(
                    net_plot,
                    hv_bus=row.from_bus,
                    lv_bus=row.to_bus,
                    sn_mva=row.P,
                    vn_hv_kv=v1,
                    vn_lv_kv=v2,
                    vkr_percent=0,
                    vk_percent=0,
                    pfe_kw=0,
                    i0_percent=0
                )
            else:
                pp.create_transformer_from_parameters(
                    net_plot,
                    hv_bus=row.to_bus,
                    lv_bus=row.from_bus,
                    sn_mva=row.P,
                    vn_hv_kv=v2,
                    vn_lv_kv=v1,
                    vkr_percent=0,
                    vk_percent=0,
                    pfe_kw=0,
                    i0_percent=0
                )

    # Create coordinates
    pplotly.create_generic_coordinates(
        net_plot,
        mg=None,
        library='igraph',
        respect_switches=True,
        trafo_length_km=0.0000001,
        geodata_table='bus_geodata',
        buses=None,
        overwrite=True
    )

    # Create base figure
    fig = pplotly.simple_plotly(net_plot, auto_open=False)

    # Line trace
    line_trace = pplotly.create_line_trace(
        net_plot,
        cmap="jet",
        cmap_vals=net_plot.res_line.loading_percent,
        width=4.0,
        cbar_title="Line Loading (%)",
        cmin=5,
        cmax=100,
        infofunc=(Series(index=net.line.index,
                         data=[f'Line from {net.line.loc[i, "from_bus"]} bus to bus {net.line.loc[i, "to_bus"]} <br>'
                               f'Length: {net.line.loc[i, "length_km"]*1000} m <br>'
                               f'Section: {net.line.loc[i, "section"]} mm² <br>'
                               f'Cable rank: {net.line.loc[i, "cable_rank"]} <br>'
                               f'Current: {row.i_ka * 1000:.1f} A <br>'
                               f'Power from bus {net.line.loc[i, "from_bus"]}: {row.p_from_mw * 1000:.3f} kW <br>'
                               f'Power to bus {net.line.loc[i, "to_bus"]}: {row.p_to_mw * 1000:.3f} kW <br>'
                               f'Losses: {row.pl_mw * 1000:.3f} kW <br>'
                               f'Loading: {row.loading_percent:.1f} %'
                               for i, row in net.res_line.iterrows()]))
    )

    # Bus trace
    bus_trace = pplotly.create_bus_trace(
        net_plot,
        cmap="plasma_r",
        cmap_vals=net_plot.res_bus.vm_pu,
        size=10,
        cbar_title="Bus Voltage (p.u.)",
        cmin=0.9,
        cmax=1.1,
        infofunc=(Series(index=net.bus.index,
                         data=[f'Bus {s1} <br>'
                               f'Voltage: {s2:.3f} pu <br>'
                               f'Power: {net.res_bus.p_mw.loc[int(s1)]*1000:.3f} kW'
                               for s1, s2 in zip(net.bus.index.astype(str), net.res_bus.vm_pu)]))
    )

    # Conv trace
    trafo_trace = pplotly.create_trafo_trace(
        net_plot,
        color='black',
        width=15,
        infofunc=(Series(index=net.converter.index,
                         data=[f'Converter {net.converter.loc[i, "name"]} from bus {net.converter.loc[i, "from_bus"]} to bus {net.converter.loc[i, "to_bus"]} <br>'
                               f'Installed Power: {net.converter.loc[i, "P"]*1000:.1f} kW <br>'
                               f'Conv rank: {net.converter.loc[i, "conv_rank"]} <br>'
                               f'Power: {row.p_mw * 1000:.3f} kW <br>'
                               f'Losses: {row.pl_mw * 1000:.3f} kW <br>'
                               f'Loading: {net.res_converter.loc[i, "loading (%)"]:.1f} %'
                               for i, row in net.res_converter.iterrows()]))
    )

    # Add text for bus numbers & asset types
    bus_text = go.Scatter(
        x=[net_plot.bus_geodata.x.loc[i] for i in net_plot.bus.index],
        y=[net_plot.bus_geodata.y.loc[i]+0.1 for i in net_plot.bus.index],
        mode="text",
        text=[
            f"{i} ({node_data.loc[node_data['Node number'] == i, 'Component type'].str.replace(' ', '').str.lower().values[0]})"
            if i in node_data['Node number'].values else str(i)
            for i in net_plot.bus.index
        ],
        textposition="top right",
        showlegend=False
    )

    # Add text for line sections
    line_text = go.Scatter(
        x=[(net_plot.bus_geodata.x.loc[net.line.loc[i, "from_bus"]] + net_plot.bus_geodata.x.loc[
            net.line.loc[i, "to_bus"]]) / 2 for i in net.line.index],
        y=[(net_plot.bus_geodata.y.loc[net.line.loc[i, "from_bus"]] + net_plot.bus_geodata.y.loc[
            net.line.loc[i, "to_bus"]]) / 2 + 0.1 for i in net.line.index],
        mode="text",
        text=[f'{net.line.loc[i, "section"]} mm²' for i in net.line.index],
        textposition="top center",
        showlegend=False
    )

    # Add text for converter installed power
    converter_text = go.Scatter(
        x=[(net_plot.bus_geodata.x.loc[net.converter.loc[i, "from_bus"]] + net_plot.bus_geodata.x.loc[
            net.converter.loc[i, "to_bus"]]) / 2 for i in net.converter.index],
        y=[(net_plot.bus_geodata.y.loc[net.converter.loc[i, "from_bus"]] + net_plot.bus_geodata.y.loc[
            net.converter.loc[i, "to_bus"]]) / 2 + 0.2 for i in net.converter.index],
        mode="text",
        text=[f'{net.converter.loc[i, "P"] * 1000:.1f} kW' for i in net.converter.index],
        textposition="bottom center",
        showlegend=False
    )

    # Draw plot with legend
    fig = pplotly.draw_traces(
        line_trace + trafo_trace + bus_trace + [bus_text] + [line_text] + [converter_text],
        figsize=2,
        aspectratio=(20, 10),
        filename=file_name,
        auto_open=False,
        showlegend=False
    )

    fig.show()


def plot_network_sizing_results_with_plotly(net, node_data, file_name):
    net_plot = copy.deepcopy(net)
    # Add equivalent transformers for visualization
    for _, row in net_plot.converter.iterrows():
        if row.type != 'ILC':
            v1 = net_plot.bus.vn_kv.loc[net_plot.bus.index == row.from_bus].values[0]
            v2 = net_plot.bus.vn_kv.loc[net_plot.bus.index == row.to_bus].values[0]

            if v1 > v2:
                pp.create_transformer_from_parameters(
                    net_plot,
                    hv_bus=row.from_bus,
                    lv_bus=row.to_bus,
                    sn_mva=row.P,
                    vn_hv_kv=v1,
                    vn_lv_kv=v2,
                    vkr_percent=0,
                    vk_percent=0,
                    pfe_kw=0,
                    i0_percent=0
                )
            else:
                pp.create_transformer_from_parameters(
                    net_plot,
                    hv_bus=row.to_bus,
                    lv_bus=row.from_bus,
                    sn_mva=row.P,
                    vn_hv_kv=v2,
                    vn_lv_kv=v1,
                    vkr_percent=0,
                    vk_percent=0,
                    pfe_kw=0,
                    i0_percent=0
                )

    # Create coordinates
    pplotly.create_generic_coordinates(
        net_plot,
        mg=None,
        library='igraph',
        respect_switches=True,
        trafo_length_km=0.0000001,
        geodata_table='bus_geodata',
        buses=None,
        overwrite=True
    )

    # Create base figure
    fig = pplotly.simple_plotly(net_plot, auto_open=False)

    # Line trace
    line_trace = pplotly.create_line_trace(
        net_plot,
        # cmap="jet",
        # cmap_vals=net_plot.line.section,
        color='brown',
        width=4.0,
        # cbar_title="Line section (mm²)",
        infofunc=(Series(index=net.line.index,
                         data=[f'Line from {net.line.loc[i, "from_bus"]} bus to bus {net.line.loc[i, "to_bus"]} <br>'
                               f'Length: {net.line.loc[i, "length_km"]*1000} m <br>'
                               f'Section: {net.line.loc[i, "section"]} mm²'
                               for i, row in net.res_line.iterrows()]))
    )

    # Bus trace
    bus_trace = pplotly.create_bus_trace(
        net_plot,
        color='blue',
        size=10,
        infofunc=(Series(index=net.bus.index,
                         data=[f'Bus {s1}'
                               for s1, s2 in zip(net.bus.index.astype(str), net.res_bus.vm_pu)]))
    )

    # Conv trace
    trafo_trace = pplotly.create_trafo_trace(
        net_plot,
        color='black',
        width=15,
        infofunc=(Series(index=net.converter.index,
                         data=[f'Converter {net.converter.loc[i, "name"]} from bus {net.converter.loc[i, "from_bus"]} to bus {net.converter.loc[i, "to_bus"]} <br>'
                               f'Installed Power: {net.converter.loc[i, "P"]*1000:.1f} kW'
                               for i, row in net.res_converter.iterrows()]))
    )
    # Rename legend
    for trace in trafo_trace:
        trace.update(name="converters")

    # Add text for bus numbers & asset types
    bus_text = go.Scatter(
        x=[net_plot.bus_geodata.x.loc[i] for i in net_plot.bus.index],
        y=[net_plot.bus_geodata.y.loc[i]+0.1 for i in net_plot.bus.index],
        mode="text",
        text=[
            f"{i} ({node_data.loc[node_data['Node number'] == i, 'Component type'].str.replace(' ', '').str.lower().values[0]})"
            if i in node_data['Node number'].values else str(i)
            for i in net_plot.bus.index
        ],
        textposition="top right",
        showlegend=False
    )

    # Add text for line sections
    line_text = go.Scatter(
        x=[(net_plot.bus_geodata.x.loc[net.line.loc[i, "from_bus"]] + net_plot.bus_geodata.x.loc[
            net.line.loc[i, "to_bus"]]) / 2 for i in net.line.index],
        y=[(net_plot.bus_geodata.y.loc[net.line.loc[i, "from_bus"]] + net_plot.bus_geodata.y.loc[
            net.line.loc[i, "to_bus"]]) / 2 + 0.1 for i in net.line.index],
        mode="text",
        text=[f'{net.line.loc[i, "section"]} mm²' for i in net.line.index],
        textposition="top center",
        showlegend=False
    )

    # Add text for converter installed power
    converter_text = go.Scatter(
        x=[(net_plot.bus_geodata.x.loc[net.converter.loc[i, "from_bus"]] + net_plot.bus_geodata.x.loc[
            net.converter.loc[i, "to_bus"]]) / 2 for i in net.converter.index],
        y=[(net_plot.bus_geodata.y.loc[net.converter.loc[i, "from_bus"]] + net_plot.bus_geodata.y.loc[
            net.converter.loc[i, "to_bus"]]) / 2 + 0.2 for i in net.converter.index],
        mode="text",
        text=[f'{net.converter.loc[i, "P"] * 1000:.1f} kW' for i in net.converter.index],
        textposition="bottom center",
        showlegend=False
    )

    # Draw plot with legend
    fig = pplotly.draw_traces(
        line_trace + trafo_trace + bus_trace + [bus_text] + [line_text] + [converter_text],
        figsize=2,
        aspectratio=(20, 10),
        filename=file_name,
        auto_open=False,
        showlegend=True
    )

    fig.show()


def plot_bus_voltage_heatmap(net, scenario_name):
    bus_indices = list(map(str, net.bus.index))  # Convert to strings for categorical x-axis

    fig = px.bar(
        x=bus_indices,
        y=net.res_bus.vm_pu,
        color=net.res_bus.vm_pu,
        labels={'x': 'Bus Index', 'y': 'Voltage (p.u.)'},
        title=rf'Bus Voltage Levels in scenario {scenario_name.split(" ")[3]}',
    )

    # Force all x-ticks to be displayed
    fig.update_layout(
        xaxis=dict(
            tickmode='array',
            tickvals=list(range(len(bus_indices))),
            ticktext=bus_indices,
            showticklabels=True
        ),
        bargap=0.1
    )
    fig.show()
    fig.write_html(os.path.join(output_dir, rf'output_voltage_bars_scenario_{scenario_name.split(" ")[3]}.html'))


def save_sizing_results_to_excel(net, node_data, file_name):
    # Create the "line sizing" sheet
    line_sizing_data = {
        "Line Index": net.line.index,
        "From Bus": net.line['from_bus'],
        "To Bus": net.line['to_bus'],
        "Section (mm²)": net.line['section']
    }
    line_sizing_df = pd.DataFrame(line_sizing_data)

    # Create the "converter sizing" sheet
    converter_sizing_data = {
        "Converter Index": net.converter.index,
        "Converter Name": net.converter['name'],
        "From Bus": net.converter['from_bus'],
        "To Bus": net.converter['to_bus'],
        "Nominal Power Installed (kW)": net.converter['P'] * 1000  # Convert to kW
    }
    converter_sizing_df = pd.DataFrame(converter_sizing_data)

    # Save both DataFrames to an Excel file
    with pd.ExcelWriter(file_name, engine='xlsxwriter') as writer:
        line_sizing_df.to_excel(writer, sheet_name='Line Sizing', index=False)
        converter_sizing_df.to_excel(writer, sheet_name='Converter Sizing', index=False)

    print(f"Sizing results saved to {file_name}")


def plot_efficiency_kpi(efficiency_results):
    labels = ['Efficiency Ratio', 'Total Consumed Energy (MWh)', 'Total Generated Energy (MWh)',
              'Total Losses in Cables (MWh)', 'Total Losses in Converters (MWh)']
    values = [efficiency_results[0], efficiency_results[1], efficiency_results[2],
              efficiency_results[3], efficiency_results[4]]

    fig, ax1 = plt.subplots(figsize=(8, 6))

    # Plot the quantities on the primary y-axis
    ax1.bar(labels[1:], values[1:], color=['green', 'orange', 'red', 'purple'])
    # ax1.set_xlabel('KPI Type')
    ax1.set_ylabel('Energy (MWh)', color='black')
    ax1.tick_params(axis='y', labelcolor='black')

    # Rotate the xticks to 45 degrees
    plt.xticks(rotation=45, ha='right')

    # Create a secondary y-axis for the Efficiency Ratio
    ax2 = ax1.twinx()
    ax2.bar(labels[:1], [values[0]], color='blue', alpha=0.6)  # Bar for Efficiency Ratio
    ax2.set_ylabel('Efficiency Ratio', color='blue')
    ax2.tick_params(axis='y', labelcolor='blue')

    # Adding title and adjusting layout
    plt.title('Efficiency KPI')
    plt.tight_layout()

    # Save or show the plot
    plt.savefig(os.path.join(output_dir, 'output_kpis_results_efficiency.png'))
    plt.close()


def plot_economic_kpi(economic_results):
    # Extract CAPEX details
    total_capex_keur = economic_results[0]
    capex_details = economic_results[1]
    converters_capex = capex_details['Converters CAPEX (kEUR)']
    cables_capex = capex_details['Cables CAPEX (kEUR)']

    # Data for pie chart
    labels = ['Converters CAPEX', 'Cables CAPEX']
    sizes = [converters_capex, cables_capex]
    colors = ['lightblue', 'lightgreen']

    # Create a pie chart
    fig, ax = plt.subplots(figsize=(6, 6))
    ax.pie(sizes, labels=labels, autopct='%1.1f%%', startangle=90, colors=colors, wedgeprops={'edgecolor': 'black'})
    ax.axis('equal')  # Equal aspect ratio ensures that pie is drawn as a circle.

    # Add title
    plt.title(f"CAPEX Distribution (Total CAPEX: {total_capex_keur} kEUR)")

    # Show or save the plot
    plt.savefig(os.path.join(output_dir, 'output_kpis_results_economic.png'))
    plt.close()


def plot_environmental_kpi(environmental_results):
    labels = ['Total Weight (kg)', 'Total Lifecycle Emissions (kg CO2)']
    values = [environmental_results[0], environmental_results[2]]

    plt.figure(figsize=(8, 6))
    plt.bar(labels, values, color=['brown', 'green'])
    plt.title('Environmental KPI')
    plt.xlabel('KPI Type')
    plt.ylabel('Value')
    plt.tight_layout()
    plt.savefig(os.path.join(output_dir, 'output_kpis_results_environmental.png'))
    plt.close()


def save_kpis_results_to_json(file_path, efficiency_results, economic_results, environmental_results):
    """
    Saves KPI results to a JSON file.
    
    Args:
        file_path (str): Path to save the JSON file
        efficiency_results: Efficiency KPI results
        economic_results: Economic KPI results
        environmental_results: Environmental KPI results
    """
    # Helper function to replace None with "Not Available"
    def safe_value(value):
        if value is None:
            return "Not Available"
        # Convert numpy types to Python native types
        if hasattr(value, 'item'):
            return value.item()
        return value

    # Create base structure for efficiency data
    efficiency_data = {
        'Efficiency Ratio': safe_value(efficiency_results[0]),
        'Total Consumed Energy (MWh)': safe_value(efficiency_results[1]),
        'Total Generated Energy (MWh)': safe_value(efficiency_results[2]),
        'Total Losses in Cables (MWh)': safe_value(efficiency_results[3]),
        'Total Losses in Converters (MWh)': safe_value(efficiency_results[4])
    }
    
    # Add energy savings if available
    if len(efficiency_results) > 5 and efficiency_results[5] is not None:
        energy_savings_mwh = safe_value(efficiency_results[5])
        energy_savings_label_mwh = 'Energy Savings (DC more efficient) (MWh)' if energy_savings_mwh >= 0 else 'Extra Energy (AC more efficient) (MWh)'
        energy_savings_label_percent = 'Energy Savings (DC more efficient) (%)' if energy_savings_mwh >= 0 else 'Extra Energy (AC more efficient) (%)'
        
        efficiency_data[energy_savings_label_mwh] = safe_value(abs(energy_savings_mwh))
        
        if len(efficiency_results) > 6:
            efficiency_data[energy_savings_label_percent] = safe_value(abs(efficiency_results[6]))
    
    # Create base structure for economic data
    economic_data = {
        'Total CAPEX (KEUR)': safe_value(economic_results[0])
    }
    
    # Add CAPEX difference if available
    if len(economic_results) > 2 and economic_results[2] is not None:
        capex_difference_keur = safe_value(economic_results[2])
        capex_difference_label_keur = 'CAPEX Savings (AC more expensive) (KEUR)' if capex_difference_keur >= 0 else 'Extra CAPEX (DC more expensive) (KEUR)'
        capex_difference_label_percent = 'CAPEX Savings (AC more expensive) (%)' if capex_difference_keur >= 0 else 'Extra CAPEX (DC more expensive) (%)'
        
        economic_data[capex_difference_label_keur] = safe_value(abs(capex_difference_keur))
        
        if len(economic_results) > 3:
            economic_data[capex_difference_label_percent] = safe_value(abs(economic_results[3]))
    
    # Add OPEX if available
    if len(economic_results) > 4:
        economic_data['Total OPEX (KEUR)'] = safe_value(economic_results[4])
    
    # Add capex details if available and in expected format
    capex_details = economic_results[1]
    if isinstance(capex_details, dict):
        if 'Converters CAPEX (kEUR)' in capex_details:
            economic_data['Converters CAPEX (KEUR)'] = safe_value(capex_details['Converters CAPEX (kEUR)'])
        
        if 'Cables CAPEX (kEUR)' in capex_details:
            economic_data['Cables CAPEX (KEUR)'] = safe_value(capex_details['Cables CAPEX (kEUR)'])
        
        # Add converter and cable details if they exist in the expected format
        if 'Details' in capex_details and isinstance(capex_details['Details'], dict):
            if 'Converters' in capex_details['Details'] and isinstance(capex_details['Details']['Converters'], dict):
                converter_details = {}
                for conv_name, details in capex_details['Details']['Converters'].items():
                    if isinstance(details, dict):
                        converter_details[conv_name] = {k: safe_value(v) for k, v in details.items()}
                economic_data['Converter Details'] = converter_details
            
            if 'Cables' in capex_details['Details'] and isinstance(capex_details['Details']['Cables'], dict):
                cable_details = {}
                for cable_name, details in capex_details['Details']['Cables'].items():
                    if isinstance(details, dict):
                        cable_details[cable_name] = {k: safe_value(v) for k, v in details.items()}
                economic_data['Cable Details'] = cable_details
    else:
        print("Warning: capex_details is not a dictionary, skipping detailed economic data")
    
    # Add OPEX details if available and in expected format
    if len(economic_results) > 5:
        opex_details = economic_results[5]
        if isinstance(opex_details, dict):
            if 'Converters OPEX (kEUR)' in opex_details:
                economic_data['Converters OPEX (KEUR)'] = safe_value(opex_details['Converters OPEX (kEUR)'])
            
            if 'Cables OPEX (kEUR)' in opex_details:
                economic_data['Cables OPEX (KEUR)'] = safe_value(opex_details['Cables OPEX (kEUR)'])
    
    # Create base structure for environmental data
    environmental_data = {
        'Total Weight (kg)': safe_value(environmental_results[0]),
        'Total Lifecycle Emissions (kg CO2)': safe_value(environmental_results[2])
    }
    
    # Add weight and emissions differences if available
    if len(environmental_results) > 3 and environmental_results[3] is not None:
        weight_difference_kg = safe_value(environmental_results[3])
        weight_difference_label_kg = 'Weight Savings (AC heavier) (kg)' if weight_difference_kg >= 0 else 'Extra Weight (DC heavier) (kg)'
        
        environmental_data[weight_difference_label_kg] = safe_value(abs(weight_difference_kg))
        
        if len(environmental_results) > 4:
            weight_difference_percent = safe_value(environmental_results[4])
            weight_difference_label_percent = 'Weight Savings (AC heavier) (%)' if weight_difference_kg >= 0 else 'Extra Weight (DC heavier) (%)'
            environmental_data[weight_difference_label_percent] = safe_value(abs(weight_difference_percent))
    
    if len(environmental_results) > 5 and environmental_results[5] is not None:
        lifecycle_emissions_difference_kg_co2 = safe_value(environmental_results[5])
        emissions_difference_label_kg_co2 = 'CO2 Emissions Savings (AC more emissions) (kg CO2)' if lifecycle_emissions_difference_kg_co2 >= 0 else 'Extra CO2 Emissions (DC more emissions) (kg CO2)'
        
        environmental_data[emissions_difference_label_kg_co2] = safe_value(abs(lifecycle_emissions_difference_kg_co2))
        
        if len(environmental_results) > 6:
            emissions_difference_percent = safe_value(environmental_results[6])
            emissions_difference_label_percent = 'CO2 Emissions Savings (AC more emissions) (%)' if lifecycle_emissions_difference_kg_co2 >= 0 else 'Extra CO2 Emissions (DC more emissions) (%)'
            environmental_data[emissions_difference_label_percent] = safe_value(abs(emissions_difference_percent))
    
    # Add weight details if they exist in the expected format
    weight_details = environmental_results[1]
    if isinstance(weight_details, dict) and 'Details' in weight_details and isinstance(weight_details['Details'], dict):
        if 'Converters' in weight_details['Details'] and isinstance(weight_details['Details']['Converters'], dict):
            converter_weights = {}
            for converter, weight in weight_details['Details']['Converters'].items():
                converter_weights[converter] = safe_value(weight)
            environmental_data['Converter Weights'] = converter_weights
        
        if 'Cables' in weight_details['Details'] and isinstance(weight_details['Details']['Cables'], dict):
            cable_weights = {}
            for cable_line, weight in weight_details['Details']['Cables'].items():
                cable_weights[cable_line] = safe_value(weight)
            environmental_data['Cable Weights'] = cable_weights
    
    # Combine all data
    kpi_data = {
        'Efficiency': efficiency_data,
        'Economic': economic_data,
        'Environmental': environmental_data
    }
    
    # Save to JSON file
    with open(file_path, 'w') as f:
        json.dump(kpi_data, f, indent=4)
    
    print(f"KPIs have been saved to {file_path}")


def save_sizing_results_to_json(net, node_data, file_name):
    """
    Saves sizing results to a JSON file.
    
    Args:
        net (pp.pandapowerNet): The network.
        node_data: Node data.
        file_name (str): Path to save the JSON file.
    """
    # Create the line sizing data
    line_sizing_data = []
    for idx, row in net.line.iterrows():
        line_sizing_data.append({
            "Line Index": int(idx),
            "From Bus": int(row['from_bus']),
            "To Bus": int(row['to_bus']),
            "Section (mm²)": float(row['section'])
        })

    # Create the converter sizing data
    converter_sizing_data = []
    for idx, row in net.converter.iterrows():
        converter_sizing_data.append({
            "Converter Index": int(idx),
            "Converter Name": row['name'],
            "From Bus": int(row['from_bus']),
            "To Bus": int(row['to_bus']),
            "Nominal Power Installed (kW)": float(row['P'] * 1000)  # Convert to kW
        })

    # Combine data
    sizing_data = {
        "Line Sizing": line_sizing_data,
        "Converter Sizing": converter_sizing_data
    }

    # Save to JSON file
    with open(file_name, 'w') as f:
        json.dump(sizing_data, f, indent=4)

    print(f"Sizing results saved to {file_name}")

def save_timestep_load_flow_results_to_json(results, file_name):
    """
    Saves time step load flow results to a JSON file.
    
    Args:
        results (pd.DataFrame): Load flow results.
        file_name (str): Path to save the JSON file.
    """
    # Define a custom converter for NumPy types in the JSON encoder
    class NumpyEncoder(json.JSONEncoder):
        def default(self, obj):
            if hasattr(obj, 'item'):
                return obj.item()  # Convert numpy types to native Python types
            if isinstance(obj, pd.NA) or pd.isna(obj):
                return None  # Convert NaN or None to null
            return super(NumpyEncoder, self).default(obj)
    
    # Convert DataFrame to JSON-compatible format - ensuring complex objects/numpy values are handled
    results_cleaned = results.copy()
    
    # First, explicitly convert any columns with problematic types
    for col in results_cleaned.columns:
        if results_cleaned[col].dtype.name in ('int64', 'float64', 'bool', 'datetime64[ns]'):
            # Convert numeric types to ensure they're JSON serializable
            results_cleaned[col] = results_cleaned[col].astype(object)
    
    # Convert to records format (list of dicts)
    results_json = results_cleaned.to_dict(orient='records')
    
    # Save to JSON file with the custom encoder
    with open(file_name, 'w') as f:
        json.dump(results_json, f, indent=4, cls=NumpyEncoder)
    
    print(f"Time step load flow results saved to {file_name}")

def save_timestep_load_flow_results_to_excel(results, file_name):
    results.to_excel(file_name)
    print(f"Time step load flow results saved to {file_name}")


def save_kpis_results_to_excel(file_path, efficiency_results, economic_results, environmental_results):
    """
    Saves KPI results to an Excel file.
    
    Args:
        file_path (str): Path to save the Excel file
        efficiency_results: Efficiency KPI results
        economic_results: Economic KPI results
        environmental_results: Environmental KPI results
    """
    # Create DataFrames for each KPI category
    
    # Efficiency KPI results
    efficiency_data = {
        'KPI': ['Efficiency Ratio', 'Total Consumed Energy (MWh)', 'Total Generated Energy (MWh)',
                'Total Losses in Cables (MWh)', 'Total Losses in Converters (MWh)'],
        'Value': [efficiency_results[0], efficiency_results[1], efficiency_results[2],
                 efficiency_results[3], efficiency_results[4]]
    }
    
    # Add energy savings if available
    if len(efficiency_results) > 5 and efficiency_results[5] is not None:
        energy_savings_mwh = efficiency_results[5]
        energy_savings_label = 'Energy Savings (DC more efficient) (MWh)' if energy_savings_mwh >= 0 else 'Extra Energy (AC more efficient) (MWh)'
        efficiency_data['KPI'].append(energy_savings_label)
        efficiency_data['Value'].append(abs(energy_savings_mwh))
        
        energy_savings_percent = efficiency_results[6]
        energy_savings_percent_label = 'Energy Savings (DC more efficient) (%)' if energy_savings_percent >= 0 else 'Extra Energy (AC more efficient) (%)'
        efficiency_data['KPI'].append(energy_savings_percent_label)
        efficiency_data['Value'].append(abs(energy_savings_percent))
    
    efficiency_df = pd.DataFrame(efficiency_data)
    
    # Economic KPI results
    capex_details = economic_results[1]
    opex_details = economic_results[5] if len(economic_results) > 5 else None
    
    economic_data = {
        'KPI': ['Total CAPEX (kEUR)'],
        'Value': [economic_results[0]]
    }
    
    # Check if capex_details is a dictionary with the expected structure
    if isinstance(capex_details, dict) and 'Converters CAPEX (kEUR)' in capex_details and 'Cables CAPEX (kEUR)' in capex_details:
        economic_data['KPI'].extend(['Converters CAPEX (kEUR)', 'Cables CAPEX (kEUR)'])
        economic_data['Value'].extend([
            capex_details['Converters CAPEX (kEUR)'], 
            capex_details['Cables CAPEX (kEUR)']
        ])
    else:
        print("Warning: capex_details does not have the expected structure.")
    
    # Add OPEX data if available
    if economic_results[4] is not None:
        economic_data['KPI'].append('Total OPEX (kEUR)')
        economic_data['Value'].append(economic_results[4])
        
        if isinstance(opex_details, dict) and 'Converters OPEX (kEUR)' in opex_details and 'Cables OPEX (kEUR)' in opex_details:
            economic_data['KPI'].extend(['Converters OPEX (kEUR)', 'Cables OPEX (kEUR)'])
            economic_data['Value'].extend([
                opex_details['Converters OPEX (kEUR)'], 
                opex_details['Cables OPEX (kEUR)']
            ])
    
    # Add CAPEX difference if available
    if len(economic_results) > 2 and economic_results[2] is not None:
        capex_difference_keur = economic_results[2]
        capex_difference_label = 'CAPEX Savings (AC more expensive) (kEUR)' if capex_difference_keur >= 0 else 'Extra CAPEX (DC more expensive) (kEUR)'
        economic_data['KPI'].append(capex_difference_label)
        economic_data['Value'].append(abs(capex_difference_keur))
        
        capex_difference_percent = economic_results[3]
        capex_difference_percent_label = 'CAPEX Savings (AC more expensive) (%)' if capex_difference_percent >= 0 else 'Extra CAPEX (DC more expensive) (%)'
        economic_data['KPI'].append(capex_difference_percent_label)
        economic_data['Value'].append(abs(capex_difference_percent))
    
    economic_df = pd.DataFrame(economic_data)
    
    # Environmental KPI results
    weight_details = environmental_results[1]
    
    environmental_data = {
        'KPI': ['Total Weight (kg)', 'Total Lifecycle Emissions (kg CO2)'],
        'Value': [environmental_results[0], environmental_results[2]]
    }
    
    # Add weight difference if available
    if len(environmental_results) > 3 and environmental_results[3] is not None:
        weight_difference_kg = environmental_results[3]
        weight_difference_label = 'Weight Savings (AC heavier) (kg)' if weight_difference_kg >= 0 else 'Extra Weight (DC heavier) (kg)'
        environmental_data['KPI'].append(weight_difference_label)
        environmental_data['Value'].append(abs(weight_difference_kg))
        
        weight_difference_percent = environmental_results[4]
        weight_difference_percent_label = 'Weight Savings (AC heavier) (%)' if weight_difference_percent >= 0 else 'Extra Weight (DC heavier) (%)'
        environmental_data['KPI'].append(weight_difference_percent_label)
        environmental_data['Value'].append(abs(weight_difference_percent))
    
    # Add emissions difference if available
    if len(environmental_results) > 5 and environmental_results[5] is not None:
        emissions_difference_kg_co2 = environmental_results[5]
        emissions_difference_label = 'CO2 Emissions Savings (AC more emissions) (kg CO2)' if emissions_difference_kg_co2 >= 0 else 'Extra CO2 Emissions (DC more emissions) (kg CO2)'
        environmental_data['KPI'].append(emissions_difference_label)
        environmental_data['Value'].append(abs(emissions_difference_kg_co2))
        
        emissions_difference_percent = environmental_results[6]
        emissions_difference_percent_label = 'CO2 Emissions Savings (AC more emissions) (%)' if emissions_difference_percent >= 0 else 'Extra CO2 Emissions (DC more emissions) (%)'
        environmental_data['KPI'].append(emissions_difference_percent_label)
        environmental_data['Value'].append(abs(emissions_difference_percent))
    
    environmental_df = pd.DataFrame(environmental_data)
    
    # Save to Excel
    with pd.ExcelWriter(file_path, engine='xlsxwriter') as writer:
        efficiency_df.to_excel(writer, sheet_name='Efficiency KPIs', index=False)
        economic_df.to_excel(writer, sheet_name='Economic KPIs', index=False)
        environmental_df.to_excel(writer, sheet_name='Environmental KPIs', index=False)
        
        # Add converter and cable details to separate sheets
        if isinstance(capex_details, dict) and 'Details' in capex_details:
            # Check if the details have the expected structure
            if 'Converters' in capex_details['Details'] and isinstance(capex_details['Details']['Converters'], dict):
                # Convert converter details to DataFrame
                converter_details = []
                try:
                    for conv_name, details in capex_details['Details']['Converters'].items():
                        if isinstance(details, dict) and 'Power (kW)' in details:
                            converter_details.append({
                                'Converter': conv_name,
                                'Power (kW)': details['Power (kW)'],
                                'Unit Cost (kEUR)': details.get('Unit Cost (kEUR)', 'N/A'),
                                'Total Cost (kEUR)': details.get('Total Cost (kEUR)', 'N/A')
                            })
                        else:
                            print(f"Warning: Converter {conv_name} details missing expected structure.")
                except Exception as e:
                    print(f"Error processing converter details: {str(e)}")
                
                if converter_details:
                    pd.DataFrame(converter_details).to_excel(writer, sheet_name='Converter Details', index=False)
            
            # Check if the details have the expected structure for cables
            if 'Cables' in capex_details['Details'] and isinstance(capex_details['Details']['Cables'], dict):
                # Convert cable details to DataFrame
                cable_details = []
                try:
                    for cable_line, details in capex_details['Details']['Cables'].items():
                        if isinstance(details, dict):
                            cable_details.append({
                                'Line': cable_line,
                                'Section (mm²)': details.get('Section (mm²)', 'N/A'),
                                'Length (m)': details.get('Length (m)', 'N/A'),
                                'Unit Cost (kEUR/m)': details.get('Unit Cost (kEUR/m)', 'N/A'),
                                'Total Cost (kEUR)': details.get('Total Cost (kEUR)', 'N/A')
                            })
                        else:
                            print(f"Warning: Cable {cable_line} details missing expected structure.")
                except Exception as e:
                    print(f"Error processing cable details: {str(e)}")
                
                if cable_details:
                    pd.DataFrame(cable_details).to_excel(writer, sheet_name='Cable Details', index=False)
    
    print(f"KPIs have been saved to {file_path}")





