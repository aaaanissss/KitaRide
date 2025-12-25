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
          <section className="powerbi-card powerbi-card--wide">
            <div className="powerbi-title-wrap">
              <div className="powerbi-title-chip">KitaRide Ridership Insight</div>
              <p className="powerbi-title-sub">
                Live PowerBI report • Optimized for full-screen viewing • Click on the Heatmap Value to Filter
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
        </main>
      </div>
      <Footer />
    </>
  );
}

