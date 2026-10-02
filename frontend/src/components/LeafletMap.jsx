import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

export default function LeafletMap({ 
  center = [12.9716, 77.5946], 
  zoom = 14, 
  complaints = [], 
  clusters = [], 
  interactive = false,
  onLocationSelect = null,
  selectedLocation = null,
  height = '420px'
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const clustersLayerRef = useRef(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Fix leaflet marker default icon path issue in Vite
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current).setView(center, zoom);
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors | CivicSignal',
        maxZoom: 19,
      }).addTo(map);

      markersLayerRef.current = L.layerGroup().addTo(map);
      clustersLayerRef.current = L.layerGroup().addTo(map);

      if (interactive && onLocationSelect) {
        map.on('click', (e) => {
          onLocationSelect({ lat: e.latlng.lat, lon: e.latlng.lng });
        });
      }

      mapInstanceRef.current = map;
    } else {
      mapInstanceRef.current.setView(center, zoom);
    }

    return () => {
      // Cleanup on unmount
    };
  }, []);

  // Update center when center prop changes
  useEffect(() => {
    if (mapInstanceRef.current && center) {
      mapInstanceRef.current.setView(center, zoom);
    }
  }, [center[0], center[1], zoom]);

  // Update complaints markers
  useEffect(() => {
    if (!markersLayerRef.current || !mapInstanceRef.current) return;

    markersLayerRef.current.clearLayers();

    // If in interactive mode and a location is picked
    if (interactive && selectedLocation) {
      const marker = L.marker([selectedLocation.lat, selectedLocation.lon], {
        draggable: true
      }).addTo(markersLayerRef.current);
      marker.bindPopup('<b>Selected Location</b><br/>Lat: ' + selectedLocation.lat.toFixed(4) + ', Lon: ' + selectedLocation.lon.toFixed(4)).openPopup();
      
      marker.on('dragend', function(e) {
        const pos = e.target.getLatLng();
        if (onLocationSelect) onLocationSelect({ lat: pos.lat, lon: pos.lng });
      });
      return;
    }

    const categoryColors = {
      water_supply: '#0284c7', // Sky Blue
      road_infrastructure: '#d97706', // Amber
      sanitation_waste: '#059669', // Emerald
      electricity_lighting: '#7c3aed', // Violet
      sewage_drainage: '#e11d48', // Rose
      general_civic: '#64748b'
    };

    complaints.forEach((c) => {
      if (!c.latitude || !c.longitude) return;

      const color = categoryColors[c.category] || '#0284c7';
      const circleMarker = L.circleMarker([c.latitude, c.longitude], {
        radius: c.severity === 'critical' ? 8 : 6,
        fillColor: color,
        color: '#ffffff',
        weight: 1.5,
        opacity: 1,
        fillOpacity: 0.85,
      }).addTo(markersLayerRef.current);

      const popupHtml = `
        <div style="font-family: Inter, sans-serif; font-size: 12px; max-width: 220px;">
          <div style="font-weight: 700; color: #0f172a; margin-bottom: 2px;">${c.complaint_id || 'Complaint'}</div>
          <div style="font-size: 11px; color: #475569; margin-bottom: 4px;"><b>${c.ward || 'Ward'}</b> &bull; ${c.street || 'Street'}</div>
          <div style="background: #f1f5f9; padding: 4px 6px; border-radius: 4px; font-style: italic; color: #1e293b; margin-bottom: 6px;">
            "${c.complaint_text ? c.complaint_text.slice(0, 100) + '...' : ''}"
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 10px; font-weight: 600; text-transform: uppercase; color: ${color};">${c.category || 'General'}</span>
            <span style="font-size: 10px; background: #e2e8f0; padding: 1px 4px; border-radius: 3px;">${c.severity || 'Medium'}</span>
          </div>
        </div>
      `;
      circleMarker.bindPopup(popupHtml);
    });
  }, [complaints, interactive, selectedLocation]);

  // Update clusters overlay
  useEffect(() => {
    if (!clustersLayerRef.current || !mapInstanceRef.current) return;

    clustersLayerRef.current.clearLayers();

    clusters.forEach((cl) => {
      if (!cl.geo_center_lat || !cl.geo_center_lon) return;

      const radiusMeters = Math.max(250, (cl.geo_radius_km || 0.5) * 1000);
      
      const clusterCircle = L.circle([cl.geo_center_lat, cl.geo_center_lon], {
        radius: radiusMeters,
        color: '#0284c7',
        fillColor: '#38bdf8',
        fillOpacity: 0.15,
        weight: 2,
        dashArray: '4, 6'
      }).addTo(clustersLayerRef.current);

      clusterCircle.bindPopup(`
        <div style="font-family: Inter, sans-serif; font-size: 12px;">
          <div style="font-weight: 800; color: #0369a1;">${cl.cluster_id || 'Civic Cluster'}</div>
          <div style="margin-top: 4px;"><b>Category:</b> ${cl.dominant_category || 'Water Supply'}</div>
          <div><b>Complaints:</b> ${cl.complaint_count || 0}</div>
          <div><b>Avg Similarity:</b> ${cl.avg_similarity || 0.85}</div>
          <div><b>Radius:</b> ${cl.geo_radius_km || 0.6} km</div>
        </div>
      `);
    });
  }, [clusters]);

  return (
    <div className="relative w-full rounded-lg overflow-hidden border border-slate-200 shadow-sm" style={{ height }}>
      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  );
}
