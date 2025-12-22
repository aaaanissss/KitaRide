import React, { useEffect, useState, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

// Tooltip component (similar style to your other charts)
function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;

  const formatDate = (dateString) => {
    const d = new Date(dateString);
    return d.toLocaleDateString("en-GB"); // DD/MM/YYYY
  };

  return (
    <div
      style={{
        background: "white",
        border: "1px solid #ddd",
        padding: "8px 10px",
        borderRadius: 8,
        fontSize: 13,
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 4 }}>
        {formatDate(row.date)} ({row.day_name})
      </div>
      <div>
        Expected riders:{" "}
        <b>{Math.round(row.expected_ridership).toLocaleString()}</b>
      </div>
      {row.is_holiday === 1 && row.holiday_name && (
        <div style={{ marginTop: 4, color: "#c0392b", fontSize: 12 }}>
          🎉 {row.holiday_name}
        </div>
      )}
    </div>
  );
}

/**
 * Props:
 *   stationName (string) – e.g. "KL Sentral"
 */
export default function KtmNext7Chart({ stationName }) {
  const [allData, setAllData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Load KTM 7-day forecast once
  useEffect(() => {
    async function fetchForecast() {
      try {
        setLoading(true);
        setError("");
        const res = await fetch("/api/ktm/next7days");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        setAllData(json || []);
      } catch (err) {
        console.error("Failed to load KTM next7days:", err);
        setError("Failed to load KTM 7-day prediction.");
      } finally {
        setLoading(false);
      }
    }

    fetchForecast();
  }, []);

  // Filter for selected station
  const chartData = useMemo(() => {
    if (!stationName || !allData.length) return [];

    const norm = (s) =>
      (s || "")
        .toString()
        .toLowerCase()
        .trim();

    const target = norm(stationName);

    return allData
      .filter((row) => norm(row.station_name) === target)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [allData, stationName]);

  // Loading / error / empty states
  if (loading) return <p className="ktm-status">Loading prediction…</p>;
  if (error) return <p className="ktm-status ktm-status--error">{error}</p>;
  if (!chartData.length)
    return (
      <p className="ktm-status">
        No prediction data available for {stationName}.
      </p>
    );

  // --- Calculate insights (ONE set only) ---
  const weeklyAvg =
    chartData.reduce((sum, r) => sum + r.expected_ridership, 0) /
    chartData.length;

  const busiest = chartData.reduce((a, b) =>
    a.expected_ridership > b.expected_ridership ? a : b
  );

  const quietest = chartData.reduce((a, b) =>
    a.expected_ridership < b.expected_ridership ? a : b
  );

  const pctDiff = (value) =>
    ((value - weeklyAvg) / weeklyAvg) * 100;

  const busiestPct = pctDiff(busiest.expected_ridership);
  const quietestPct = pctDiff(quietest.expected_ridership);

  const fmtPct = (v) =>
    (v > 0 ? "+" : "") + v.toFixed(1) + "%";

  const fmtRiders = (v) =>
    Math.round(v).toLocaleString();

  return (
    <>
      <div className="ktm-chart-wrapper">
        <ResponsiveContainer>
          <LineChart
            data={chartData}
            margin={{ top: 10, right: 20, bottom: 20, left: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="day_name"
              tick={{ fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => v.substring(0, 3)} // Mon → Mon
            />
            <YAxis
              tick={{ fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => value.toLocaleString()}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="expected_ridership"
              stroke="#0f766e"
              strokeWidth={2.5}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Insights row under the forecast chart */}
      <div className="ktm-forecast-insights">
        {/* Busiest day */}
        <div className="insight-row insight-busiest">
          <div className="insight-dot busiest-dot"></div>
          <span className="label">Busiest day:</span>
          <strong>{busiest.day_name}</strong>
          <span className="value">
            (~{fmtRiders(busiest.expected_ridership)} riders)
            <span className="pct">{fmtPct(busiestPct)}</span>
          </span>
          {busiest.is_holiday === 1 && busiest.holiday_name && (
            <span className="holiday">🎉 {busiest.holiday_name}</span>
          )}
        </div>

        {/* Quietest day */}
        <div className="insight-row insight-quietest">
          <div className="insight-dot quietest-dot"></div>
          <span className="label">Quietest day:</span>
          <strong>{quietest.day_name}</strong>
          <span className="value">
            (~{fmtRiders(quietest.expected_ridership)} riders)
            <span className="pct">{fmtPct(quietestPct)}</span>
          </span>
        </div>
      </div>

      <p className="ktm-card-footer">
        7-day daily ridership prediction for this station using Random Forest
        model (based on 2023–2025 data from data.gov.my).
      </p>
    </>
  );
}
