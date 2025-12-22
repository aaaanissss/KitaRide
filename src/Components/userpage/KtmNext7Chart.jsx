import React, { useEffect, useState } from "react";
import RidershipNext7Chart from "./RidershipNext7Chart.jsx";

export default function KtmNext7Chart({ stationId, stationName }) {
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchForecast() {
      try {
        setLoading(true);
        setError("");

        // Use same API as exploration panel - this one works correctly
        const res = await fetch("/api/ridership/expected-pattern");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const json = await res.json();
        console.log("API response length:", json.length);
        console.log("Sample data:", json.slice(0, 2));
        
        // Set predictions data - RidershipNext7Chart will handle filtering
        setPredictions(Array.isArray(json) ? json : []);
      } catch (err) {
        console.error("Failed to load KTM 7-day prediction:", err);
        setError("Failed to load KTM 7-day prediction.");
      } finally {
        setLoading(false);
      }
    }

    if (stationId) {
      fetchForecast();
    }
  }, [stationId]);

  if (!stationId) return <p className="ktm-status">Pick a station to view prediction.</p>;
  if (loading) return <p className="ktm-status">Loading prediction…</p>;
  if (error) return <p className="ktm-status ktm-status--error">{error}</p>;

  // For KTM dashboard, we need to extract line names for the selected station
  // Since we're using the exploration panel data, we need to find KTM lines
  const ktmLineNames = ["KTM Komuter Core", "KTM Komuter Klang Valley"];

  return (
    <RidershipNext7Chart 
      predictions={predictions} 
      lineNames={ktmLineNames}
    />
  );
}