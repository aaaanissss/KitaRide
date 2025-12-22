// src/components/InsightBoard.jsx
import { useEffect, useState } from "react";
import Header from "./Header";
import Footer from "../../Footer.jsx";
import "./InsightBoard.css";

// ✅ NEW: Recharts imports
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  LineChart,
  Line,
} from "recharts";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function InsightBoard() {
  const [insights, setInsights] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch("/api/ridership/insights-overview")
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to load insights: " + res.status);
        }
        return res.json();
      })
      .then(setInsights)
      .catch((err) => {
        console.error(err);
        setError("Failed to load insights");
      });
  }, []);

  if (error)
    return (
      <>
        <Header />
        <main className="insights-page">
          <div className="insights-error">{error}</div>
        </main>
      </>
    );

  if (!insights)
    return (
      <>
        <Header />
        <main className="insights-page">
          <div className="insights-loading">Loading insights…</div>
        </main>
      </>
    );

  return (
    <>
      <Header />
      <main className="insights-page">
        {/* Page hero like KTM Dashboard */}
        <div className="insights-hero">
          <h1>Transit Ridership Insight Board</h1>
          <p>
            Story-style overview of historical demand patterns across Klang
            Valley’s rail network — weekdays vs weekends, holiday effects, line
            behaviour and unusual days.
          </p>
        </div>

        {/* Section 1: Weekly + Seasonal */}
        <section className="insights-section">
          <h2>Network Rhythm</h2>
          <div className="insights-grid">
            <WeeklyVsWeekendCard weekly={insights.weekly_pattern} />
            <SeasonalityCard seasonality={insights.seasonality} />
          </div>
        </section>

        {/* Section 2: Holidays */}
        <section className="insights-section">
          <h2>Holiday Effects</h2>
          <div className="insights-grid">
            <HolidayOverallCard holidays={insights.holiday_effect_overall} />
            <HolidayByLineCard holidayByLine={insights.holiday_effect_by_line} />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function WeeklyVsWeekendCard({ weekly }) {
  const { by_day, avg_weekday, avg_weekend, weekday_weekend_ratio } = weekly;

  if (!by_day || by_day.length === 0) {
    return (
      <div className="insight-card">
        <h3>Weekday vs Weekend</h3>
        <p>No weekly pattern data available.</p>
      </div>
    );
  }

  const busiest = by_day.reduce((a, b) =>
    a.avg_ridership > b.avg_ridership ? a : b
  );
  const quietest = by_day.reduce((a, b) =>
    a.avg_ridership < b.avg_ridership ? a : b
  );

  return (
    <div className="insight-card">
      <h3>Weekday vs Weekend</h3>
      <p className="insight-kpi">
        Weekdays are <strong>{weekday_weekend_ratio.toFixed(2)}×</strong> busier
        than weekends.
      </p>
      <p className="insight-sub">
        Busiest: <strong>{DAY_LABELS[busiest.dow]}</strong> • Quietest:{" "}
        <strong>{DAY_LABELS[quietest.dow]}</strong>
      </p>

      {/* 📈 NEW: Line chart */}
      <div className="insight-chart">
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={by_day}>
            <XAxis
              dataKey="dow"
              tickFormatter={(d) => DAY_LABELS[d]}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v) => Math.round(v / 1000) + "k"}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              formatter={(value) =>
                Math.round(value).toLocaleString() + " trips"
              }
              labelFormatter={(idx) => DAY_LABELS[idx]}
            />
            <Line
              type="monotone"
              dataKey="avg_ridership"
              stroke="#4A73FF"
              strokeWidth={3}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <ul className="insight-list">
        {by_day.map((d) => (
          <li key={d.dow}>
            <span>{DAY_LABELS[d.dow]}</span>
            <span>{Math.round(d.avg_ridership).toLocaleString()} trips</span>
          </li>
        ))}
      </ul>

      <p className="insight-story">
        A clear weekly cycle emerges — strong weekday commuting with{" "}
        <strong>{DAY_LABELS[busiest.dow]}</strong> at the peak, followed by a
        sharp weekend drop.
      </p>
    </div>
  );
}

function HolidayOverallCard({ holidays }) {
  const items = Object.values(holidays)
    .filter((h) => h.has_data && h.effect_pct !== null)
    .sort((a, b) => a.effect_pct - b.effect_pct); // biggest drop first

  return (
    <div className="insight-card">
      <h3>Holiday Impact (Network)</h3>
      <ul className="insight-list">
        {items.map((h) => (
          <li key={h.label}>
            <span>{h.label}</span>
            <span>
              {h.effect_pct > 0 ? "+" : ""}
              {h.effect_pct.toFixed(1)}%
            </span>
          </li>
        ))}
      </ul>
      <p className="insight-story">
        Major holidays like Chinese New Year, Thaipusam and Hari Raya produce
        the biggest ridership drops, while Christmas has a much smaller impact.
      </p>
    </div>
  );
}

function LinePersonalityCard({ lines }) {
  const commuterLines = lines.filter(
    (l) => l.personality_tag === "Weekday commuter-heavy"
  );
  const balancedLines = lines.filter(
    (l) => l.personality_tag === "Balanced usage"
  );
  const weekendLines = lines.filter(
    (l) => l.personality_tag === "Weekend / leisure-oriented"
  );

  return (
    <div className="insight-card">
      <h3>Line Personalities</h3>

      <div className="insight-pill-group">
        <h4>Weekday commuter lines</h4>
        <p>{commuterLines.map((l) => l.line_name).join(", ") || "—"}</p>
      </div>

      <div className="insight-pill-group">
        <h4>Weekend / leisure</h4>
        <p>{weekendLines.map((l) => l.line_name).join(", ") || "—"}</p>
      </div>

      <div className="insight-pill-group">
        <h4>Balanced</h4>
        <p>{balancedLines.map((l) => l.line_name).join(", ") || "—"}</p>
      </div>

      <p className="insight-story">
        Kelana Jaya, Ampang, MRT Kajang/Putrajaya and KTM Komuter Klang Valley
        behave like classic weekday commuter lines, while Monorail is more
        balanced between weekdays and weekends.
      </p>
    </div>
  );
}

function AnomaliesCard({ anomalies }) {
  return (
    <div className="insight-card">
      <h3>Unusual Days</h3>
      {(!anomalies || anomalies.length === 0) ? (
        <p>No extreme anomalies detected.</p>
      ) : (
        <ul className="insight-list">
          {anomalies.map((a) => (
            <li key={a.date}>
              <span>{a.date}</span>
              <span>
                z = {a.z_score_30.toFixed(2)} •{" "}
                {a.total_ridership.toLocaleString()} trips
              </span>
            </li>
          ))}
        </ul>
      )}
      <p className="insight-story">
        Only a handful of days show extreme spikes or drops compared to the
        surrounding 30-day trend.
      </p>
    </div>
  );
}

function SeasonalityCard({ seasonality }) {
  const byMonth = seasonality.by_month || [];

  if (byMonth.length === 0) {
    return (
      <div className="insight-card">
        <h3>Seasonal Pattern</h3>
        <p>No seasonality data available.</p>
      </div>
    );
  }

  return (
    <div className="insight-card">
      <h3>Seasonal Pattern</h3>

      {/* 📈 NEW: Line chart for month-by-month pattern */}
      <div className="insight-chart">
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={byMonth}>
            <XAxis
              dataKey="month"
              tickFormatter={(m) => m.toString().padStart(2, "0")}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v) => Math.round(v / 1000) + "k"}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              formatter={(value) =>
                Math.round(value).toLocaleString() + " trips"
              }
              labelFormatter={(m) => `Month ${m.toString().padStart(2, "0")}`}
            />
            <Line
              type="monotone"
              dataKey="avg_ridership"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <ul className="insight-list">
        {byMonth.map((m) => (
          <li key={m.month}>
            <span>{m.month.toString().padStart(2, "0")}</span>
            <span>{Math.round(m.avg_ridership).toLocaleString()} trips</span>
          </li>
        ))}
      </ul>
      <p className="insight-story">
        Ridership tends to soften in April–June and strengthens again in
        July–October.
      </p>
    </div>
  );
}

function HolidayByLineCard({ holidayByLine }) {
  const thaipusam = holidayByLine.thaipusam;
  const lines = (thaipusam?.per_line || []).sort(
    (a, b) => b.effect_pct - a.effect_pct
  );

  return (
    <div className="insight-card">
      <h3>Which Lines Change the Most on Thaipusam?</h3>

      <ul className="insight-list">
        {lines.map((l) => (
          <li key={l.line_code}>
            <span>{l.line_name}</span>
            <span>
              {l.effect_pct > 0 ? "+" : ""}
              {l.effect_pct.toFixed(1)}%
            </span>
          </li>
        ))}
      </ul>

      <p className="insight-story">
        Thaipusam creates a unique travel pattern:{" "}
        <strong>KTM Komuter Klang Valley experiences a massive surge</strong>,
        especially toward Batu Caves, while most LRT and MRT lines show{" "}
        <strong>significant drops</strong> as commuters shift toward religious
        routes.
      </p>
    </div>
  );
}
