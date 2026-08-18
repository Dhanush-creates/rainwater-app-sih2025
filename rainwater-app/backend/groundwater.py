from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import numpy as np
from geopy.distance import geodesic
from typing import Optional
import os

app = FastAPI(
    title="Groundwater Level API",
    description="API to fetch groundwater level data by coordinates",
    version="1.0.0"
)

# Add CORS middleware to allow frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow Vite dev (5173), React (3000), and others during development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variable to store the dataset
groundwater_data = None

def load_groundwater_data():
    """Load groundwater data from Excel file at startup"""
    global groundwater_data
    try:
        # Path to the Excel file (resolve relative to this file's directory)
        base_dir = os.path.dirname(os.path.abspath(__file__))
        excel_file = os.path.join(base_dir, "post-monsoon_wl_1994-2023_compressed.xlsx")
        
        if not os.path.exists(excel_file):
            raise FileNotFoundError(f"Excel file not found: {excel_file}")
        
        # Read Excel file
        df = pd.read_excel(excel_file)
        
        # Print column names to understand the structure
        print("Dataset columns:", df.columns.tolist())
        print("Dataset shape:", df.shape)
        print("First few rows:")
        print(df.head())
        
        # Clean and prepare the data
        # Find latitude and longitude columns (case insensitive)
        lat_col = None
        lon_col = None
        
        for col in df.columns:
            col_lower = col.lower()
            if 'lat' in col_lower:
                lat_col = col
            elif 'lon' in col_lower or 'lng' in col_lower:
                lon_col = col
        
        if lat_col is None or lon_col is None:
            raise ValueError(f"Could not find latitude/longitude columns. Available columns: {df.columns.tolist()}")
        
        print(f"Using latitude column: {lat_col}, longitude column: {lon_col}")
        
        # Remove rows with missing latitude/longitude
        df = df.dropna(subset=[lat_col, lon_col])
        
        # Convert to numeric, handling any string values
        df[lat_col] = pd.to_numeric(df[lat_col], errors='coerce')
        df[lon_col] = pd.to_numeric(df[lon_col], errors='coerce')
        
        # Remove rows where conversion failed
        df = df.dropna(subset=[lat_col, lon_col])
        
        # Standardize column names for easier access
        df = df.rename(columns={lat_col: 'Latitude', lon_col: 'Longitude'})
        
        groundwater_data = df
        print(f"Successfully loaded {len(df)} groundwater records")
        
    except Exception as e:
        print(f"Error loading groundwater data: {e}")
        groundwater_data = None

def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance between two points using geodesic distance"""
    try:
        point1 = (lat1, lon1)
        point2 = (lat2, lon2)
        return geodesic(point1, point2).kilometers
    except Exception:
        # Fallback to simple Euclidean distance if geopy fails
        return np.sqrt((lat1 - lat2)**2 + (lon1 - lon2)**2)

@app.on_event("startup")
async def startup_event():
    """Load data when the application starts"""
    print("Starting up Groundwater API...")
    load_groundwater_data()

@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "message": "Groundwater Level API",
        "version": "1.0.0",
        "endpoints": {
            "groundwater": "/groundwater?lat={latitude}&lon={longitude}"
        }
    }

@app.get("/groundwater")
async def get_groundwater_data(
    lat: float = Query(..., description="Latitude coordinate"),
    lon: float = Query(..., description="Longitude coordinate")
):
    """
    Get groundwater level data for the nearest location to given coordinates
    
    Args:
        lat: Latitude coordinate
        lon: Longitude coordinate
    
    Returns:
        JSON object with groundwater data for the nearest location
    """
    try:
        # Validate input coordinates
        if not (-90 <= lat <= 90):
            raise HTTPException(status_code=400, detail="Latitude must be between -90 and 90")
        if not (-180 <= lon <= 180):
            raise HTTPException(status_code=400, detail="Longitude must be between -180 and 180")
        
        # Check if data is loaded
        if groundwater_data is None or groundwater_data.empty:
            raise HTTPException(status_code=500, detail="Groundwater data not available")
        
        # Find the nearest location
        min_distance = float('inf')
        nearest_record = None
        
        for index, row in groundwater_data.iterrows():
            try:
                distance = calculate_distance(
                    lat, lon, 
                    row['Latitude'], row['Longitude']
                )
                
                if distance < min_distance:
                    min_distance = distance
                    nearest_record = row
            except Exception as e:
                print(f"Error calculating distance for row {index}: {e}")
                continue
        
        if nearest_record is None:
            raise HTTPException(status_code=404, detail="No groundwater data found")
        
        # Prepare response with all available data from the nearest record
        response = {
            "distance_km": round(min_distance, 2),
            "input_coordinates": {
                "latitude": lat,
                "longitude": lon
            },
            "nearest_record_data": {
                "STATE_UT": str(nearest_record.get('STATE_UT', 'Unknown')),
                "DISTRICT": str(nearest_record.get('DISTRICT', 'Unknown')),
                "BLOCK": str(nearest_record.get('BLOCK', 'Unknown')),
                "VILLAGE": str(nearest_record.get('VILLAGE', 'Unknown')),
                "Latitude": float(nearest_record['Latitude']),
                "Longitude": float(nearest_record['Longitude']),
                "Date": str(nearest_record.get('Date', 'Unknown')),
                "WL (in mbgl)": float(nearest_record.get('WL (in mbgl)', 0))
            }
        }
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Unexpected error: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "data_loaded": groundwater_data is not None and not groundwater_data.empty,
        "record_count": len(groundwater_data) if groundwater_data is not None else 0
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)