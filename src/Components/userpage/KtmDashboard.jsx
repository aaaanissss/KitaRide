// src/Components/ktm/KtmDashboard.jsx
import { useEffect, useMemo, useState } from "react";
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
      try {
        const res = await fetch("/api/ktm/stations");
        const json = await res.json();
        const list = Array.isArray(json) ? json : [];
        setStations(list);

        // set default station once stations load
        setStationId((prev) => prev || (list[0]?.id ?? ""));
      } catch (e) {
        console.error("Failed to load KTM stations:", e);
        setStations([]);
      }
    }
    loadStations();
  }, []);

  const selectedStation = useMemo(() => {
    return stations.find((s) => s.id === stationId)?.name || stationId || "";
  }, [stations, stationId]);

  return (
    <>
      <Header />
      <div className="ktm-dashboard">
        {/* Top header */}
        <header className="ktm-dashboard-header">
          <div>
            <h1>KTM Komuter Ridership Dashboard</h1>
            <p>
              Line-level 7-day ridership prediction (KTM) and station-level hourly
              patterns (2023–2025).
            </p>
          </div>
        </header>

        {/* Content grid */}
        <main className="ktm-dashboard-grid">
          {/* 7-Day prediction card (NO station filtering) */}
          <section className="ktm-card ktm-card--wide">
            <div className="ktm-card-header">
              <div>
                <h2>7-Day Ridership Prediction – KTM Komuter lines</h2>
                <p className="ktm-subtext">
                  Covers KTM Komuter Klang Valley.
                </p>
              </div>
              <span className="ktm-tag">Machine Learning Prediction</span>
            </div>

            {/* NOTE: no station props */}
            <KtmNext7Chart />
          </section>

          {/* Hourly pattern card (station-filtered) */}
          <section className="ktm-card ktm-card--wide">
            <div className="ktm-card-header ktm-card-header--hourly">
              {/* Left: title + tag */}
              <div className="ktm-card-header-main">
                <h2>
                  Hourly Ridership Pattern – {selectedStation} ({DOW_LABELS[dow]})
                </h2>
                <span className="ktm-tag">Historical average</span>
              </div>

              {/* Right: Station + DOW controls */}
              <div className="ktm-card-header-controls">
                <div className="ktm-control">
                  <label className="ktm-dow-label">Station</label>
                  <select
                    value={stationId}
                    onChange={(e) => setStationId(e.target.value)}
                    className="ktm-dow-select"
                  >
                    {stations.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.id})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="ktm-control">
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
            </div>

            <KtmHourlyChart stationId={stationId} dow={dow} />
            <p className="ktm-card-footer">
              Model-estimated trips per hour (trained on Komuter OD data).
            </p>
          </section>

          {/* Key insights card (make it aligned to your new logic) */}
          <section className="ktm-card">
            <div className="ktm-card-header">
              <h3>Key Insights</h3>
            </div>
            <ul className="ktm-highlights">
              <li>📈 7-day prediction reflects KTM line-level expected demand</li>
              <li>
                🚉 Hourly chart reflects station-level pattern for{" "}
                {selectedStation || "your selected station"}
              </li>
              <li>🕒 Peak hour depends on selected station + day of week</li>
              <li>🎯 Supports crowd management & journey planning</li>
            </ul>
          </section>
        </main>
      </div>
      <Footer />
    </>
  );
}
