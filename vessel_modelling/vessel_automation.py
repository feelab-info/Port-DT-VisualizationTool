import requests
from bs4 import BeautifulSoup
import pandas as pd
import json
import logging
import datetime
import time
import os
import sys
import fnmatch
from typing import List, Dict, Any, Optional

# Ensure logs directory exists
os.makedirs("logs", exist_ok=True)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("logs/vessel_automation.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# API endpoints
# Prefer env var for Docker networking (e.g., http://vessel-modelling:5003)
API_BASE_URL = os.getenv("API_BASE_URL", "http://vessel-modelling:5003")
API_REGISTERED_VESSEL = f"{API_BASE_URL}/api/registered-vessel"
API_CUSTOM_VESSEL = f"{API_BASE_URL}/api/custom-vessel"
API_AVAILABLE_VESSELS = f"{API_BASE_URL}/api/available-vessels"
APRAM_URL = "https://apram.pt/reserva-cais"

class VesselScheduleScraper:
    """Class to scrape vessel information from APRAM website."""
    
    def __init__(self, port: str = "Funchal"):
        """Initialize scraper with target port."""
        self.port = port
        self.url = f"{APRAM_URL}?port={port}"
    
    def get_page_content(self) -> Optional[str]:
        """Fetch page content from APRAM website."""
        try:
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
            }
            response = requests.get(self.url, headers=headers)
            response.raise_for_status()
            return response.text
        except requests.RequestException as e:
            logger.error(f"Failed to fetch page content: {str(e)}")
            return None
    
    def parse_vessels(self, html_content: str) -> List[Dict[str, Any]]:
        """Parse vessel information from HTML content."""
        vessels = []
        soup = BeautifulSoup(html_content, 'html.parser')
        
        # Find the table containing vessel schedules
        # Look for tbody element which contains the vessel rows
        tbody = soup.find('tbody')
        
        if not tbody:
            logger.warning("No vessel table found. The website structure may have changed.")
            return vessels
        
        # Extract rows from table
        rows = tbody.find_all('tr', class_='bg-white border-b')
        
        for row in rows:
            cells = row.find_all(['th', 'td'])
            if len(cells) >= 7:  # Ensure we have enough cells
                try:
                    # Extract data from cells
                    # day = cells[0].text.strip()  # Day of month
                    vessel_name = cells[1].text.strip()
                    arrival_time = cells[2].text.strip()
                    departure_time = cells[3].text.strip()
                    
                    # Format times - adjust based on actual website format (DD/MM/YYYY HH:MM)
                    arrival_datetime = self._parse_datetime(arrival_time)
                    departure_datetime = self._parse_datetime(departure_time)
                    
                    # Only add vessels that arrive on the current day
                    # This includes vessels that depart on a later day
                    if self._is_current_day(arrival_datetime):
                        # Extract just the time components for the API
                        # The API will handle multi-day stays internally
                        arrival_time_only = arrival_datetime.strftime("%H:%M:%S")
                        departure_time_only = departure_datetime.strftime("%H:%M:%S")
                        
                        vessels.append({
                            "vessel_name": vessel_name,
                            "arrival_time": arrival_time_only,
                            "departure_time": departure_time_only,
                            "arrival_datetime": arrival_datetime,
                            "departure_datetime": departure_datetime,
                            "origin": cells[4].text.strip() if cells[4].text.strip() else "Unknown",
                            "destination": cells[5].text.strip() if cells[5].text.strip() else "Unknown",
                            "agent": cells[6].text.strip() if cells[6].text.strip() else "Unknown"
                        })
                except Exception as e:
                    logger.error(f"Error parsing row: {str(e)}")
                    continue
        
        return vessels
    
    def _parse_datetime(self, date_str: str) -> datetime.datetime:
        """Parse datetime from string in format DD/MM/YYYY HH:MM."""
        date_str = date_str.strip()
        if not date_str:
            return datetime.datetime.now()
            
        try:
            # Try to parse in format DD/MM/YYYY HH:MM
            return datetime.datetime.strptime(date_str, "%d/%m/%Y %H:%M")
        except ValueError as e:
            logger.error(f"Could not parse datetime: {date_str}, error: {str(e)}")
            # Return default time as fallback
            return datetime.datetime.now()
    
    def _is_current_day(self, dt: datetime.datetime) -> bool:
        """Check if datetime is for the target day."""
        target_date = getattr(self, 'target_date', datetime.datetime.today().date())
        return dt.date() == target_date
    
    def _is_past_date(self, dt: datetime.datetime) -> bool:
        """Check if datetime is in the past."""
        now = datetime.datetime.now()
        return dt < now
    
    def get_vessels_for_date(self, target_date: Optional[datetime.date] = None) -> List[Dict[str, Any]]:
        """Get all vessels scheduled for the specified date at the specified port.
        If no date is provided, defaults to today."""
        html_content = self.get_page_content()
        if not html_content:
            return []
        
        # If no date specified, use today
        self.target_date = target_date or datetime.datetime.today().date()
        
        return self.parse_vessels(html_content)

class VesselEnergyProfiler:
    """Class to generate energy profiles for vessels."""
    
    def __init__(self):
        """Initialize with API endpoints."""
        self.registered_vessel_endpoint = API_REGISTERED_VESSEL
        self.custom_vessel_endpoint = API_CUSTOM_VESSEL
        self.available_vessels_endpoint = API_AVAILABLE_VESSELS
    
    def get_available_vessels(self) -> List[str]:
        """Get list of available registered vessels from the API."""
        try:
            response = requests.get(self.available_vessels_endpoint)
            response.raise_for_status()
            data = response.json()
            
            if data.get("success") and "vessels" in data:
                return data["vessels"]
            else:
                logger.error(f"Failed to get available vessels: {data.get('error', 'Unknown error')}")
                return []
        except requests.RequestException as e:
            logger.error(f"API request failed when getting available vessels: {str(e)}")
            return []
    
    def generate_registered_vessel_profile(self, vessel_data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate energy profile for a registered vessel by calling the API."""
        try:
            response = requests.post(self.registered_vessel_endpoint, json=vessel_data)
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            logger.error(f"API request failed for registered vessel {vessel_data['vessel_name']}: {str(e)}")
            return {"error": str(e)}
    
    def generate_custom_vessel_profile(self, vessel_data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate energy profile for a custom vessel by calling the API."""
        try:
            # Rename vessel_name to name for custom vessel API
            if "vessel_name" in vessel_data:
                vessel_data["name"] = vessel_data.pop("vessel_name")
                
            # Add required fields for custom vessel if not present
            if "gross_tonnage" not in vessel_data:
                vessel_data["gross_tonnage"] = 100000  # Default value
            if "length" not in vessel_data:
                vessel_data["length"] = 300  # Default value
            if "hotel_energy" not in vessel_data:
                vessel_data["hotel_energy"] = 10000  # Default value
            
            # Convert datetime objects to strings to make them JSON serializable
            for key, value in vessel_data.items():
                if isinstance(value, datetime.datetime):
                    vessel_data[key] = value.strftime("%H:%M:%S")
                
            response = requests.post(self.custom_vessel_endpoint, json=vessel_data)
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            logger.error(f"API request failed for custom vessel {vessel_data.get('name', 'Unknown')}: {str(e)}")
            return {"error": str(e)}
    
    def save_profile(self, vessel_name: str, profile_data: Dict[str, Any], target_date: Optional[datetime.date] = None) -> str:
        """Save energy profile to file."""
        # Create output directory if it doesn't exist
        output_dir = "output"
        os.makedirs(output_dir, exist_ok=True)
        
        # Format filename with date and vessel name
        date_str = target_date.strftime("%Y-%m-%d") if target_date else datetime.datetime.today().strftime("%Y-%m-%d")
        filename = f"{output_dir}/{date_str}_{vessel_name.replace(' ', '_')}.json"
        
        # Save JSON data
        with open(filename, "w") as f:
            json.dump(profile_data, f, indent=4)
        
        return filename

def check_api_health() -> bool:
    """Check if the API server is running and healthy."""
    try:
        response = requests.get(f"{API_BASE_URL}/health")
        return response.status_code == 200 and response.json().get("status") == "OK"
    except requests.RequestException:
        return False

def clean_output_directory(target_date: Optional[datetime.date] = None):
    """Delete previous JSON files for the target date."""
    output_dir = "output"
    if not os.path.exists(output_dir):
        return
        
    # If target date is provided, only delete files for that date
    if target_date:
        date_str = target_date.strftime("%Y-%m-%d")
        pattern = f"{date_str}_*.json"
        for file in os.listdir(output_dir):
            if fnmatch.fnmatch(file, pattern):
                os.remove(os.path.join(output_dir, file))
                logger.info(f"Deleted previous file: {file}")
    # Otherwise delete all JSON files
    else:
        for file in os.listdir(output_dir):
            if file.endswith(".json"):
                os.remove(os.path.join(output_dir, file))
                logger.info(f"Deleted previous file: {file}")

def main():
    """Main function to run the automation process."""
    logger.info("Starting vessel energy profile automation")
    
    # Check if API is running
    if not check_api_health():
        logger.error(f"API server is not running at {API_BASE_URL}. Please start the server first.")
        print(f"❌ API server is not running at {API_BASE_URL}. Please start the server first.")
        return
    
    # Create scraper and profiler instances
    scraper = VesselScheduleScraper(port="Funchal")
    profiler = VesselEnergyProfiler()
    
    # Get available registered vessels
    available_vessels = profiler.get_available_vessels()
    logger.info(f"Found {len(available_vessels)} available registered vessels in the system")
    
    # Set target date - CHANGE THIS LINE to modify the target date
    # Options:
    # 1. Use None for today's date: target_date = None
    # 2. Use a specific date: target_date = datetime.date(2025, 4, 25)
    #target_date = datetime.date(2025, 4, 29)  # April 25, 2025
    target_date = None

    # Clean output directory before processing
    #clean_output_directory(target_date)
    
    # Get vessels for the target date
    if target_date:
        logger.info(f"Getting vessels for date: {target_date.strftime('%Y-%m-%d')}")
        vessels = scraper.get_vessels_for_date(target_date)
    else:
        logger.info("Getting vessels for today")
        vessels = scraper.get_vessels_for_date()
    
    logger.info(f"Found {len(vessels)} vessels scheduled for the target date")
    
    if not vessels:
        logger.warning("No vessels found for the target date")
        return
    
    # Process each vessel
    results = []
    for vessel in vessels:
        logger.info(f"Processing vessel: {vessel['vessel_name']}")
        
        # Check if vessel is in the list of available registered vessels
        vessel_name = vessel['vessel_name']
        is_registered = vessel_name in available_vessels
        
        # Generate energy profile based on vessel type
        if is_registered:
            logger.info(f"Vessel {vessel_name} is registered in the system")
            profile_data = profiler.generate_registered_vessel_profile(vessel)
        else:
            logger.info(f"Vessel {vessel_name} is not registered, treating as custom vessel")
            profile_data = profiler.generate_custom_vessel_profile(vessel)
        
        if "error" in profile_data:
            error_msg = profile_data.get("error", "Unknown error")
            logger.error(f"Failed to generate profile for {vessel_name}: {error_msg}")
            results.append({
                "vessel_name": vessel_name,
                "is_registered": is_registered,
                "success": False,
                "error": error_msg
            })
            continue
        
        # Save profile to file - use target date for filename
        output_file = profiler.save_profile(vessel_name, profile_data, target_date)
        logger.info(f"Energy profile saved to {output_file}")
        
        # Add to results
        results.append({
            "vessel_name": vessel_name,
            "profile_file": output_file,
            "is_registered": is_registered,
            "success": True
        })
    
    # Print summary
    successful = [r for r in results if r.get('success', False)]
    failed = [r for r in results if not r.get('success', False)]
    
    logger.info(f"Processing complete: {len(successful)} successful, {len(failed)} failed")
    
    # Print successful vessels
    for result in successful:
        vessel_type = "registered" if result['is_registered'] else "custom"
        print(f"✅ {result['vessel_name']} ({vessel_type}): {result['profile_file']}")
    
    # Print failed vessels
    for result in failed:
        vessel_type = "registered" if result['is_registered'] else "custom"
        error_msg = result.get('error', 'Unknown error')
        print(f"❌ {result['vessel_name']} ({vessel_type}): {error_msg}")
        logger.warning(f"Vessel {result['vessel_name']} failed: {error_msg}")

if __name__ == "__main__":
    main()