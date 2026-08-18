import { useState } from 'react';

const GroundwaterDataForm = ({ onSubmit, onCancel, isLoading, currentLocation }) => {
  // Generate date range for last year
  const getDefaultDateRange = () => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setFullYear(endDate.getFullYear() - 1);
    
    return {
      start: startDate.toISOString().split('T')[0],
      end: endDate.toISOString().split('T')[0]
    };
  };

  const defaultDates = getDefaultDateRange();

  // Extract state and district from current location
  const getLocationDefaults = () => {
    if (!currentLocation) return { stateName: '', districtName: '' };
    
    // Try to extract state and district from location name
    const locationName = currentLocation.name || '';
    const region = currentLocation.region || '';
    const country = currentLocation.country || '';
    
    // Common state mappings for India
    const stateMappings = {
      'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli'],
      'Maharashtra': ['Mumbai', 'Pune', 'Nagpur', 'Nashik'],
      'Karnataka': ['Bangalore', 'Mysore', 'Hubli', 'Mangalore'],
      'West Bengal': ['Kolkata', 'Howrah', 'Durgapur', 'Asansol'],
      'Gujarat': ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot'],
      'Rajasthan': ['Jaipur', 'Jodhpur', 'Udaipur', 'Kota'],
      'Uttar Pradesh': ['Lucknow', 'Kanpur', 'Agra', 'Varanasi'],
      'Delhi': ['New Delhi', 'Delhi'],
      'Haryana': ['Gurgaon', 'Faridabad', 'Panipat', 'Karnal'],
      'Punjab': ['Chandigarh', 'Ludhiana', 'Amritsar', 'Jalandhar']
    };
    
    // Try to find matching state
    let detectedState = '';
    let detectedDistrict = '';
    
    for (const [state, districts] of Object.entries(stateMappings)) {
      if (locationName.toLowerCase().includes(state.toLowerCase()) || 
          region.toLowerCase().includes(state.toLowerCase())) {
        detectedState = state;
        // Try to find district
        for (const district of districts) {
          if (locationName.toLowerCase().includes(district.toLowerCase())) {
            detectedDistrict = district;
            break;
          }
        }
        break;
      }
    }
    
    // If no state found, try to use region as state
    if (!detectedState && region) {
      detectedState = region;
    }
    
    // If no district found, try to use location name as district
    if (!detectedDistrict && locationName) {
      detectedDistrict = locationName.split(',')[0].trim();
    }
    
    return {
      stateName: detectedState,
      districtName: detectedDistrict
    };
  };

  const locationDefaults = getLocationDefaults();

  const [formData, setFormData] = useState({
    stateName: locationDefaults.stateName,
    districtName: locationDefaults.districtName,
    agencyName: 'CGWB', // Default to CGWB as shown in example
    startdate: defaultDates.start,
    enddate: defaultDates.end,
    page: 0,
    size: 100
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-semibold mb-4 text-emerald-700">
          Groundwater Data Parameters
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Please provide the following information to fetch real groundwater data from India WRIS API:
        </p>
        {currentLocation && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Current Location:</strong> {currentLocation.name}, {currentLocation.region}, {currentLocation.country}
            </p>
            <p className="text-xs text-blue-600 mt-1">
              Form has been pre-filled based on your current location. You can modify the values as needed.
            </p>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                State Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="stateName"
                value={formData.stateName}
                onChange={handleChange}
                placeholder="e.g., Tamil Nadu, Maharashtra, Odisha"
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">
                District Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="districtName"
                value={formData.districtName}
                onChange={handleChange}
                placeholder="e.g., Chennai, Mumbai, Baleshwar"
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">
                Agency Name <span className="text-red-500">*</span>
              </label>
              <select
                name="agencyName"
                value={formData.agencyName}
                onChange={handleChange}
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                required
              >
                <option value="CGWB">CGWB (Central Ground Water Board)</option>
                <option value="SWID">SWID (State Water Investigation Department)</option>
                <option value="GSDA">GSDA (Groundwater Survey and Development Agency)</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">
                Page <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="page"
                value={formData.page}
                onChange={handleChange}
                min="0"
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">
                Size (Records) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="size"
                value={formData.size}
                onChange={handleChange}
                min="1"
                max="1000"
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                required
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Start Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="startdate"
                value={formData.startdate}
                onChange={handleChange}
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">
                End Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="enddate"
                value={formData.enddate}
                onChange={handleChange}
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                required
              />
            </div>
          </div>
          
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-emerald-600 text-white py-2 px-4 rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Fetching Data...' : 'Fetch Groundwater Data'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </form>
        
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> This will fetch real groundwater data from India WRIS API. 
            The data will be used to provide accurate groundwater level information for your location.
          </p>
        </div>
      </div>
    </div>
  );
};

export default GroundwaterDataForm;
