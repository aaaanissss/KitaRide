// src/components/InsightBoard.jsx
import { useEffect, useMemo, useState } from "react";
import Header from "./Header";
import Footer from "../../Footer.jsx";
import "./InsightBoard.css";

import {
  ResponsiveContainer,
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
        if (!res.ok) throw new Error("Failed to load insights: " + res.status);
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
      <main className="insights-page insights-article">
        <ArticleHero />

        <ArticleSection title="A Week Built Around Work">
          <WeeklyStory weekly={insights.weekly_pattern} />
        </ArticleSection>

        <ArticleSection title="The Year Breathes">
          <SeasonalityStory seasonality={insights.seasonality} />
        </ArticleSection>

        <ArticleSection title="When Holidays Bend the Network">
          <HolidayStory holidays={insights.holiday_effect_overall} />
        </ArticleSection>

        <ArticleSection title="One Day That Flips the Network">
          <ThaipusamStory holidayByLine={insights.holiday_effect_by_line} />
        </ArticleSection>

        {/* ✅ COMBINED SECTION */}
        <ArticleSection title="Different Lines, Predictable Patterns">
          <LinesAndStabilityStory
            lines={insights.line_personalities}
            anomalies={insights.anomalies}
          />
        </ArticleSection>

        <ArticleConclusion />
      </main>
      <Footer />
    </>
  );
}

/* =======================
   ARTICLE WRAPPERS
======================= */

function ArticleHero() {
  return (
    <div className="insights-hero">
      <h1>Klang Valley Rail Ridership Is Still a Weekday Story</h1>
      <p className="insights-lede">
        Weekday commuting continues to dominate the rail network, with demand far
        higher than weekends. But once public holidays arrive familiar patterns break down in surprising ways.
      </p>
    </div>
  );
}

function ArticleSection({ title, children }) {
  return (
    <section className="insights-section insights-article-section">
      <h2>{title}</h2>
      <div className="insights-article-body">{children}</div>
    </section>
  );
}

function PullQuote({ children }) {
  return <blockquote className="insights-pull-quote">{children}</blockquote>;
}

/**
 * FYP-safe interpretation box:
 * - cautious language (likely / suggests)
 * - easy to read: bullets
 */
function Interpretation({ title = "Interpretation (likely reason)", bullets = [] }) {
  if (!bullets?.length) return null;

  return (
    <div className="insights-interpretation">
      <div className="insights-interpretation-title">{title}</div>
      <ul className="insights-bullets">
        {bullets.map((b, i) => (
          <li key={i}>{b}</li>
        ))}
      </ul>
    </div>
  );
}

function DetailsToggle({
  label = "Show details",
  hideLabel = "Hide details",
  children,
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="insights-details">
      <button
        type="button"
        className="insights-details-toggle"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? hideLabel : label}
      </button>
      {open && <div className="insights-details-content">{children}</div>}
    </div>
  );
}

/* =======================
   SECTION 1 — WEEKLY
======================= */

function WeeklyStory({ weekly }) {
  const { by_day, avg_weekday, avg_weekend, weekday_weekend_ratio } = weekly || {};

  if (!by_day || by_day.length === 0) {
    return (
      <div className="insight-card">
        <h3>Weekly rhythm</h3>
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
      <h3>What a “normal week” looks like</h3>

      <p className="insights-paragraph">
        On a typical week, ridership follows a predictable rhythm: weekdays are
        busy, and weekends are quieter.
      </p>

      <p className="insights-paragraph">
        Weekdays average{" "}
        <strong>{Math.round(avg_weekday).toLocaleString()}</strong> trips, while
        weekends drop to{" "}
        <strong>{Math.round(avg_weekend).toLocaleString()}</strong>. The busiest
        day is <strong>{DAY_LABELS[busiest.dow]}</strong>, and the quietest is{" "}
        <strong>{DAY_LABELS[quietest.dow]}</strong>.
      </p>

      <PullQuote>
        Key takeaway: weekdays are{" "}
        <strong>{weekday_weekend_ratio.toFixed(2)}×</strong> busier than weekends.
      </PullQuote>

      <div className="insight-chart">
        <ResponsiveContainer width="100%" height={240}>
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

      <Interpretation
        bullets={[
          <>
            Weekdays are higher because many people travel for <strong>work and school</strong>.
          </>,
          <>
            Weekends are lower because <strong>daily routines slow down</strong> (more leisure trips).
          </>,
        ]}
      />

      <DetailsToggle label="Show daily breakdown" hideLabel="Hide daily breakdown">
        <ul className="insight-list">
          {by_day.map((d) => (
            <li key={d.dow}>
              <span>{DAY_LABELS[d.dow]}</span>
              <span>{Math.round(d.avg_ridership).toLocaleString()} trips</span>
            </li>
          ))}
        </ul>
      </DetailsToggle>
    </div>
  );
}

/* =======================
   SECTION 2 — SEASONALITY
======================= */

function SeasonalityStory({ seasonality }) {
  const byMonth = seasonality?.by_month || [];

  if (byMonth.length === 0) {
    return (
      <div className="insight-card">
        <h3>Seasonality</h3>
        <p>No seasonality data available.</p>
      </div>
    );
  }

  const low = byMonth.reduce((a, b) =>
    a.avg_ridership < b.avg_ridership ? a : b
  );
  const high = byMonth.reduce((a, b) =>
    a.avg_ridership > b.avg_ridership ? a : b
  );

  return (
    <div className="insight-card">
      <h3>Ridership changes across the year</h3>

      <p className="insights-paragraph">
        Ridership also changes across the year, with some months quieter and some
        months busier.
      </p>

      <p className="insights-paragraph">
        The lowest month is{" "}
        <strong>{String(low.month).padStart(2, "0")}</strong> and the highest is{" "}
        <strong>{String(high.month).padStart(2, "0")}</strong>.
      </p>

      <PullQuote>
        Seasonal summary: demand tends to soften around April–June, then strengthens
        into July–October.
      </PullQuote>

      <div className="insight-chart">
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={byMonth}>
            <XAxis
              dataKey="month"
              tickFormatter={(m) => String(m).padStart(2, "0")}
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
              labelFormatter={(m) => `Month ${String(m).padStart(2, "0")}`}
            />
            <Line type="monotone" dataKey="avg_ridership" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <Interpretation
        bullets={[
          "Mid-year dips may happen when commuting reduces (e.g., school breaks or travel periods).",
          "Ridership rises again when normal routines return in later months.",
          "Hypothesis: April is quieter when routines slow down (holidays, leave, Ramadan in SOME years), while October is busier when work and school schedules are most consistent."
        ]}
      />

      <DetailsToggle label="Show month-by-month values" hideLabel="Hide month-by-month values">
        <ul className="insight-list">
          {byMonth.map((m) => (
            <li key={m.month}>
              <span>{String(m.month).padStart(2, "0")}</span>
              <span>{Math.round(m.avg_ridership).toLocaleString()} trips</span>
            </li>
          ))}
        </ul>
      </DetailsToggle>
    </div>
  );
}

/* =======================
   SECTION 3 — HOLIDAYS OVERALL
======================= */

function HolidayStory({ holidays }) {
  const items = Object.values(holidays || {})
    .filter(
      (h) => h?.has_data && h.effect_pct !== null && Number.isFinite(h.effect_pct)
    )
    .sort((a, b) => a.effect_pct - b.effect_pct); // biggest drop first

  const biggestDrops = items.slice(0, 5);
  const biggestIncreases = [...items]
    .sort((a, b) => b.effect_pct - a.effect_pct)
    .slice(0, 3);

  const hasHariRaya =
    items.find((x) => /Hari Raya Puasa/i.test(x.label)) ||
    items.find((x) => /Hari Raya Haji/i.test(x.label));
  const hasCNY = items.find((x) => /Chinese New Year/i.test(x.label));
  const hasNYE = items.find((x) => /New Year's Eve/i.test(x.label));
  const hasVal = items.find((x) => /Valentine/i.test(x.label));

  return (
    <div className="insight-card">
      <h3>Holidays bend the baseline</h3>

      <p className="insights-paragraph">
        Holidays change travel behaviour. Most holidays reduce commuting, but some
        special days increase leisure trips.
      </p>

      <div className="insights-two-col">
        <div>
          <h4 className="insights-minihead">Biggest drops</h4>
          <ul className="insight-list">
            {biggestDrops.map((h) => (
              <li key={h.label}>
                <span>{h.label}</span>
                <span>{h.effect_pct.toFixed(1)}%</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="insights-minihead">Unexpected increases</h4>
          <ul className="insight-list">
            {biggestIncreases.map((h) => (
              <li key={h.label}>
                <span>{h.label}</span>
                <span>
                  {h.effect_pct > 0 ? "+" : ""}
                  {h.effect_pct.toFixed(1)}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <PullQuote>
        Key takeaway: most holidays reduce ridership, but event-style days can
        increase it.
      </PullQuote>

      <Interpretation
        bullets={[
          "Big festive holidays often drop because fewer people commute and many travel (“balik kampung”).",
          hasCNY ? "Chinese New Year usually lowers city travel because routines pause." : null,
          hasHariRaya ? "Hari Raya tends to drop because people take leave and travel out of the city." : null,
          (hasNYE || hasVal)
            ? "Days like New Year’s Eve or Valentine’s Day may rise due to leisure trips (malls, dining, events)."
            : null,
        ].filter(Boolean)}
      />

      <DetailsToggle label="View full holiday table" hideLabel="Hide full holiday table">
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
      </DetailsToggle>
    </div>
  );
}

/* =======================
   SECTION 4 — THAIPUSAM BY LINE
======================= */

function ThaipusamStory({ holidayByLine }) {
  const thaipusam = holidayByLine?.thaipusam;
  const linesRaw = thaipusam?.per_line || [];

  const lines = linesRaw
    .slice()
    .sort((a, b) => a.effect_pct - b.effect_pct)
    .map((l, idx) => ({
      ...l,
      idx,
      short: shortenLineName(l.line_name),
    }));

  if (lines.length === 0) {
    return (
      <div className="insight-card">
        <h3>Thaipusam</h3>
        <p>No Thaipusam per-line effect data available.</p>
      </div>
    );
  }

  const topSurge = lines.reduce((a, b) => (a.effect_pct > b.effect_pct ? a : b));
  const biggestDrop = lines.reduce((a, b) => (a.effect_pct < b.effect_pct ? a : b));

  return (
    <div className="insight-card">
      <h3>Thaipusam rewrites the map</h3>

      <p className="insights-paragraph">
        Thaipusam is different from most holidays: one line can become much busier
        while others drop.
      </p>

      <p className="insights-paragraph">
        The largest drop appears on <strong>{biggestDrop.line_name}</strong>{" "}
        ({biggestDrop.effect_pct.toFixed(1)}%), while{" "}
        <strong>{topSurge.line_name}</strong> spikes at{" "}
        <strong>+{topSurge.effect_pct.toFixed(1)}%</strong>.
      </p>

      <div className="insight-chart">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={lines}>
            <XAxis
              dataKey="idx"
              tickFormatter={(i) => lines[i]?.short ?? ""}
              interval={0}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v) => `${Math.round(v)}%`}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              formatter={(value) => `${Number(value).toFixed(1)}%`}
              labelFormatter={(idx) => lines[idx]?.line_name ?? "Line"}
            />
            <Line
              type="monotone"
              dataKey="effect_pct"
              stroke="#4A73FF"
              strokeWidth={3}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <Interpretation
        bullets={[
          "Thaipusam is destination-based travel (many people go to Batu Caves).",
          "KTM Komuter provides direct access, so it can surge while other lines become quieter.",
        ]}
      />

      <DetailsToggle label="Show per-line breakdown" hideLabel="Hide per-line breakdown">
        <ul className="insight-list">
          {lines
            .slice()
            .sort((a, b) => b.effect_pct - a.effect_pct)
            .map((l) => (
              <li key={l.line_code}>
                <span>{l.line_name}</span>
                <span>
                  {l.effect_pct > 0 ? "+" : ""}
                  {l.effect_pct.toFixed(1)}%
                </span>
              </li>
            ))}
        </ul>
      </DetailsToggle>
    </div>
  );
}

function shortenLineName(name) {
  return name
    .replace("KTM Komuter Klang Valley", "KTM Komuter")
    .replace("LRT Ampang + Sri Petaling", "LRT Ampang/SP")
    .replace("MRT Putrajaya Line", "MRT Putrajaya")
    .replace("MRT Kajang Line", "MRT Kajang")
    .replace("LRT Kelana Jaya", "LRT KJ")
    .replace("KL Monorail", "Monorail");
}

/* =======================
  COMBINED STORY — LINES + STABILITY
======================= */

function LinesAndStabilityStory({ lines, anomalies }) {
  const list = Array.isArray(lines) ? lines : [];
  const anom = Array.isArray(anomalies) ? anomalies : [];

  const mostCommuter = list.length
    ? list.reduce((a, b) =>
        a.weekday_weekend_ratio > b.weekday_weekend_ratio ? a : b
      )
    : null;

  const mostBalanced = list.length
    ? list.reduce((a, b) =>
        a.weekday_weekend_ratio < b.weekday_weekend_ratio ? a : b
      )
    : null;

  const grouped = useMemo(() => {
    const map = new Map();
    for (const l of list) {
      const tag = l.personality_tag || "Other";
      if (!map.has(tag)) map.set(tag, []);
      map.get(tag).push(l);
    }
    return Array.from(map.entries());
  }, [lines]);

  return (
    <div className="insight-card">
      <h3>Different lines, but the network is steady</h3>

      <p className="insights-paragraph">
        Not all rail lines are used the same way. Some are mostly used for
        weekday commuting, while others are more balanced for daily activities.
      </p>

      {mostCommuter && mostBalanced ? (
        <PullQuote>
          Most commuter-heavy: <strong>{mostCommuter.line_name}</strong> (
          {mostCommuter.weekday_weekend_ratio.toFixed(2)}×) • Most balanced:{" "}
          <strong>{mostBalanced.line_name}</strong> (
          {mostBalanced.weekday_weekend_ratio.toFixed(2)}×)
        </PullQuote>
      ) : null}

      {grouped.map(([tag, group]) => (
        <div className="insight-pill-group" key={tag}>
          <h4>{tag}</h4>
          <p>
            {group
              .slice()
              .sort((a, b) => b.weekday_weekend_ratio - a.weekday_weekend_ratio)
              .map((l) => `${l.line_name} (${l.weekday_weekend_ratio.toFixed(2)}×)`)
              .join(", ") || "—"}
          </p>
        </div>
      ))}

      <Interpretation
        title="Simple conclusion"
        bullets={[
          "Commuter-heavy lines serve work/school corridors, so weekdays are much busier.",
          "More central lines stay busier across the week because they serve shopping and leisure trips.",
          anom.length === 0
            ? "Overall demand is stable, with no extreme outliers were detected in the analysed period."
            : "Overall demand is mostly stable, with only a small number of unusual days.",
        ]}
      />
    </div>
  );
}

/* =======================
   CONCLUSION
======================= */

function ArticleConclusion() {
  return (
    <section className="insights-section insights-article-section">
      <h2>Why These Patterns Matter</h2>
      <div className="insight-card">
        <p className="insights-paragraph">
          Understanding the “normal” helps planners and passengers interpret what
          happens when the network behaves differently and why.
        </p>

        <ul className="insights-bullets">
          <li>
            <strong>Operations:</strong> Friday tends to peak; mid-year months can
            soften; Thaipusam may require special readiness on Komuter corridors.
          </li>
          <li>
            <strong>Commuters:</strong> Sundays are typically quietest; holiday
            travel can reshape which lines get crowded.
          </li>
          <li>
            <strong>Forecasting:</strong> Weekday dominance provides a strong
            baseline signal for predicting demand shifts.
          </li>
        </ul>
      </div>
    </section>
  );
}
