import React, { useState, useEffect } from 'react';
import { MapPin, Layers, Filter, RefreshCw } from 'lucide-react';
import LeafletMap from '../components/LeafletMap';
import { api } from '../api/client';

export default function MapIntelligence({ onSelectPattern }) {
  const [complaints, setComplaints] = useState([]);
  const [patterns, setPatterns] = useState([]);
  const [selectedWard, setSelectedWard] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMapData();
  }, [selectedWard, selectedCategory]);

  const loadMapData = async () => {
    try {
      setLoading(true);
      const params = { limit: 300 };
      if (selectedWard !== 'ALL') params.ward = selectedWard;
      if (selectedCategory !== 'ALL') params.category = selectedCategory;

      const [cmps, pats] = await Promise.all([
        api.getComplaints(params),
        api.getPatterns()
      ]);
      setComplaints(cmps);
      setPatterns(pats);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const clustersData = patterns.map(p => ({
    cluster_id: p.cluster_id,
    dominant_category: p.category,
    complaint_count: p.complaint_count,
    avg_similarity: p.avg_semantic_similarity,
    geo_center_lat: 12.9716, // centered on primary demo ward
    geo_center_lon: 77.5946,
    geo_radius_km: 0.64
  }));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-extrabold text-slate-900">Geospatial Intelligence Map</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-700 font-semibold border border-sky-200">
              Leaflet + OpenStreetMap
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Step 7: Visualize geographic concentrations, localized density corridors, and DBSCAN spatial bounding circles.
          </p>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap gap-2">
          <select
            value={selectedWard}
            onChange={(e) => setSelectedWard(e.target.value)}
            className="text-xs p-2 rounded-lg border border-slate-300 bg-white"
          >
            <option value="ALL">All Wards</option>
            <option value="Ward 12">Ward 12 (Water Cluster)</option>
            <option value="Ward 3">Ward 3</option>
            <option value="Ward 5">Ward 5</option>
            <option value="Ward 7">Ward 7</option>
            <option value="Ward 8">Ward 8</option>
            <option value="Ward 15">Ward 15</option>
          </select>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-xs p-2 rounded-lg border border-slate-300 bg-white"
          >
            <option value="ALL">All Categories</option>
            <option value="water_supply">Water Supply</option>
            <option value="road_infrastructure">Roads & Civil Works</option>
            <option value="sanitation_waste">Sanitation & Waste</option>
            <option value="electricity_lighting">Electricity & Lighting</option>
            <option value="sewage_drainage">Sewage & Drainage</option>
          </select>
        </div>
      </div>

      {/* Map Card */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <LeafletMap
          center={[12.9716, 77.5946]}
          zoom={13}
          complaints={complaints}
          clusters={clustersData}
          height="540px"
        />

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
          <div className="flex items-center space-x-4">
            <span className="font-semibold text-slate-900">Map Legend:</span>
            <span className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-full bg-[#0284c7]"></span>
              <span>Water Supply</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-full bg-[#d97706]"></span>
              <span>Roads</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-full bg-[#059669]"></span>
              <span>Sanitation</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-full bg-[#7c3aed]"></span>
              <span>Electricity</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-full bg-[#e11d48]"></span>
              <span>Drainage</span>
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <span className="w-4 h-0.5 border-t-2 border-dashed border-sky-500"></span>
            <span className="font-semibold">DBSCAN Cluster Bounding Circle</span>
          </div>
        </div>
      </div>
    </div>
  );
}
