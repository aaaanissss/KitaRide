// src/Components/userpage/HeatmapLayer.jsx
import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.heat";

export default function HeatmapLayer({ points }) {
  const map = useMap();
  const layerRef = useRef(null);

  useEffect(() => {
    // Remove old layer if it exists
    if (layerRef.current && map) {
      map.removeLayer(layerRef.current);
      layerRef.current = null;
    }

    if (!map || !points || points.length === 0) return;

    // Compute max intensity from current points
    const intensities = points.map((p) => p[2] || 0);
    const max = intensities.length ? Math.max(...intensities) : 1;

    // Simple zoom-based radius (bigger when zoomed out)
    const zoom = map.getZoom ? map.getZoom() : 12;
    let radius = 25;
    if (zoom <= 10) radius = 35;
    else if (zoom <= 12) radius = 28;
    else if (zoom <= 14) radius = 22;
    else radius = 18;

    const heat = L.heatLayer(points, {
      radius,
      blur: 20,
      max,
      // optional: slightly boost opacity so it pops on your map
      maxOpacity: 0.9,
      // you can tweak gradient later if you want custom colours
    });

    heat.addTo(map);
    layerRef.current = heat;

    // Clean up on unmount / points change
    return () => {
      if (layerRef.current && map) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [map, points]);

  // This component only manages the Leaflet layer – it renders nothing itself
  return null;
}