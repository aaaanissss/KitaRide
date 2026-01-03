import { useEffect } from "react";
import "./PowerBIDashboard.css";
import Footer from "../../Footer.jsx";

const POWERBI_EMBED_URL =
  "https://app.powerbi.com/view?r=eyJrIjoiNTc4MDQ5NmUtZTlmMi00ZmZjLTkxYjktMmY1NDFjNTAzMGM3IiwidCI6ImNkY2JiMGUyLTlmZWEtNGY1NC04NjcwLTY3MjcwNzc5N2FkYSIsImMiOjEwfQ%3D%3D";

export default function PowerBIDashboard() {
  useEffect(() => {
    document.body.classList.add("no-bg", "dashboard-body");
    return () => {
      document.body.classList.remove("no-bg", "dashboard-body");
    };
  }, []);

  return (
    <>
      <div className="powerbi-dashboard">
        <header className="powerbi-dashboard-header">
          <div>
            <h1>PowerBI Dashboard</h1>
            <p>Interactive ridership insights from the KitaRide data.</p>
          </div>
          <span className="powerbi-tag">Interactive PowerBI Report</span>
        </header>

        <main className="powerbi-dashboard-grid">
          {/* ===== PowerBI Embed ===== */}
          <section className="powerbi-card powerbi-card--wide">
            <div className="powerbi-title-wrap">
              <div className="powerbi-title-chip">KitaRide Ridership Insight</div>
              <p className="powerbi-title-sub">
                Live PowerBI report • Optimized for full-screen viewing • Click on
                the Heatmap Value to Filter
              </p>
            </div>

            <div className="powerbi-embed-wrapper">
              <iframe
                title="KitaRide_Ridership_Insight"
                className="powerbi-embed-frame"
                src={POWERBI_EMBED_URL}
                frameBorder="0"
                allowFullScreen
              />
            </div>
          </section>

          {/* ===== NEW: Commuter Recommendations ===== */}
          <section className="powerbi-card powerbi-card--wide">
            <div className="powerbi-title-wrap">
              <div className="powerbi-title-chip">
                Commuter Travel Recommendations
              </div>
              <p className="powerbi-title-sub">
                Suggested best days and periods to commute, based on predicted
                ridership patterns.
              </p>
            </div>

            <div className="powerbi-reco-grid">
              <RecoCard
                title="LRT Kelana Jaya"
                bullets={[
                  "Best on midweek weekdays (Tue–Thu).",
                  "Fridays and October are usually more crowded.",
                ]}
              />

              <RecoCard
                title="MRT Kajang Line"
                bullets={[
                  "Midweek mornings are generally smoother.",
                  "Expect heavier crowds from July to October.",
                ]}
              />

              <RecoCard
                title="LRT Ampang + Sri Petaling"
                bullets={[
                  "Weekdays are consistent; avoid Friday peaks.",
                  "October shows the highest overall demand.",
                ]}
              />

              <RecoCard
                title="MRT Putrajaya Line"
                bullets={[
                  "January–June weekdays are less busy.",
                  "Crowding increases from August onward.",
                ]}
              />

              <RecoCard
                title="KL Monorail"
                bullets={[
                  "Weekday mornings are the most comfortable.",
                  "Late evenings and October are busier.",
                ]}
              />

              <RecoCard
                title="KTM Komuter Klang Valley"
                bullets={[
                  "Usually quiet on normal weekdays.",
                  "Check for special dates when sudden spikes occur.",
                ]}
              />
            </div>

            <div className="powerbi-reco-summary">
              <strong>Overall tip:</strong> For most lines,{" "}
              <strong>midweek weekdays (Tue–Thu)</strong> and{" "}
              <strong>non-peak months</strong> provide a more comfortable commute,
              while <strong>October</strong> tends to be the busiest.
            </div>
          </section>
        </main>
      </div>
      <Footer />
    </>
  );
}

function RecoCard({ title, bullets }) {
  return (
    <div className="powerbi-reco-card">
      <h3 className="powerbi-reco-title">{title}</h3>
      <ul className="powerbi-reco-list">
        {bullets.map((b, i) => (
          <li key={i}>{b}</li>
        ))}
      </ul>
    </div>
  );
}
