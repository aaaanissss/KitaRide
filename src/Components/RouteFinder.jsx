import { useState } from "react";
import { apiFetch } from "../lib/api";

export default function RouteFinder() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!from || !to) return alert("Please enter both source and destination");

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await apiFetch(`/api/shortest-path?from=${from}&to=${to}`);
      const data = await res.json();
      if (res.ok) {
        setResult(data);
      } else {
        setError(data.error || "Failed to fetch route");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 600, margin: "2rem auto", textAlign: "center" }}>
      <h2>Klang Valley Rail Transit BFS Route Finder</h2>
      <form onSubmit={handleSubmit} style={{ marginBottom: "1rem" }}>
        <input
          value={from}
          onChange={(e) => setFrom(e.target.value.toUpperCase())}
          placeholder="From (e.g. KJ1)"
          style={{ padding: "8px", marginRight: "8px" }}
        />
        <input
          value={to}
          onChange={(e) => setTo(e.target.value.toUpperCase())}
          placeholder="To (e.g. AG1)"
          style={{ padding: "8px", marginRight: "8px" }}
        />
        <button
          type="submit"
          style={{ padding: "8px 12px", cursor: "pointer" }}
          disabled={loading}
        >
          {loading ? "Searching..." : "Find Route"}
        </button>
      </form>

      {error && <p style={{ color: "red" }}>❌ {error}</p>}

      {result && (
        <div style={{ textAlign: "left", marginTop: "1rem" }}>
          <h3>Results</h3>
          <p>
            <strong>From:</strong> {result.from} <br />
            <strong>To:</strong> {result.to} <br />
            <strong>Shortest Distance:</strong> {result.distance} stops <br />
            <strong>Number of Routes:</strong> {result.numPaths}
          </p>

          {result.paths?.map((path, i) => (
            <div
              key={i}
              style={{
                border: "1px solid #ccc",
                borderRadius: "8px",
                padding: "8px",
                marginBottom: "8px",
              }}
            >
              <strong>Route {i + 1}:</strong> {path.join(" → ")}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
