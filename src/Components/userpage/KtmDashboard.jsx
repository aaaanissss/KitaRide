// src/Components/ktm/KtmDashboard.jsx
import { useEffect, useState } from "react";
import KtmHourlyChart from "./KtmHourlyChart";
import KtmNext7Chart from "./KtmNext7Chart.jsx";
import Header from "./Header.jsx";
import Footer from "../../Footer.jsx";
import "./KtmDashboard.css";

const DOW_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function KtmDashboard() {
  const [stations, setStations] = useState([]);
  const [stationId, setStationId] = useState(""); // selected station
  const [dow, setDow] = useState(1); // default Tue

  // Remove global background on this page
  useEffect(() => {
    document.body.classList.add("no-bg", "dashboard-body");
    return () => {
      document.body.classList.remove("no-bg", "dashboard-body");
    };
  }, []);

  // Load station list once
  useEffect(() => {
    async function loadStations() {
      const res = await fetch("/api/ktm/stations");
      const json = await res.json();
      setStations(json);

      // default station if empty
      if (json.length && !stationId) {
        setStationId(json[0].id);
      }
    }
    loadStations();
  }, []); // run once

  const selectedStation =
    stations.find((s) => s.id === stationId)?.name || stationId || "";

  return (
    <>
      <Header />
      <div className="ktm-dashboard">
        {/* Top header */}
        <header className="ktm-dashboard-header">
          <div>
            <h1>KTM Komuter Ridership Dashboard</h1>
            <p>
              Combined view of 7-day daily ridership prediction and historical
              hourly patterns for KTM Komuter stations (2023–2025).
            </p>
          </div>
        </header>

        {/* Filter bar – only what we actually use */}
        <section className="ktm-filter-bar">
          <div className="filter-group">
            <label htmlFor="station-select">Station</label>
            <select
              id="station-select"
              value={stationId}
              onChange={(e) => setStationId(e.target.value)}
            >
              {stations.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.id})
                </option>
              ))}
            </select>
          </div>
        </section>

        {/* Content grid */}
        <main className="ktm-dashboard-grid">
          {/* 7-Day prediction card */}
          <section className="ktm-card ktm-card--wide">
            <div className="ktm-card-header">
              <h2>7-Day Daily Ridership Prediction – {selectedStation}</h2>
              <span className="ktm-tag">Machine Learning Prediction</span>
            </div>
            <KtmNext7Chart stationName={selectedStation} />
          </section>

         {/* Hourly pattern card */}
        <section className="ktm-card ktm-card--wide">
            <div className="ktm-card-header ktm-card-header--hourly">
                {/* Left side: title + tag */}
                <div className="ktm-card-header-main">
                <h2>
                    Hourly Ridership Pattern – {selectedStation} ({DOW_LABELS[dow]})
                </h2>
                <span className="ktm-tag">Historical average</span>
                </div>

                {/* Right side: DOW dropdown */}
                <div className="ktm-card-header-controls">
                <label className="ktm-dow-label">Day of Week</label>
                <select
                    value={dow}
                    onChange={(e) => setDow(Number(e.target.value))}
                    className="ktm-dow-select"
                >
                    {DOW_LABELS.map((label, idx) => (
                    <option key={label} value={idx}>
                        {label}
                    </option>
                    ))}
                </select>
                </div>
            </div>
            <KtmHourlyChart stationId={stationId} dow={dow} />
        </section>



          {/* Key insights card */}
          <section className="ktm-card">
            <div className="ktm-card-header">
              <h3>Key Insights</h3>
            </div>
            <ul className="ktm-highlights">
              <li>🚆 Busiest day this week for {selectedStation}</li>
              <li>📉 Quietest day based on the 7-day prediction</li>
              <li>🕒 Peak hour on {DOW_LABELS[dow]} from historical data</li>
              <li>🎯 Supports crowd management & journey planning</li>
            </ul>
          </section>
        </main>
      </div>
      <Footer />
    </>
  );
}
