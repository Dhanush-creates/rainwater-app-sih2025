from flask import Flask, render_template, request, jsonify
import requests
import json
try:
    from flask_cors import CORS
    _has_cors = True
except Exception:
    _has_cors = False

app = Flask(__name__)
if _has_cors:
    # Enable CORS for local development so the frontend can call this API
    CORS(app, resources={r"/*": {"origins": "*"}})

def get_familiar_soil_names(scientific_name):
    """
    Convert scientific soil type names to familiar/common names.
    
    :param scientific_name: Scientific soil type from API
    :return: Dictionary with familiar names and descriptions
    """
    soil_mapping = {
        "Acrisols": {
            "familiar_names": ["Acidic Red Soil", "Red Earth"],
            "description": "Acidic soils with low fertility, common in tropical regions"
        },
        "Albeluvisols": {
            "familiar_names": ["Podzolic Soil", "Forest Soil"],
            "description": "Soils with distinct layers, common in temperate forests"
        },
        "Alisols": {
            "familiar_names": ["Red Clay Soil", "Lateritic Soil"],
            "description": "High aluminum content, red-colored soils"
        },
        "Andosols": {
            "familiar_names": ["Volcanic Soil", "Ash Soil"],
            "description": "Rich, fertile soils formed from volcanic ash"
        },
        "Arenosols": {
            "familiar_names": ["Sandy Soil", "Desert Sand"],
            "description": "Sandy soils with low water retention"
        },
        "Calcisols": {
            "familiar_names": ["Calcareous Soil", "Lime Soil"],
            "description": "Soils with high calcium content, often alkaline"
        },
        "Cambisols": {
            "familiar_names": ["Brown Earth", "Loamy Soil"],
            "description": "Well-developed, fertile soils with good structure"
        },
        "Chernozems": {
            "familiar_names": ["Black Earth", "Prairie Soil"],
            "description": "Very fertile black soils with high organic matter"
        },
        "Cryosols": {
            "familiar_names": ["Permafrost Soil", "Tundra Soil"],
            "description": "Soils in cold regions with permanent ice"
        },
        "Durisols": {
            "familiar_names": ["Hardpan Soil", "Cemented Soil"],
            "description": "Soils with hard, cemented layers"
        },
        "Ferralsols": {
            "familiar_names": ["Red Tropical Soil", "Laterite"],
            "description": "Deep red soils in tropical regions, highly weathered"
        },
        "Fluvisols": {
            "familiar_names": ["Alluvial Soil", "River Soil", "Floodplain Soil"],
            "description": "Young, fertile soils from river deposits"
        },
        "Gleysols": {
            "familiar_names": ["Waterlogged Soil", "Wetland Soil"],
            "description": "Soils with poor drainage, often waterlogged"
        },
        "Gypsisols": {
            "familiar_names": ["Gypsum Soil", "Desert Soil"],
            "description": "Soils with high gypsum content, common in arid regions"
        },
        "Histosols": {
            "familiar_names": ["Peat Soil", "Organic Soil", "Bog Soil"],
            "description": "Organic-rich soils, often waterlogged"
        },
        "Kastanozems": {
            "familiar_names": ["Chestnut Soil", "Steppe Soil"],
            "description": "Brown soils in semi-arid grasslands"
        },
        "Leptosols": {
            "familiar_names": ["Shallow Soil", "Rocky Soil"],
            "description": "Thin soils over bedrock or hard material"
        },
        "Lixisols": {
            "familiar_names": ["Red Earth", "Tropical Clay Soil"],
            "description": "Clay-rich soils with good drainage"
        },
        "Luvisols": {
            "familiar_names": ["Clay Loam", "Brown Forest Soil"],
            "description": "Well-structured soils with clay accumulation"
        },
        "Nitisols": {
            "familiar_names": ["Red Clay", "Tropical Clay"],
            "description": "Deep, well-drained tropical clay soils"
        },
        "Phaeozems": {
            "familiar_names": ["Dark Prairie Soil", "Black Earth"],
            "description": "Dark, fertile soils with high organic content"
        },
        "Planosols": {
            "familiar_names": ["Hardpan Soil", "Compacted Soil"],
            "description": "Soils with dense, impermeable layers"
        },
        "Plinthosols": {
            "familiar_names": ["Ironstone Soil", "Hardpan Soil"],
            "description": "Soils with iron-rich hard layers"
        },
        "Podzols": {
            "familiar_names": ["Podzolic Soil", "Forest Soil"],
            "description": "Acidic soils with distinct light and dark layers"
        },
        "Regosols": {
            "familiar_names": ["Young Soil", "Immature Soil"],
            "description": "Weakly developed soils with minimal structure"
        },
        "Solonchaks": {
            "familiar_names": ["Saline Soil", "Salt Soil"],
            "description": "Soils with high salt content"
        },
        "Solonetz": {
            "familiar_names": ["Alkaline Soil", "Sodic Soil"],
            "description": "Soils with high sodium content, often alkaline"
        },
        "Stagnosols": {
            "familiar_names": ["Waterlogged Soil", "Poorly Drained Soil"],
            "description": "Soils with periodic water stagnation"
        },
        "Umbrisols": {
            "familiar_names": ["Mountain Soil", "Acid Forest Soil"],
            "description": "Acidic soils with thick organic surface layer"
        },
        "Vertisols": {
            "familiar_names": ["Black Cotton Soil", "Cracking Clay", "Regur Soil"],
            "description": "Clay-rich soils that crack when dry, very fertile"
        },
        "No information": {
            "familiar_names": ["Unknown Soil", "Unclassified Soil"],
            "description": "Soil type information not available for this location"
        }
    }
    
    return soil_mapping.get(scientific_name, {
        "familiar_names": [scientific_name],
        "description": "Scientific soil classification"
    })

def get_location_name(lat, lon):
    """
    Get location name for given coordinates using reverse geocoding.
    
    :param lat: Latitude
    :param lon: Longitude
    :return: Location name string or None if not found
    """
    try:
        # Use OpenStreetMap Nominatim for reverse geocoding
        url = "https://nominatim.openstreetmap.org/reverse"
        headers = {
            'User-Agent': 'SoilAnalysisApp/1.0 (Educational Purpose)'
        }
        params = {
            "lat": lat,
            "lon": lon,
            "format": "json",
            "addressdetails": 1,
            "zoom": 18,  # Higher zoom for more accurate location details
            "extratags": 1
        }
        
        response = requests.get(url, params=params, headers=headers, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        if data and 'display_name' in data:
            # Extract a more readable location name following proper hierarchy
            address = data.get('address', {})
            components = []
            
            # Get the primary location (village/town/city)
            primary_location = None
            if address.get('village'):
                primary_location = address['village']
            elif address.get('town'):
                primary_location = address['town']
            elif address.get('city'):
                primary_location = address['city']
            elif address.get('hamlet'):
                primary_location = address['hamlet']
            elif address.get('suburb'):
                primary_location = address['suburb']
            elif address.get('neighbourhood'):
                primary_location = address['neighbourhood']
            
            # Get district
            district = address.get('county') or address.get('district') or address.get('city_district')
            
            # Get state/province
            state = address.get('state') or address.get('province')
            
            # Get country
            country = address.get('country')
            
            # Build components following hierarchy: village/town/city, district, state, country
            if primary_location:
                components.append(primary_location)
            
            # Add district only if it's different from primary location
            if district and district != primary_location:
                components.append(district)
            
            # Add state if available
            if state:
                components.append(state)
            
            # Add country if available
            if country:
                components.append(country)
            
            if components:
                return ', '.join(components)
            else:
                # Fallback to display_name if components are not available
                return data['display_name'].split(',')[0].strip()
                
    except Exception as e:
        print(f"Reverse geocoding error: {e}")
    
    return None

def debug_location_info(lat, lon):
    """
    Debug function to see what location information is available
    """
    try:
        url = "https://nominatim.openstreetmap.org/reverse"
        headers = {
            'User-Agent': 'SoilAnalysisApp/1.0 (Educational Purpose)'
        }
        params = {
            "lat": lat,
            "lon": lon,
            "format": "json",
            "addressdetails": 1,
            "zoom": 18,
            "extratags": 1
        }
        
        response = requests.get(url, params=params, headers=headers, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        if data and 'address' in data:
            address = data['address']
            print(f"Debug - Available address components:")
            for key, value in address.items():
                print(f"  {key}: {value}")
            print(f"Debug - Display name: {data.get('display_name', 'N/A')}")
        
        return data
    except Exception as e:
        print(f"Debug error: {e}")
        return None

def get_coordinates_and_location_name(location_name):
    """
    Get coordinates and detailed location name for a given location name.
    
    :param location_name: Name of the location (e.g., "Tambaram")
    :return: Tuple of (latitude, longitude, detailed_location_name) or (None, None, None) if not found
    """
    # First get coordinates
    lat, lon = get_coordinates(location_name)
    
    if lat is None or lon is None:
        return None, None, None
    
    # Then get detailed location name using reverse geocoding
    detailed_location = get_location_name(lat, lon)
    
    return lat, lon, detailed_location

def get_coordinates(location_name):
    """
    
    Get latitude and longitude for a given location name using multiple geocoding services.
    
    :param location_name: Name of the location (e.g., "Chennai")
    :return: Tuple of (latitude, longitude) or (None, None) if not found
    """
    # Try multiple geocoding services for better reliability
    
    # Method 1: OpenStreetMap Nominatim with proper headers
    try:
        url = "https://nominatim.openstreetmap.org/search"
        headers = {
            'User-Agent': 'SoilAnalysisApp/1.0 (Educational Purpose)'
        }
        params = {
            "q": location_name,
            "format": "json",
            "limit": 1,
            "addressdetails": 1
        }
        
        response = requests.get(url, params=params, headers=headers, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        if data and len(data) > 0:
            lat = float(data[0]["lat"])
            lon = float(data[0]["lon"])
            return lat, lon
            
    except Exception as e:
        print(f"Nominatim error: {e}")
    
    # Method 2: Alternative geocoding using a different service
    try:
        # Using a free geocoding service
        url = "https://geocode.maps.co/search"
        params = {
            "q": location_name,
            "api_key": "65b8b5b5b5b5b5b5b5b5b5b5b5b5b5b5b5b5b5b5b5"  # This is a placeholder
        }
        
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        if data and len(data) > 0:
            lat = float(data[0]["lat"])
            lon = float(data[0]["lon"])
            return lat, lon
            
    except Exception as e:
        print(f"Alternative geocoding error: {e}")
    
    # Method 3: Fallback to a simple coordinate database for major cities
    major_cities = {
        "mumbai": (19.0760, 72.8777),
        "chennai": (13.0827, 80.2707),
        "delhi": (28.7041, 77.1025),
        "bangalore": (12.9716, 77.5946),
        "kolkata": (22.5726, 88.3639),
        "hyderabad": (17.3850, 78.4867),
        "pune": (18.5204, 73.8567),
        "ahmedabad": (23.0225, 72.5714),
        "jaipur": (26.9124, 75.7873),
        "lucknow": (26.8467, 80.9462),
        "kanpur": (26.4499, 80.3319),
        "nagpur": (21.1458, 79.0882),
        "indore": (22.7196, 75.8577),
        "thane": (19.2183, 72.9781),
        "bhopal": (23.2599, 77.4126),
        "visakhapatnam": (17.6868, 83.2185),
        "pimpri": (18.6298, 73.7997),
        "patna": (25.5941, 85.1376),
        "vadodara": (22.3072, 73.1812),
        "ghaziabad": (28.6692, 77.4538),
        "ludhiana": (30.9010, 75.8573),
        "agra": (27.1767, 78.0081),
        "nashik": (19.9975, 73.7898),
        "faridabad": (28.4089, 77.3178),
        "meerut": (28.9845, 77.7064),
        "rajkot": (22.3039, 70.8022),
        "kalyan": (19.2403, 73.1305),
        "vasai": (19.4700, 72.8000),
        "varanasi": (25.3176, 82.9739),
        "srinagar": (34.0837, 74.7973),
        "aurangabad": (19.8762, 75.3433),
        "noida": (28.5355, 77.3910),
        "solapur": (17.6599, 75.9064),
        "vijayawada": (16.5062, 80.6480),
        "kolhapur": (16.7050, 74.2433),
        "amritsar": (31.6340, 74.8723),
        "nashik": (19.9975, 73.7898),
        "ranchi": (23.3441, 85.3096),
        "howrah": (22.5958, 88.2636),
        "coimbatore": (11.0168, 76.9558),
        "raipur": (21.2514, 81.6296),
        "jabalpur": (23.1815, 79.9864),
        "gwalior": (26.2183, 78.1828),
        "chandigarh": (30.7333, 76.7794),
        "tiruchirappalli": (10.7905, 78.7047),
        "mysore": (12.2958, 76.6394),
        "kozhikode": (11.2588, 75.7804),
        "bhubaneswar": (20.2961, 85.8245),
        "salem": (11.6643, 78.1460),
        "warangal": (17.9689, 79.5941),
        "guntur": (16.3067, 80.4365),
        "bhiwandi": (19.3002, 73.0586),
        "amravati": (20.9374, 77.7796),
        "nanded": (19.1383, 77.3210),
        "kolhapur": (16.7050, 74.2433),
        "sangli": (16.8524, 74.5815),
        "malegaon": (20.5597, 74.5255),
        "ulhasnagar": (19.2215, 73.1645),
        "jalgaon": (21.0077, 75.5626),
        "latur": (18.4088, 76.5604),
        "akola": (20.7006, 77.0082),
        "dhule": (20.9042, 74.7749),
        "ahmednagar": (19.0952, 74.7496),
        "ichalkaranji": (16.7000, 74.4667),
        "parbhani": (19.2613, 76.7774),
        "jalna": (19.8410, 75.8864),
        "bhusawal": (21.0436, 75.7851),
        "panvel": (18.9881, 73.1103),
        "satara": (17.6805, 73.9889),
        "beed": (18.9894, 75.7564),
        "yavatmal": (20.3888, 78.1204),
        "kamptee": (21.2333, 79.2000),
        "gondia": (21.4600, 80.1920),
        "chandrapur": (19.9703, 79.3039),
        "new york": (40.7128, -74.0060),
        "london": (51.5074, -0.1278),
        "paris": (48.8566, 2.3522),
        "tokyo": (35.6762, 139.6503),
        "sydney": (-33.8688, 151.2093),
        "berlin": (52.5200, 13.4050),
        "madrid": (40.4168, -3.7038),
        "rome": (41.9028, 12.4964),
        "moscow": (55.7558, 37.6176),
        "dubai": (25.2048, 55.2708),
        "singapore": (1.3521, 103.8198),
        "hong kong": (22.3193, 114.1694),
        "seoul": (37.5665, 126.9780),
        "beijing": (39.9042, 116.4074),
        "shanghai": (31.2304, 121.4737),
        "mumbai": (19.0760, 72.8777),
        "delhi": (28.7041, 77.1025),
        "bangalore": (12.9716, 77.5946),
        "kolkata": (22.5726, 88.3639),
        "hyderabad": (17.3850, 78.4867),
        "pune": (18.5204, 73.8567),
        "ahmedabad": (23.0225, 72.5714),
        "jaipur": (26.9124, 75.7873),
        "lucknow": (26.8467, 80.9462),
        "kanpur": (26.4499, 80.3319),
        "nagpur": (21.1458, 79.0882),
        "indore": (22.7196, 75.8577),
        "thane": (19.2183, 72.9781),
        "bhopal": (23.2599, 77.4126),
        "visakhapatnam": (17.6868, 83.2185),
        "pimpri": (18.6298, 73.7997),
        "patna": (25.5941, 85.1376),
        "vadodara": (22.3072, 73.1812),
        "ghaziabad": (28.6692, 77.4538),
        "ludhiana": (30.9010, 75.8573),
        "agra": (27.1767, 78.0081),
        "nashik": (19.9975, 73.7898),
        "faridabad": (28.4089, 77.3178),
        "meerut": (28.9845, 77.7064),
        "rajkot": (22.3039, 70.8022),
        "kalyan": (19.2403, 73.1305),
        "vasai": (19.4700, 72.8000),
        "varanasi": (25.3176, 82.9739),
        "srinagar": (34.0837, 74.7973),
        "aurangabad": (19.8762, 75.3433),
        "noida": (28.5355, 77.3910),
        "solapur": (17.6599, 75.9064),
        "vijayawada": (16.5062, 80.6480),
        "kolhapur": (16.7050, 74.2433),
        "amritsar": (31.6340, 74.8723),
        "ranchi": (23.3441, 85.3096),
        "howrah": (22.5958, 88.2636),
        "coimbatore": (11.0168, 76.9558),
        "raipur": (21.2514, 81.6296),
        "jabalpur": (23.1815, 79.9864),
        "gwalior": (26.2183, 78.1828),
        "chandigarh": (30.7333, 76.7794),
        "tiruchirappalli": (10.7905, 78.7047),
        "mysore": (12.2958, 76.6394),
        "kozhikode": (11.2588, 75.7804),
        "bhubaneswar": (20.2961, 85.8245),
        "salem": (11.6643, 78.1460),
        "warangal": (17.9689, 79.5941),
        "guntur": (16.3067, 80.4365),
        "bhiwandi": (19.3002, 73.0586),
        "amravati": (20.9374, 77.7796),
        "nanded": (19.1383, 77.3210),
        "sangli": (16.8524, 74.5815),
        "malegaon": (20.5597, 74.5255),
        "ulhasnagar": (19.2215, 73.1645),
        "jalgaon": (21.0077, 75.5626),
        "latur": (18.4088, 76.5604),
        "akola": (20.7006, 77.0082),
        "dhule": (20.9042, 74.7749),
        "ahmednagar": (19.0952, 74.7496),
        "ichalkaranji": (16.7000, 74.4667),
        "parbhani": (19.2613, 76.7774),
        "jalna": (19.8410, 75.8864),
        "bhusawal": (21.0436, 75.7851),
        "panvel": (18.9881, 73.1103),
        "satara": (17.6805, 73.9889),
        "beed": (18.9894, 75.7564),
        "yavatmal": (20.3888, 78.1204),
        "kamptee": (21.2333, 79.2000),
        "gondia": (21.4600, 80.1920),
        "chandrapur": (19.9703, 79.3039)
    }
    
    # Check if location is in our database
    location_key = location_name.lower().strip()
    if location_key in major_cities:
        return major_cities[location_key]
    
    # If not found in any method, return None
    return None, None

def get_soil_info(lat, lon, top_k=3, detailed_location_name=None):
    """
    Fetch comprehensive soil information for the given latitude and longitude.
    
    :param lat: Latitude of the location
    :param lon: Longitude of the location
    :param top_k: Number of top probable soil types to return
    :return: Dictionary containing soil information
    """
    url = "https://api.openepi.io/soil/type"
    params = {
        "lat": lat,
        "lon": lon,
        "top_k": top_k
    }
    
    try:
        response = requests.get(url, params=params)
        response.raise_for_status()
        data = response.json()
        
        # Get location name using reverse geocoding (or use provided detailed location name)
        location_name = detailed_location_name or get_location_name(lat, lon)
        
        # Get familiar soil names
        main_soil_type = data["properties"]["most_probable_soil_type"]
        familiar_info = get_familiar_soil_names(main_soil_type)
        
        # Process probabilities to include familiar names
        probabilities_with_familiar = []
        if data["properties"].get("probabilities"):
            for prob in data["properties"]["probabilities"]:
                prob_familiar = get_familiar_soil_names(prob["soil_type"])
                probabilities_with_familiar.append({
                    "soil_type": prob["soil_type"],
                    "probability": prob["probability"],
                    "familiar_names": prob_familiar["familiar_names"],
                    "description": prob_familiar["description"]
                })
        
        # Extract soil information according to the OpenAPI specification
        soil_info = {
            "coordinates": {"lat": lat, "lon": lon},
            "location_name": location_name,
            "most_probable_soil_type": main_soil_type,
            "familiar_names": familiar_info["familiar_names"],
            "soil_description": familiar_info["description"],
            "probabilities": probabilities_with_familiar,
            "geometry": data.get("geometry", {}),
            "type": data.get("type", "Feature")
        }
        
        return soil_info
        
    except requests.exceptions.RequestException as e:
        return {"error": f"Error fetching soil data: {e}"}
    except KeyError as e:
        return {"error": f"Unexpected response format: {e}"}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok"})

def _normalize_groundwater_payload(api_json, endpoint_url):
    try:
        wl = None
        if isinstance(api_json, dict):
            nearest_data = api_json.get('nearest_record_data', {})
            # Try multiple possible field names for water level
            wl = (nearest_data.get('WL (in mbgl)') or 
                  nearest_data.get('WL') or 
                  nearest_data.get('water_level') or 
                  nearest_data.get('Water Level') or
                  nearest_data.get('groundwater_level'))
            
        unit = 'm bgl'
        station_name = ", ".join(list(filter(None, [
            api_json.get('nearest_record_data', {}).get('VILLAGE'),
            api_json.get('nearest_record_data', {}).get('BLOCK'),
            api_json.get('nearest_record_data', {}).get('DISTRICT'),
            api_json.get('nearest_record_data', {}).get('STATE_UT')
        ]))) if isinstance(api_json, dict) else 'Nearest Station'
        
        # If no water level found, try to extract from raw data
        if wl is None and isinstance(api_json, dict):
            # Look for any numeric field that might be water level
            for key, value in api_json.get('nearest_record_data', {}).items():
                if isinstance(value, (int, float)) and ('wl' in key.lower() or 'water' in key.lower() or 'level' in key.lower()):
                    wl = value
                    break
        
        return {
            "values": [{"value": [{"value": str(wl) if wl is not None else 'N/A'}]}],
            "variable": {"unit": {"unitCode": unit}},
            "stationInfo": {
                "stationName": station_name,
                "stateName": api_json.get('nearest_record_data', {}).get('STATE_UT') if isinstance(api_json, dict) else None,
                "districtName": api_json.get('nearest_record_data', {}).get('DISTRICT') if isinstance(api_json, dict) else None,
                "agencyName": "Local Excel Dataset",
                "lastUpdated": api_json.get('nearest_record_data', {}).get('Date') if isinstance(api_json, dict) else None
            },
            "rawData": api_json,
            "isMockData": False,
            "apiResponse": {"endpoint": endpoint_url, "status": 200}
        }
    except Exception as e:
        return {"error": f"Normalization error: {e}"}

@app.route('/get_groundwater_by_coordinates', methods=['POST'])
def get_groundwater_by_coordinates_proxy():
    """Server-side proxy that calls the FastAPI groundwater service and returns normalized data"""
    try:
        data = request.get_json(force=True) or {}
        lat = float(data.get('lat'))
        lon = float(data.get('lon'))
    except Exception:
        return jsonify({"error": "Invalid or missing lat/lon"}), 400

    # Try multiple local endpoints
    candidates = [
        f"http://127.0.0.1:8000/groundwater?lat={lat}&lon={lon}",
        f"http://localhost:8000/groundwater?lat={lat}&lon={lon}"
    ]

    last_err = None
    for url in candidates:
        try:
            r = requests.get(url, timeout=15)
            if r.status_code == 200:
                api_json = r.json()
                normalized = _normalize_groundwater_payload(api_json, url)
                if "error" in normalized:
                    return jsonify(normalized), 500
                return jsonify(normalized)
            else:
                last_err = f"HTTP {r.status_code} {r.text[:200]}"
        except Exception as e:
            last_err = str(e)
            continue

    return jsonify({"error": f"Groundwater service unreachable: {last_err}"}), 502

@app.route('/get_soil_info', methods=['POST'])
def get_soil_info_route():
    data = request.get_json()
    location_name = data.get('location', '').strip()
    lat = data.get('lat')
    lon = data.get('lon')
    
    # If coordinates are provided directly, use them
    if lat is not None and lon is not None:
        try:
            lat = float(lat)
            lon = float(lon)
        except (ValueError, TypeError):
            return jsonify({"error": "Invalid coordinates provided"}), 400
    elif location_name:
        # Get coordinates and detailed location name for the location name
        lat, lon, detailed_location = get_coordinates_and_location_name(location_name)
        
        if lat is None or lon is None:
            return jsonify({"error": f"Could not find coordinates for '{location_name}'. Please try a different location name."}), 400
    else:
        return jsonify({"error": "Please provide either a location name or coordinates"}), 400
    
    # Get soil information
    if 'detailed_location' in locals():
        soil_info = get_soil_info(lat, lon, detailed_location_name=detailed_location)
    else:
        soil_info = get_soil_info(lat, lon)
    
    if "error" in soil_info:
        return jsonify(soil_info), 500
    
    return jsonify(soil_info)

@app.route('/get_soil_by_coordinates', methods=['POST'])
def get_soil_by_coordinates():
    """Route specifically for getting soil info by coordinates"""
    data = request.get_json()
    lat = data.get('lat')
    lon = data.get('lon')
    
    if lat is None or lon is None:
        return jsonify({"error": "Latitude and longitude are required"}), 400
    
    try:
        lat = float(lat)
        lon = float(lon)
    except (ValueError, TypeError):
        return jsonify({"error": "Invalid coordinates provided"}), 400
    
    # Validate coordinate ranges
    if not (-90 <= lat <= 90):
        return jsonify({"error": "Latitude must be between -90 and 90"}), 400
    if not (-180 <= lon <= 180):
        return jsonify({"error": "Longitude must be between -180 and 180"}), 400
    
    # Get soil information
    soil_info = get_soil_info(lat, lon)
    
    if "error" in soil_info:
        return jsonify(soil_info), 500
    
    return jsonify(soil_info)

if __name__ == "__main__":
    app.run(debug=True, host='0.0.0.0', port=5000)