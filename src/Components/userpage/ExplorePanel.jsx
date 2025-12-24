import React, { useState, useMemo, useEffect } from "react";
import "./ExplorePanel.css";

// Simple category chips – filter client-side using atrcategory text
const ATTRACTION_CATEGORY_OPTIONS = [
  { id: "ALL", label: "All types" },
  { id: "MALL", label: "Shopping & malls" },
  { id: "FOOD", label: "Food & cafes" },
  { id: "PARK", label: "Parks & outdoor" },
  { id: "MUSEUM", label: "Museums & culture" },
];

export default function ExplorePanel({
  nearestStationFromUser,
  requestUserLocation,
  isLocLoading,
  locError,
  onStationClick,
  allStations = [],
  onAttractionSearchResults,
  onToggleAttractionMarkers,
  onFitAttractions,
  onHighlightAttraction,
}) {
  const [activeTab, setActiveTab] = useState("stations"); // "stations" | "attractions"

  // ---- STATIONS LIST ----
  const stationsList = Array.isArray(allStations) ? allStations : [];

  /*
  useEffect(() => {
    if (!onToggleAttractionMarkers) return;

    if (activeTab === "attractions") {
      // keep behaviour: markers only appear after search
    } else {
      // stations tab – hide attraction markers
      onToggleAttractionMarkers(false);
      if (onAttractionSearchResults) onAttractionSearchResults([]);
    }
  }, [activeTab, onToggleAttractionMarkers, onAttractionSearchResults]);
*/

  // ----- STATIONS TAB -----
  const [stationQuery, setStationQuery] = useState("");

  const filteredStations = useMemo(() => {
    if (!stationsList.length) return [];

    const q = stationQuery.trim().toLowerCase();
    if (!q) return stationsList.slice(0, 50);

    return stationsList
      .filter((s) => {
        const code = (s.stationID || s.stationid || "")
          .toString()
          .toLowerCase();
        const name = (s.stationName || s.stationname || "").toLowerCase();
        return code.includes(q) || name.includes(q);
      })
      .slice(0, 50);
  }, [stationsList, stationQuery]);

  async function loadAttractionsForStationFromExplore(stationId) {
    if (!stationId) return;

    try {
      const res = await fetch(`/api/stations/${stationId}/attractions`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      const attractions = data.attractions || [];

      // ✅ show ONLY these on the map
      if (onAttractionSearchResults) onAttractionSearchResults(attractions);
      if (onToggleAttractionMarkers) onToggleAttractionMarkers(attractions.length > 0);
      if (onFitAttractions && attractions.length > 0) onFitAttractions(attractions);
    } catch (err) {
      console.error("Failed to load attractions for station from ExplorePanel:", err);
      if (onAttractionSearchResults) onAttractionSearchResults([]);
      if (onToggleAttractionMarkers) onToggleAttractionMarkers(false);
    }
  }

  const getStationLatLng = (s) => {
    const lat = Number(s.stationLatitude ?? s.stationlatitude);
    const lng = Number(s.stationLongitude ?? s.stationlongitude);
    return { lat, lng };
  };

  // Ensure station object shape is what HomePage expects
  const handleStationRowClick = async (s) => {
    if (!s) return;

    const stationID = s.stationID || s.stationid;

    const stationForParent = {
      stationID,
      stationName: s.stationName || s.stationname,
      stationLatitude: Number(s.stationLatitude ?? s.stationlatitude),
      stationLongitude: Number(s.stationLongitude ?? s.stationlongitude),
      lines: s.lines || [],
    };

    if (onStationClick) {
      onStationClick(stationForParent);  // parent will pan the map
    }

    // load its nearby attractions and show ONLY those on the map
    await loadAttractionsForStationFromExplore(stationID);
  };

  // Quick lookup by station ID for attraction → station jump
  const stationById = useMemo(() => {
    const map = {};
    for (const s of stationsList) {
      const id = s.stationID || s.stationid;
      if (id && !map[id]) {
        map[id] = s;
      }
    }
    return map;
  }, [stationsList]);

  // ----- ATTRACTIONS TAB -----
  const [attractionQuery, setAttractionQuery] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("ALL");
  const [isSearchingAttractions, setIsSearchingAttractions] = useState(false);
  const [attractionResults, setAttractionResults] = useState([]);
  const [attractionError, setAttractionError] = useState("");

  const categoryFilters = {
    MALL: (c) => /mall|shopping|retail/i.test(c || ""),
    FOOD: (c) => /food|dining|restaurant|cafe|eat/i.test(c || ""),
    PARK: (c) => /park|garden|outdoor|recreation/i.test(c || ""),
    MUSEUM: (c) => /museum|gallery|heritage|history/i.test(c || ""),
  };

  const filteredAttractionResults = useMemo(() => {
    if (!attractionResults.length) return [];
    if (selectedCategoryId === "ALL") return attractionResults;

    const fn = categoryFilters[selectedCategoryId];
    if (!fn) return attractionResults;

    return attractionResults.filter((a) => fn(a.atrcategory || ""));
  }, [attractionResults, selectedCategoryId]);

  async function handleSearchAttractions() {
    try {
      setIsSearchingAttractions(true);
      setAttractionError("");
      setAttractionResults([]);

      const params = new URLSearchParams();

      if (attractionQuery.trim()) params.set("q", attractionQuery.trim());
      if (selectedCategoryId !== "ALL") params.set("category", selectedCategoryId);

      const res = await fetch(`/api/attractions/search?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();

      const arr = Array.isArray(data) ? data : [];
      setAttractionResults(arr);

      if (onAttractionSearchResults) onAttractionSearchResults(arr);
      if (onToggleAttractionMarkers) onToggleAttractionMarkers(true);
      if (onFitAttractions && arr.length > 0) onFitAttractions(arr); // ⭐ auto-fit map

    } catch (err) {
      console.error("Search attractions error:", err);
      setAttractionError("Failed to load attractions. Please try again.");
      setAttractionResults([]);

      if (onAttractionSearchResults) onAttractionSearchResults([]);
      if (onToggleAttractionMarkers) onToggleAttractionMarkers(false);

    } finally {
      setIsSearchingAttractions(false);
    }
  }

  //Clicking an attraction row → fly to attraction + highlight nearest station
  const handleAttractionRowClick = (a) => {
    console.log("▶ attraction row clicked:", a.atrname, a.atrlatitude, a.atrlongitude);

    if (onHighlightAttraction) {
      onHighlightAttraction(a);     // HomePage does zoom + station highlight
    } else if (onFitAttractions) {
      onFitAttractions([a]);        // fallback, just zoom
    }
  };

  return (
    <div className="sidePanel-empty">
      {/* Header */}
      <h3>Explore the network</h3>
      <p>
        Click a station on the map or use the search below to find stations and
        nearby attractions.
      </p>

      {/* Nearest station card */}
      {nearestStationFromUser && (
        <div className="nearestUserCard">
          <div className="nearestUserTitle">Nearest station to you</div>
          <div className="nearestUserName">
            {nearestStationFromUser.stationName} (
            {nearestStationFromUser.stationID})
          </div>
          <div className="nearestUserDistance">
            {Math.round(nearestStationFromUser.distanceMetersFromUser)} m away
          </div>
          <button
            type="button"
            className="nearestUserBtn"
            onClick={() => handleStationRowClick(nearestStationFromUser)}
          >
            View station details
          </button>
          <button
            type="button"
            className="nearestUserRefresh"
            onClick={requestUserLocation}
            disabled={isLocLoading}
          >
            {isLocLoading ? "Updating location…" : "Refresh location"}
          </button>
          {locError && <div className="nearestUserError">{locError}</div>}
        </div>
      )}

      {/* Tabs */}
      <div className="exploreTabs">
        <button
          type="button"
          className={
            "exploreTab" +
            (activeTab === "stations" ? " exploreTab--active" : "")
          }
          onClick={() => setActiveTab("stations")}
        >
          Stations
        </button>
        <button
          type="button"
          className={
            "exploreTab" +
            (activeTab === "attractions" ? " exploreTab--active" : "")
          }
          onClick={() => setActiveTab("attractions")}
        >
          Attractions
        </button>
      </div>

      {/* STATIONS TAB */}
      {activeTab === "stations" && (
        <div className="exploreSection">
          <label className="exploreLabel">Search station</label>
          <input
            type="text"
            className="exploreInput"
            placeholder="Search station name or code…"
            value={stationQuery}
            onChange={(e) => setStationQuery(e.target.value)}
          />

          <div className="exploreList">
            {filteredStations.length === 0 ? (
              <div className="exploreEmptyText">
                No stations match your search.
              </div>
            ) : (
              filteredStations.map((s) => {
                const code = s.stationID || s.stationid;
                const name = s.stationName || s.stationname;
                const lines =
                  s.lines ||
                  s.linename ||
                  s.linename?.split?.("/") ||
                  [];

                return (
                  <button
                    key={code}
                    type="button"
                    className="exploreStationRow"
                    onClick={() => handleStationRowClick(s)}
                  >
                    <div className="exploreStationMain">
                      <span className="exploreStationName">{name}</span>
                      <span className="exploreStationCode">({code})</span>
                    </div>
                    {Array.isArray(lines) && lines.length > 0 && (
                      <div className="exploreStationLines">
                        {lines.map((ln) => (
                          <span
                            key={ln.lineID || ln.lineid || ln}
                            className="exploreStationLineChip"
                          >
                            {ln.lineName || ln.linename || ln}
                          </span>
                        ))}
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ATTRACTIONS TAB */}
      {activeTab === "attractions" && (
        <div className="exploreSection">
          {/* Search box */}
          <label className="exploreLabel">Search attraction</label>
          <input
            type="text"
            className="exploreInput"
            placeholder="Search attraction name…"
            value={attractionQuery}
            onChange={(e) => setAttractionQuery(e.target.value)}
          />

          {/* Category chips */}
          <div className="exploreCategoryRow">
            {ATTRACTION_CATEGORY_OPTIONS.map((cat) => (
              <button
                key={cat.id}
                type="button"
                className={
                  "exploreCategoryChip" +
                  (selectedCategoryId === cat.id
                    ? " exploreCategoryChip--active"
                    : "")
                }
                onClick={() => setSelectedCategoryId(cat.id)}
              >
                {cat.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="btnPrimary exploreSearchBtn"
            onClick={handleSearchAttractions}
            disabled={isSearchingAttractions}
          >
            {isSearchingAttractions ? "Searching…" : "Search attractions"}
          </button>

          {/* Results */}
          <div className="exploreList">
            {attractionError && (
              <div className="exploreErrorText">{attractionError}</div>
            )}

            {!attractionError &&
              !isSearchingAttractions &&
              filteredAttractionResults.length === 0 && (
                <div className="exploreEmptyText">
                  No attractions loaded yet. Try searching.
                </div>
              )}

            {filteredAttractionResults.map((a) => (
              <div
                key={a.atrid}
                className="exploreAttractionRow"
                onClick={() => handleAttractionRowClick(a)} // ⭐ row click
              >
                <div className="exploreAttractionHeader">
                  <span className="exploreAttractionName">{a.atrname}</span>
                  {a.atrcategory && (
                    <span className="exploreAttractionChip">
                      {a.atrcategory}
                    </span>
                  )}
                </div>

                {a.stationname && (
                  <div className="exploreAttractionStation">
                    🚆 {a.stationname} ({a.stationid})
                  </div>
                )}

                {a.averagerating != null && (
                  <div className="exploreAttractionRating">
                    ⭐ {Number(a.averagerating || 0).toFixed(1)} (
                    {a.reviewcount || 0} review
                    {(a.reviewcount || 0) === 1 ? "" : "s"})
                  </div>
                )}

                {a.atraddress && (
                  <div className="exploreAttractionAddress">
                    📍 {a.atraddress}
                  </div>
                )}

                {/* Optional: explicit button still available */}
                {a.stationid && stationById[a.stationid] && (
                  <button
                    type="button"
                    className="attractionReviewTrigger"
                    style={{ marginTop: 6 }}
                    onClick={(e) => handleJumpToAttractionStation(e, a)}
                  >
                    Go to station on map
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}