import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import axios from "axios";
import { useNavigate } from "react-router-dom";
 
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
 
// Alternative: If you want to use your local image, make sure the path is correct
// const greenIcon = new L.Icon({
//   iconUrl: "/src/assets/img/location/greenlocation.png",
//   iconSize: [28, 35],
//   iconAnchor: [14, 35],
//   popupAnchor: [0, -35],
// });
 
const mapContainerStyle = {
  width: "100%",
  height: "400px",
  borderRadius: "8px",
  position: "relative",
  zIndex: 1,
};
 
const defaultCenter = [20.5937, 78.9629];
const defaultZoom = 6;
 
// Component to handle map bounds adjustment
const MapBoundsAdjuster = ({ locations }) => {
  const map = useMap();
 
  useEffect(() => {
    if (locations.length > 0) {
      if (locations.length === 1) {
        const loc = locations[0];
        const position = [parseFloat(loc.geo_lat), parseFloat(loc.geo_long)];
        map.setView(position, 14);
      } else {
        const bounds = L.latLngBounds();
        locations.forEach((loc) => {
          bounds.extend([parseFloat(loc.geo_lat), parseFloat(loc.geo_long)]);
        });
        map.fitBounds(bounds, { padding: [20, 20] });
      }
    }
  }, [locations, map]);
 
  return null;
};
 
const GoogleMapComponent = () => {
  const navigate = useNavigate();
  const [locations, setLocations] = useState([]);
  const [selectedMarker, setSelectedMarker] = useState(null);
 
  const apiURL = import.meta.env.VITE_API_BASE_URL;
  const token = localStorage.getItem("token") || sessionStorage.getItem("token");
 
  // ✅ Fetch site locations
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const res = await axios.get(`${apiURL}/sites`, {
          headers: { Authorization: token },
        });
 
        if (res.data?.success && Array.isArray(res.data.sites)) {
          setLocations(res.data.sites);
          console.log("Locations loaded:", res.data.sites.length);
        } else {
          console.warn("Unexpected API response:", res.data);
          setLocations([]);
        }
      } catch (error) {
        console.error("❌ Error fetching locations:", error);
      }
    };
 
    fetchLocations();
  }, [apiURL, token]);
 
  // ✅ Handle marker click
  const handleMarkerClick = (locId, index) => {
    setSelectedMarker(index);
    // If you still want to navigate on click:
    // navigate("/location", { state: { locationId: locId } });
  };
 
  console.log("Rendering map with", locations.length, "locations");
 
  return (
    <div style={{ position: 'relative', width: '100%', overflow: 'hidden' }}>
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
              const toast = document.getElementById('map-toast') || createToast();
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
       
        <MapBoundsAdjuster locations={locations} />
       
        {locations.map((location, index) => {
          // Validate coordinates
          const lat = parseFloat(location.geo_lat);
          const lng = parseFloat(location.geo_long);
         
          if (isNaN(lat) || isNaN(lng)) {
            console.warn("Invalid coordinates for location:", location);
            return null;
          }
 
          const position = [lat, lng];
 
          return (
            <Marker
              key={index}
              position={position}
              icon={greenIcon}
              eventHandlers={{
                click: () => handleMarkerClick(location.loc_id, index),
                mouseover: () => console.log("Mouse over marker:", index),
                mouseout: () => console.log("Mouse out of marker:", index),
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
        Loaded {locations.length} locations |
        Selected: {selectedMarker !== null ? locations[selectedMarker]?.loc_name : 'None'} |
        Click on markers to see info
      </div>
     
      {/* Toast notification for Ctrl+scroll */}
      <div
        id="map-toast"
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
function createToast() {
  const toast = document.createElement('div');
  toast.id = 'map-toast';
  return toast;
}
 
export default GoogleMapComponent;