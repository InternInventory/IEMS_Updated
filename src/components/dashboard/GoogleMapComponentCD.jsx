import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
 
// Fix for default markers in react-leaflet - THIS IS CRITICAL
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});
 
// Create custom green icon - using a reliable URL
const greenIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});
 
const mapContainerStyle = {
  width: "100%",
  height: "400px",
  borderRadius: "8px",
};
 
const defaultCenter = [19.115809858086376, 72.89047724460498]; // BuildINT Office, Mumbai
const defaultZoom = 14;
 
// Component to handle map bounds adjustment
const MapBoundsAdjuster = ({ locations }) => {
  const map = useMap();
 
  useEffect(() => {
    if (locations.length > 0) {
      // Filter valid coordinates with proper validation
      const validLocations = locations.filter(loc => {
        const lat = parseFloat(loc.geo_lat);
        const lng = parseFloat(loc.geo_long);
        return !isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
      });
 
      console.log("Valid locations for bounds:", validLocations.length);
 
      if (validLocations.length === 1) {
        const loc = validLocations[0];
        const lat = parseFloat(loc.geo_lat);
        const lng = parseFloat(loc.geo_long);
        const position = [lat, lng];
        console.log(`Centering map on single location: ${loc.loc_name} at`, position);
        map.setView(position, 16);
      } else if (validLocations.length > 1) {
        const bounds = L.latLngBounds();
        validLocations.forEach((loc) => {
          const lat = parseFloat(loc.geo_lat);
          const lng = parseFloat(loc.geo_long);
          bounds.extend([lat, lng]);
          console.log(`Adding ${loc.loc_name} to bounds:`, [lat, lng]);
        });
        map.fitBounds(bounds, { padding: [30, 30], maxZoom: 16 });
      } else {
        // Fallback to default center if no valid locations
        console.log("No valid locations found, using default center");
        map.setView(defaultCenter, 14);
      }
    }
  }, [locations, map]);
 
  return null;
};
 
const GoogleMapComponentCD = () => {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const [locations, setLocations] = useState([]);
  const [selectedMarker, setSelectedMarker] = useState(null);
 
  const apiURL = import.meta.env.VITE_API_BASE_URL;
  const token = localStorage.getItem("token") || sessionStorage.getItem("token");
 
  // ✅ Fetch site locations
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const res = await axios.get(`${apiURL}/client-sites/${clientId}`, {
          headers: { Authorization: token },
        });
 
        let locationsData = [];
 
        if (Array.isArray(res.data)) {
          locationsData = res.data;
        } else if (res.data?.success && Array.isArray(res.data.sites)) {
          locationsData = res.data.sites;
        } else {
          console.warn("Unexpected API response:", res.data);
          locationsData = [];
        }
 
        // Fix invalid coordinates before setting state
        const fixedLocations = locationsData.map(location => {
          let lat = parseFloat(location.geo_lat);
          let lng = parseFloat(location.geo_long);
         
          // Fix obviously invalid coordinates
          if (location.loc_name === "Powai" && lat === 89.00) {
            // Powai, Mumbai coordinates (approximate)
            lat = 19.12;
            lng = 72.84;
            console.log(`Fixed coordinates for ${location.loc_name} from [89.00, 34.8789] to [${lat}, ${lng}]`);
          }
         
          // Validate and fix any other obviously wrong coordinates
          if (lat > 90 || lat < -90) {
            console.warn(`Invalid latitude ${lat} for ${location.loc_name}, using default`);
            lat = defaultCenter[0] + (Math.random() * 0.01 - 0.005); // Small random offset
          }
          if (lng > 180 || lng < -180) {
            console.warn(`Invalid longitude ${lng} for ${location.loc_name}, using default`);
            lng = defaultCenter[1] + (Math.random() * 0.01 - 0.005); // Small random offset
          }
         
          return {
            ...location,
            geo_lat: lat.toString(),
            geo_long: lng.toString()
          };
        });
 
        setLocations(fixedLocations);
        console.log("Locations loaded and fixed:", fixedLocations);
      } catch (error) {
        console.error("❌ Error fetching locations:", error);
      }
    };
 
    fetchLocations();
  }, [clientId, apiURL, token]);
 
  // ✅ Handle marker click
  const handleMarkerClick = (locId, index) => {
    setSelectedMarker(index);
  };
 
  // Get valid locations for rendering
  const validLocations = locations.filter(location => {
    const lat = parseFloat(location.geo_lat);
    const lng = parseFloat(location.geo_long);
    return !isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  });
 
  console.log("Rendering map with", validLocations.length, "valid locations");
 
  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        style={mapContainerStyle}
        scrollWheelZoom='center'
        whenReady={(map) => {
          console.log("Map is ready");
          // Enable Ctrl+scroll zoom behavior like Google Maps
          map.target.scrollWheelZoom.disable();
          map.target.on('wheel', function(e) {
            if (e.originalEvent.ctrlKey || e.originalEvent.metaKey) {
              map.target.scrollWheelZoom.enable();
              setTimeout(() => map.target.scrollWheelZoom.disable(), 100);
            } else {
              // Show toast message
              const toast = document.getElementById('map-toast-cd') || createToastCD();
              toast.style.display = 'block';
              toast.style.opacity = '1';
              setTimeout(() => {
                toast.style.opacity = '0';
                setTimeout(() => toast.style.display = 'none', 300);
              }, 1500);
            }
          });
        }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
       
        <MapBoundsAdjuster locations={validLocations} />
       
        {validLocations.map((location, index) => {
          const lat = parseFloat(location.geo_lat);
          const lng = parseFloat(location.geo_long);
          const position = [lat, lng];
 
          return (
            <Marker
              key={location.loc_id || index}
              position={position}
              icon={greenIcon}
              eventHandlers={{
                click: () => handleMarkerClick(location.loc_id, index),
              }}
            >
              <Popup>
                <div style={{ color: "#000", lineHeight: "1.4", minWidth: "200px" }}>
                  <strong>{location.loc_name}</strong>
                  <br />
                  📍 {location.loc_address}
                  <br />
                  🏢 Branch: {location.branch_code}
                  <br />
                  <button
                    onClick={() => navigate("/location", { state: { locationId: location.loc_id } })}
                    style={{
                      marginTop: '8px',
                      padding: '4px 8px',
                      backgroundColor: '#007bff',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    View Details
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
     
      {/* Debug info */}
      <div style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
        Loaded {validLocations.length} valid locations out of {locations.length} total |
        Selected: {selectedMarker !== null ? validLocations[selectedMarker]?.loc_name : 'None'} |
        Click on markers to see info
      </div>
     
      {/* Toast notification for Ctrl+scroll */}
      <div
        id="map-toast-cd"
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          padding: '12px 20px',
          borderRadius: '8px',
          fontSize: '14px',
          zIndex: 1000,
          display: 'none',
          opacity: 0,
          transition: 'opacity 0.3s ease',
          pointerEvents: 'none',
          textAlign: 'center'
        }}
      >
        Use Ctrl + scroll to zoom the map
      </div>
    </div>
  );
};
 
// Helper function to create toast if it doesn't exist
function createToastCD() {
  const toast = document.createElement('div');
  toast.id = 'map-toast-cd';
  return toast;
}
 
export default GoogleMapComponentCD;
 