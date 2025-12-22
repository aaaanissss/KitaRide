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

        <ArticleSection title="Not All Lines Behave the Same">
          <LinePersonalityStory lines={insights.line_personalities} />
        </ArticleSection>

        <ArticleSection title="Stability, Not Chaos">
          <AnomaliesStory anomalies={insights.anomalies} />
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
        higher than weekends. But once public holidays arrive — especially
        Thaipusam — familiar patterns break down in surprising ways.
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
 * - keeps language cautious (likely / possible / suggests)
 * - separates “data result” vs “explanation”
 */
function Interpretation({ children }) {
  return (
    <div className="insights-interpretation">
      <div className="insights-interpretation-title">Interpretation (likely reason)</div>
      <div className="insights-interpretation-body">{children}</div>
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
        On a typical week, ridership follows a predictable commuter rhythm. Demand
        concentrates on weekdays and falls sharply over the weekend as routine
        travel slows down.
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

      <Interpretation>
        This weekday-heavy pattern is consistent with <strong>work and school commuting</strong>.
        Weekend demand is lower because many routine trips pause, and travel becomes more
        discretionary (shopping, leisure, social visits).
      </Interpretation>

      <DetailsToggle
        label="Show daily breakdown"
        hideLabel="Hide daily breakdown"
      >
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
        Beyond the weekly cycle, ridership also “breathes” across the calendar.
        Demand softens in the middle months before strengthening again toward the
        later part of the year.
      </p>

      <p className="insights-paragraph">
        The lowest month is{" "}
        <strong>{String(low.month).padStart(2, "0")}</strong> and the highest is{" "}
        <strong>{String(high.month).padStart(2, "0")}</strong>, suggesting a
        mid-year dip followed by a stronger July–October stretch.
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

      <Interpretation>
        This seasonal movement may reflect changes in city activity across the year —
        for example, periods where <strong>routine commuting reduces</strong> (e.g., school
        breaks, travel periods, or fewer office days), followed by months with more
        consistent weekday movement.
      </Interpretation>

      <DetailsToggle
        label="Show month-by-month values"
        hideLabel="Hide month-by-month values"
      >
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

  // helpful for interpretation text
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
        Public holidays consistently change ridership, but the impact varies.
        Major festive periods tend to produce the steepest drops, while a handful
        of dates behave more like “event days” with higher-than-usual travel.
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
        Big picture: holidays usually reduce demand — but a few dates behave like
        event-driven travel days.
      </PullQuote>

      <Interpretation>
        Large drops during major festive holidays are consistent with{" "}
        <strong>reduced commuting</strong> and “balik kampung” travel, where
        people take leave or travel out of Klang Valley.{" "}
        {hasCNY ? (
          <>
            Events like <strong>Chinese New Year</strong> commonly reduce city commuting
            and daily routines, lowering rail usage.
          </>
        ) : null}{" "}
        {hasHariRaya ? (
          <>
            For <strong>Hari Raya</strong>, the reduction is likely driven by leave-taking,
            family travel, and fewer work/school trips.
          </>
        ) : null}{" "}
        {hasNYE || hasVal ? (
          <>
            In contrast, days like{" "}
            {hasNYE ? <strong>New Year’s Eve</strong> : null}
            {hasNYE && hasVal ? " and " : null}
            {hasVal ? <strong>Valentine’s Day</strong> : null}{" "}
            can create more leisure trips (malls, dining, events), increasing ridership.
          </>
        ) : null}
      </Interpretation>

      <DetailsToggle
        label="View full holiday table"
        hideLabel="Hide full holiday table"
      >
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
   SECTION 4 — THAIPUSAM BY LINE (HERO)
======================= */

function ThaipusamStory({ holidayByLine }) {
  const thaipusam = holidayByLine?.thaipusam;
  const linesRaw = thaipusam?.per_line || [];

  // stable order: negatives first, surge last
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
        Most holidays follow the same pattern — ridership drops across nearly every
        rail line. Thaipusam is the exception.
      </p>

      <p className="insights-paragraph">
        The largest drop appears on <strong>{biggestDrop.line_name}</strong>{" "}
        ({biggestDrop.effect_pct.toFixed(1)}%), while{" "}
        <strong>{topSurge.line_name}</strong> spikes sharply at{" "}
        <strong>+{topSurge.effect_pct.toFixed(1)}%</strong>.
      </p>

      <PullQuote>Plot twist: one line surges while the rest drop.</PullQuote>

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

      <Interpretation>
        Thaipusam is strongly destination-driven. The surge is consistent with
        pilgrimage travel toward <strong>Batu Caves</strong>, where KTM Komuter
        provides direct access. Meanwhile, many other lines drop because routine
        commuting reduces and demand concentrates on specific religious routes.
      </Interpretation>

      <DetailsToggle
        label="Show per-line breakdown"
        hideLabel="Hide per-line breakdown"
      >
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
   SECTION 5 — LINE PERSONALITIES
======================= */

function LinePersonalityStory({ lines }) {
  const list = Array.isArray(lines) ? lines : [];

  if (list.length === 0) {
    return (
      <div className="insight-card">
        <h3>Line personalities</h3>
        <p>No line personality data available.</p>
      </div>
    );
  }

  const mostCommuter = list.reduce((a, b) =>
    a.weekday_weekend_ratio > b.weekday_weekend_ratio ? a : b
  );
  const mostBalanced = list.reduce((a, b) =>
    a.weekday_weekend_ratio < b.weekday_weekend_ratio ? a : b
  );

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
      <h3>The network has characters</h3>

      <p className="insights-paragraph">
        Each rail line behaves a little differently. Most are commuter-led, while
        a few serve more balanced, mixed travel needs.
      </p>

      <p className="insights-paragraph">
        The most commuter-heavy line is <strong>{mostCommuter.line_name}</strong>{" "}
        ({mostCommuter.weekday_weekend_ratio.toFixed(2)}×), while the most balanced
        is <strong>{mostBalanced.line_name}</strong> (
        {mostBalanced.weekday_weekend_ratio.toFixed(2)}×).
      </p>

      <PullQuote>
        “Personality” here is simply the weekday vs weekend ratio — higher means
        more commuter-driven behaviour.
      </PullQuote>

      <Interpretation>
        Lines serving major employment corridors tend to show stronger weekday
        dependence (commuter-heavy). More central or leisure-oriented lines can
        look more balanced because trips include shopping, tourism, and social travel
        across both weekdays and weekends.
      </Interpretation>

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
    </div>
  );
}

/* =======================
   SECTION 6 — ANOMALIES
======================= */

function AnomaliesStory({ anomalies }) {
  const list = Array.isArray(anomalies) ? anomalies : [];

  return (
    <div className="insight-card">
      <h3>Stability, not chaos</h3>

      {list.length === 0 ? (
        <>
          <p className="insights-paragraph">
            Despite seasonal shifts and holiday disruptions, extreme anomalies are
            rare. Overall demand remains stable when compared against surrounding
            trends.
          </p>

          <Interpretation>
            This suggests ridership is largely explained by predictable factors
            (weekday rhythm, seasonality, and holidays), rather than frequent
            sudden disruptions.
          </Interpretation>

          <PullQuote>
            Good news: no extreme outliers were detected in the period analysed.
          </PullQuote>
        </>
      ) : (
        <>
          <p className="insights-paragraph">
            A small number of dates show unusual spikes or dips compared to the
            surrounding 30-day trend.
          </p>

          <Interpretation>
            These outliers may reflect special events, disruptions, or unusual
            circumstances that are not captured by typical calendar patterns.
          </Interpretation>

          <DetailsToggle label="Show unusual days" hideLabel="Hide unusual days">
            <ul className="insight-list">
              {list.map((a) => (
                <li key={a.date}>
                  <span>{a.date}</span>
                  <span>
                    z = {a.z_score_30.toFixed(2)} •{" "}
                    {a.total_ridership.toLocaleString()} trips
                  </span>
                </li>
              ))}
            </ul>
          </DetailsToggle>
        </>
      )}
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
          happens when the network behaves differently — and why.
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
