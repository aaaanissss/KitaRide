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

export default function KtmOdTrend({ originId, destinationId, viewType }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    // ⛔ don't fetch until we have a real originId
    if (!originId) return;

    async function loadData() {
        try {
            setLoading(true);
            setErr("");

            const endpoint =
                viewType === "daily"
                ? `/api/ktm/daily?origin=${originId}&destination=${destinationId}`
                : `/api/ktm/monthly?origin=${originId}&destination=${destinationId}`;

            const res = await apiFetch(endpoint);
            if (!res.ok) throw new Error("HTTP " + res.status);

            const json = await res.json();
            const formatted = json.map((r) => ({
                label: r.date || r.month,
                ridership: r.daily_ridership || r.monthly_ridership,
            }));

            setData(formatted);
            } catch (e) {
            console.error(e);
            setErr("Failed to load OD data.");
            } finally {
            setLoading(false);
            }
        }

        loadData();
    }, [originId, destinationId, viewType]);


  if (loading) return <p className="ktm-status">Loading OD data…</p>;
  if (err) return <p className="ktm-status ktm-status--error">{err}</p>;
  if (!data.length)
    return (
      <p className="ktm-status">
        No ridership found for this origin–destination pair.
      </p>
    );

  return (
    <>
      <div style={{ width: "100%", height: 320 }}>
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 10, right: 20, bottom: 40, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="label"
              tickFormatter={(v) => v.slice(0, 10)}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="ridership"
              stroke="#2563eb"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="ktm-card-footer">
        {viewType === "daily"
          ? "Daily ridership for this origin–destination pair."
          : "Monthly total ridership for this origin–destination pair."}
      </p>
    </>
  );
}
