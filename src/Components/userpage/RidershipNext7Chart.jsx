import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;

  const row = payload[0].payload;

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return String(dateString);
    return d.toLocaleDateString("en-GB"); // DD/MM/YYYY
  };

  const value =
    row.expected_line_ridership ??
    row.expected_ridership ??
    row.y_hat ??
    0;

  const isHoliday =
    row.is_holiday === 1 ||
    row.is_public_holiday === 1 ||
    row.is_holiday === true;

  const holidayName =
    row.holiday_name ||
    row.holiday ||
    row.festival_name ||
    "";

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
        {formatDate(row.date)} {row.day_name ? `(${row.day_name})` : ""}
      </div>
      <div>
        Expected riders: <b>{Math.round(value).toLocaleString()}</b>
      </div>
      {isHoliday && holidayName && (
        <div style={{ marginTop: 4, color: "#c0392b", fontSize: 12 }}>
          🎉 {holidayName}
        </div>
      )}
    </div>
  );
}

export default function RidershipNext7Chart({ predictions, lineNames }) {
  const chartData = useMemo(() => {
    console.log(">> chart useMemo: preds len =", predictions?.length, "lineNames =", lineNames);
    if (!predictions?.length || !lineNames?.length) return [];

    // ---- 1. Normalise line names for fuzzy matching ----
    const normalise = (name) => {
      if (!name) return "";
      const n = name.toLowerCase();

      // Treat Sri Petaling as part of Ampang "family"
      if (n.includes("sri petaling")) return "lrt ampang line";

      // (model uses a single "KTM Komuter Klang Valley" line)
      if (n.includes("ktm")) return "ktm komuter core";
      return n.trim();
    };

    // We will match if station line name *contains* the model line name
    const wanted = lineNames.map(normalise);

    const matchesLine = (p) => {
      const ln = normalise(p.line_name || p.lineName || "");
      if (!ln) return false;

      // exact
      if (wanted.includes(ln)) return true;

      // fuzzy: check key tokens
      return wanted.some((w) => {
        if (!w) return false;
        // e.g. "mrt kajang line" vs "mrt kajang"
        return w.includes(ln) || ln.includes(w);
      });
    };

    // ---- 2. Filter rows for this station's line(s) ----
    const rowsForLine = predictions.filter(matchesLine);
    if (!rowsForLine.length) {
      console.warn("No rows matching lineNames", { lineNames, sample: predictions[0] });
      return [];
    }

    // ---- 3. Sort by date ----
    const sorted = [...rowsForLine].sort((a, b) =>
      String(a.date).localeCompare(String(b.date))
    );

    const todayStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    // Prefer future window: dates >= today
    let future = sorted.filter((r) => String(r.date) >= todayStr);

    // If no future rows (e.g. model horizon ends earlier),
    // fall back to the last 7 available days in the dataset.
    if (future.length === 0) {
      future = sorted.slice(-7);
    } else {
      future = future.slice(0, 7);
    }

    // ---- 4. Aggregate by date (for interchange stations) ----
    const byDate = {};

    for (const r of future) {
      const key = r.date;
      const value =
        r.expected_line_ridership ??
        r.expected_ridership ??
        r.y_hat ??
        0;

      if (!byDate[key]) {
        byDate[key] = {
          date: r.date,
          day_name: r.day_name || r.dow_name || "",
          expected_line_ridership: 0,
          is_holiday:
            r.is_holiday === 1 ||
            r.is_public_holiday === 1 ||
            r.is_holiday === true
              ? 1
              : 0,
          holiday_name:
            r.holiday_name || r.holiday || r.festival_name || "",
        };
      }

      byDate[key].expected_line_ridership += value;

      const isHoliday =
        r.is_holiday === 1 ||
        r.is_public_holiday === 1 ||
        r.is_holiday === true;
      if (isHoliday) {
        byDate[key].is_holiday = 1;
        byDate[key].holiday_name =
          r.holiday_name || r.holiday || r.festival_name || "";
      }
    }
    return Object.values(byDate).sort((a, b) =>
      String(a.date).localeCompare(String(b.date))
    );
  }, [predictions, lineNames]);

  if (!chartData.length) {
    return (
      <p style={{ fontSize: 14, color: "#666" }}>
        No upcoming pattern for this line.
      </p>
    );
  }

  return (
    <div style={{ width: "100%" }}>
      <div
        className="chart-container"
        style={{
          width: "100%",
          height: "180px",
          minWidth: "0",
          minHeight: "0",
          position: "relative",
        }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 10, left: 25, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="day_name"
              tick={{ fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) =>
                value ? value.substring(0, 3) : ""
              }
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
              dataKey="expected_line_ridership"
              stroke="#009645"
              strokeWidth={2}
              dot={{ fill: "#009645", r: 3, strokeWidth: 0 }}
              activeDot={{ r: 5, fill: "#007a38" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div
        style={{
          marginTop: 8,
          fontSize: 12,
          color: "#555",
          lineHeight: 1.4,
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: 4 }}>
          Common patterns (MRT/LRT/Monorail ridership):
        </div>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          <li>
            Ridership is higher on weekdays due to work and school commuting.
          </li>
          <li>
            Ridership is usually lower on public holidays due to reduced commuting.
          </li>
        </ul>
        <div style={{ marginTop: 6 }}>
          Go to{" "}
          <Link to="/insight-board" style={{ color: "#007a38" }}>
            Insight Board
          </Link>{" "}
          for more insights.
        </div>
      </div>
    </div>
  );
}
