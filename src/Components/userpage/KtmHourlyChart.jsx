import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { apiFetch } from "../../lib/api";

export default function KtmHourlyChart({ stationId, dow }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // ✅ guard: don’t call API until stationId exists
    if (!stationId) return;

    async function fetchHourly() {
      try {
        setLoading(true);
        setError("");

        const res = await apiFetch(`/api/ktm/hourly?station=${stationId}&dow=${dow}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const json = await res.json();
        const chartData = json.map((row) => ({
          hour: `${String(row.hour).padStart(2, "0")}:00`,
          avg: row.avg_ridership,
        }));

        setData(chartData);
      } catch (err) {
        console.error(err);
        setError("Failed to load hourly data.");
      } finally {
        setLoading(false);
      }
    }

    fetchHourly();
  }, [stationId, dow]);

  if (!stationId) return <p className="ktm-status">Pick a station to view hourly pattern.</p>;
  if (loading) return <p className="ktm-status">Loading hourly pattern…</p>;
  if (error) return <p className="ktm-status ktm-status--error">{error}</p>;
  if (!data.length) return <p className="ktm-status">No hourly data available.</p>;

  // --- Busiest / quietest hour stats (from loaded data) ---
  const busiest = data.reduce(
    (max, row) => (row.avg > max.avg ? row : max),
    data[0]
  );
  const quietest = data.reduce(
    (min, row) => (row.avg < min.avg ? row : min),
    data[0]
  );

  const formatTrips = (v) =>
    Math.round(v).toLocaleString("en-MY");

  return (
    <>
      <div className="ktm-chart-wrapper">
        <ResponsiveContainer>
          <LineChart
            data={data}
            margin={{ top: 10, right: 20, bottom: 40, left: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="hour"
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis />
            <Tooltip
              formatter={(value) => formatTrips(value)}
              labelFormatter={(label) => `Hour: ${label}`}
            />
            <Line
              type="monotone"
              dataKey="avg"
              stroke="#0f766e"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* New insights row */}
      <div className="ktm-hourly-insights">
        <div>
          🚆 <span className="ktm-insight-label">Busiest hour:</span>{" "}
          <strong>{busiest.hour}</strong>{" "}
          <span className="ktm-insight-value">
            (~{formatTrips(busiest.avg)} trips)
          </span>
        </div>
        <div>
          📉 <span className="ktm-insight-label">Quietest hour:</span>{" "}
          <strong>{quietest.hour}</strong>{" "}
          <span className="ktm-insight-value">
            (~{formatTrips(quietest.avg)} trips)
          </span>
        </div>
      </div>

      <p className="ktm-card-footer">
        Average trips per hour based on historical Komuter data (2023–2025).
      </p>
    </>
  );
}
