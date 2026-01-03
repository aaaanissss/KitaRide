import React, { useEffect, useState } from "react";
import RidershipNext7Chart from "./RidershipNext7Chart.jsx";
import { apiFetch } from "../../lib/api";

export default function KtmNext7Chart() {
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchForecast() {
      try {
        setLoading(true);
        setError("");

        // Same API as exploration panel (works)
        const res = await apiFetch("/api/ridership/expected-pattern");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const json = await res.json();
        setPredictions(Array.isArray(json) ? json : []);
      } catch (err) {
        console.error("Failed to load KTM 7-day prediction:", err);
        setError("Failed to load KTM 7-day prediction.");
      } finally {
        setLoading(false);
      }
    }

    fetchForecast();
  }, []);

  if (loading) return <p className="ktm-status">Loading prediction…</p>;
  if (error) return <p className="ktm-status ktm-status--error">{error}</p>;

  // ✅ Use EXACT model label (based on your training output)
  const ktmLineNames = ["KTM Komuter Klang Valley"];

  return <RidershipNext7Chart predictions={predictions} lineNames={ktmLineNames} />;
}
