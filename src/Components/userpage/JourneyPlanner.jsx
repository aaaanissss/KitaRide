import { useState, useMemo, useEffect } from "react";
import { FaExchangeAlt, FaSearch } from "react-icons/fa";
import "./JourneyPlanner.css";
import { apiFetch } from "../../lib/api";

const stationTypes = ["LRT", "MRT", "Monorail", "ERL", "KTM"];

// Map UI transit type -> line IDs in your DB
const TYPE_LINE_IDS = {
  LRT: ["3", "4", "5"],          // Ampang, Sri Petaling, Kelana Jaya
  MRT: ["9", "12"],              // MRT Kajang, MRT Putrajaya
  Monorail: ["8"],               // KL Monorail
  ERL: [],                       // fill if/when you add ERL
  KTM: ["1", "2", "10"],         // KTM Komuter etc.
};

// convenience: lineID -> "LRT" / "MRT" / ...
const LINE_SYSTEM_BY_ID = {};
Object.entries(TYPE_LINE_IDS).forEach(([system, ids]) => {
  ids.forEach((id) => {
    LINE_SYSTEM_BY_ID[String(id)] = system;
  });
});

export default function JourneyPlanner({
  onRouteFound,
  onRouteSelect,
  selectedRouteIdx,
  stations = [], // from HomePage
  heatmapOn = false, 
  isInfoPanelOpen = false,
  onRequestCloseInfoPanel,
}) {
  const [expanded, setExpanded] = useState(false);
  const [showResults, setShowResults] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  // what user sees in the inputs
  const [fromInput, setFromInput] = useState("");
  const [toInput, setToInput] = useState("");

  // actual station IDs we send to backend
  const [fromStationId, setFromStationId] = useState("");
  const [toStationId, setToStationId] = useState("");

  const [fromType, setFromType] = useState("LRT");
  const [toType, setToType] = useState("LRT");

  // for header chip in results panel
  const [lastQueryFromName, setLastQueryFromName] = useState("");
  const [lastQueryToName, setLastQueryToName] = useState("");
  const [lastQueryFromType, setLastQueryFromType] = useState("");
  const [lastQueryToType, setLastQueryToType] = useState("");

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // suggestion lists
  const [fromSuggestions, setFromSuggestions] = useState([]);
  const [toSuggestions, setToSuggestions] = useState([]);

  // which route card is expanded
  const [expandedRouteIdx, setExpandedRouteIdx] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(max-width: 768px)");
    const update = () => setIsMobile(media.matches);
    update();
    if (media.addEventListener) {
      media.addEventListener("change", update);
      return () => media.removeEventListener("change", update);
    }
    media.addListener(update);
    return () => media.removeListener(update);
  }, []);

  useEffect(() => {
    if (!result) return;
    if (!isMobile) {
      setShowResults(true);
      return;
    }
    if (isInfoPanelOpen) {
      setShowResults(false);
    } else {
      setShowResults(true);
    }
  }, [isInfoPanelOpen, isMobile, result]);

  // ---------- lookup maps from stations ----------

  const stationNameById = useMemo(() => {
    const map = {};
    (stations || []).forEach((st) => {
      map[st.stationID] = st.stationName;
    });
    return map;
  }, [stations]);

  const lineMetaById = useMemo(() => {
    const meta = {};
    (stations || []).forEach((st) => {
      (st.lines || []).forEach((l) => {
        const idStr = String(l.lineID);
        if (!meta[idStr]) {
          meta[idStr] = {
            lineName: l.lineName,
            color: l.lineColourHex,
          };
        }
      });
    });
    return meta;
  }, [stations]);

  const stationSystemsById = useMemo(() => {
    const map = {};
    (stations || []).forEach((st) => {
      const systems = new Set();
      (st.lines || []).forEach((l) => {
        const sys = LINE_SYSTEM_BY_ID[String(l.lineID)];
        if (sys) systems.add(sys);
      });
      map[st.stationID] = Array.from(systems); // e.g. ["LRT", "Monorail"]
    });
    return map;
  }, [stations]);

  const nameOf = (stationID) =>
    stationNameById[stationID] || stationID || "";

  /*
  const nameOf = (stationID) =>
    stationNameById[stationID] || stationID || "";
  */
  // Build grouped “legs” of a path: each leg = same lineID in a row
  function buildLegs(path) {
    if (!path || path.length < 2) return [];

    const legs = [];
    let currentLineId = path[1].lineID;
    let startIndex = 0;

    for (let i = 1; i < path.length; i++) {
      const step = path[i];
      const prev = path[i - 1];

      const lineId = step.lineID;

      const lineChanged =
        lineId !== currentLineId ||
        step.connectionType === "interchange";

      if (lineChanged) {
        // push previous leg (if any)
        if (i - 1 > startIndex) {
          const fromStationID = path[startIndex].stationID;
          const toStationID = path[i - 1].stationID;
          const numStops = i - 1 - startIndex;

          const meta = lineMetaById[String(currentLineId)] || {};
          legs.push({
            lineID: currentLineId,
            lineName: meta.lineName || (currentLineId ? `Line ${currentLineId}` : "Interchange"),
            color: meta.color || "#111827",
            fromStationID,
            toStationID,
            numStops,
          });
        }

        currentLineId = lineId;
        startIndex = i - 1;
      }
    }

    // last leg
    const lastIndex = path.length - 1;
    if (lastIndex > startIndex) {
      const meta = lineMetaById[String(currentLineId)] || {};
      legs.push({
        lineID: currentLineId,
        lineName: meta.lineName || (currentLineId ? `Line ${currentLineId}` : "Interchange"),
        color: meta.color || "#111827",
        fromStationID: path[startIndex].stationID,
        toStationID: path[lastIndex].stationID,
        numStops: lastIndex - startIndex,
      });
    }

    return legs;
  }

  // ---------- suggestion helpers ----------
  function filterStations(query, type) {
    if (!stations || stations.length === 0) return [];

    const trimmed = query.trim().toLowerCase();
    const lineIds = TYPE_LINE_IDS[type] || [];

    return stations
      .filter((st) => {
        const matchesType =
          lineIds.length === 0 ||
          st.lines?.some((l) => lineIds.includes(String(l.lineID)));
        if (!matchesType) return false;

        if (!trimmed) return true;

        const code = String(st.stationID || "").toLowerCase();
        const name = String(st.stationName || "").toLowerCase();

        return code.includes(trimmed) || name.includes(trimmed);
      })
      .slice(0, 10);
  }

  function handleFromChange(value) {
    setFromInput(value);
    setFromStationId("");
    setFromSuggestions(filterStations(value, fromType));
  }

  function handleToChange(value) {
    setToInput(value);
    setToStationId("");
    setToSuggestions(filterStations(value, toType));
  }

  function selectFromStation(st) {
    const label = `${fromType} ${st.stationName}`;
    setFromInput(label);
    setFromStationId(st.stationID);
    setFromSuggestions([]);
  }

  function selectToStation(st) {
    const label = `${toType} ${st.stationName}`;
    setToInput(label);
    setToStationId(st.stationID);
    setToSuggestions([]);
  }

  function handleFromTypeChange(e) {
    const newType = e.target.value;
    setFromType(newType);
    if (fromInput) {
      setFromSuggestions(filterStations(fromInput, newType));
    } else {
      setFromSuggestions([]);
    }
  }

  function handleToTypeChange(e) {
    const newType = e.target.value;
    setToType(newType);
    if (toInput) {
      setToSuggestions(filterStations(toInput, newType));
    } else {
      setToSuggestions([]);
    }
  }

  // ---------- search + swap ----------

  async function handleSearch(e) {
    e.preventDefault();

    if (!fromStationId || !toStationId) {
      alert("Please pick both stations from the suggestions.");
      return;
    }

    setLoading(true);
    setError(null);
    setFromSuggestions([]);
    setToSuggestions([]);

    try {
      const res = await apiFetch(
        `/api/shortest-path?from=${fromStationId}&to=${toStationId}` +
          `&fromType=${fromType}&toType=${toType}`
      );
      const data = await res.json();
      console.log("shortest-path response:", data);

      if (res.ok) {
        setResult(data);
        if (onRouteFound) onRouteFound(data);

        setLastQueryFromName(fromInput);
        setLastQueryToName(toInput);
        setLastQueryFromType(fromType);
        setLastQueryToType(toType);

        setExpanded(false);
        setExpandedRouteIdx(0);
      } else {
        setError(data.error || "Failed to fetch route");
      }
    } catch (err) {
      setError(err.message || "Network error");
    } finally {
      setLoading(false);
    }
  }

  function swapStations() {
    const tempInput = fromInput;
    const tempId = fromStationId;
    const tempType = fromType;

    setFromInput(toInput);
    setFromStationId(toStationId);
    setFromType(toType);

    setToInput(tempInput);
    setToStationId(tempId);
    setToType(tempType);

    setFromSuggestions([]);
    setToSuggestions([]);
  }

  function handleSelectRoute(idx) {
    if (onRouteSelect) onRouteSelect(idx);
    setExpandedRouteIdx((cur) => (cur === idx ? -1 : idx));
  }

  // ---------- render ----------

  return (
    <>
      {/* TOP SEARCH UI (centered overlay at top of map) */}
      <div className="plannerWrapper">
        {!expanded && (
          <div className="compactSearchBar" onClick={() => setExpanded(true)}>
            <FaSearch className="searchIcon" />
            <input
              type="text"
              placeholder="Where do you want to go?"
              readOnly
            />
          </div>
        )}

        {expanded && (
          <form className="expandedCard modernExpanded" onSubmit={handleSearch}>
            <div className="pillLayout">
              {/* Left rail with dots */}
              <div className="pillRail">
                <span className="railDot railDot--from" />
                <span className="railLine" />
                <span className="railDot railDot--to" />
              </div>

              {/* Two stacked pills */}
              <div className="pillFields">
                {/* FROM pill */}
                <div className="pillField">
                  <div className="pillFieldTop">
                    <span className="pillLabel">From</span>
                    <select
                      className="stationTypeSelect"
                      value={fromType}
                      onChange={handleFromTypeChange}
                    >
                      {stationTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>
                  <input
                    type="text"
                    placeholder="Your location or station name"
                    value={fromInput}
                    onChange={(e) => handleFromChange(e.target.value)}
                  />

                  {fromSuggestions.length > 0 && (
                    <ul className="autocompleteList">
                      {fromSuggestions.map((st) => (
                        <li
                          key={st.stationID}
                          className="autocompleteItem"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            selectFromStation(st);
                          }}
                        >
                          <span className="autocompleteCode">
                            {st.stationID}
                          </span>
                          <span className="autocompleteName">
                            {st.stationName}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* TO pill */}
                <div className="pillField">
                  <div className="pillFieldTop">
                    <span className="pillLabel">To</span>
                    <select
                      className="stationTypeSelect"
                      value={toType}
                      onChange={handleToTypeChange}
                    >
                      {stationTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>
                  <input
                    type="text"
                    placeholder="Destination station name"
                    value={toInput}
                    onChange={(e) => handleToChange(e.target.value)}
                  />

                  {toSuggestions.length > 0 && (
                    <ul className="autocompleteList">
                      {toSuggestions.map((st) => (
                        <li
                          key={st.stationID}
                          className="autocompleteItem"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            selectToStation(st);
                          }}
                        >
                          <span className="autocompleteCode">
                            {st.stationID}
                          </span>
                          <span className="autocompleteName">
                            {st.stationName}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* Swap button on the right */}
              <button
                type="button"
                className="swapVerticalBtn"
                onClick={swapStations}
                title="Swap"
              >
                <FaExchangeAlt />
              </button>
            </div>

            <div className="btnRow modernBtnRow">
              <button className="searchBtn" type="submit" disabled={loading}>
                {loading ? "Searching..." : "Search"}
              </button>

              <button
                type="button"
                className="cancelBtn"
                onClick={() => {
                  setExpanded(false);
                  setFromSuggestions([]);
                  setToSuggestions([]);
                }}
              >
                Cancel
              </button>
            </div>

            {error && <p className="errorMsg">❌ {error}</p>}
          </form>
        )}
      </div>

      {/* RIGHT SIDE RESULTS PANEL */}
      {result && !heatmapOn && showResults && (
        <aside className={`resultsSidePanel${isInfoPanelOpen ? " resultsSidePanel--stacked" : ""}`}>
          <button
            className="closeSideBtn"
            onClick={() => {
              setResult(null);
              setExpandedRouteIdx(-1);
              if (onRouteFound) onRouteFound(null);
            }}
            title="Close results"
          >
            ×
          </button>

          {/* Header: From → To */}
          <div className="panelHeader">
            <div className="panelRouteLine">
              <span className="stationTag">
                {lastQueryFromName || `${lastQueryFromType}`}
              </span>
              <span className="arrow">→</span>
              <span className="stationTag">
                {lastQueryToName || `${lastQueryToType}`}
              </span>
            </div>
            <div className="panelMeta">
              {result.numPaths === 1
                ? "Found 1 route"
                : `Found ${result.numPaths} routes`}
            </div>
          </div>

          {/* All routes */}
          <div className="panelBody">
            {result.paths?.map((path, idx) => {
              const legs = buildLegs(path);
              const totalStops = Math.max(0, path.length - 1);

              const distinctLineIds = new Set(
                legs.map((leg) => leg.lineID).filter(Boolean)
              );
              const transfers = Math.max(0, distinctLineIds.size - 1);

              const isSelected = selectedRouteIdx === idx;
              const isExpanded = expandedRouteIdx === idx;

              return (
                <div
                  key={idx}
                  className={
                    "panelCard routeCard" +
                    (isSelected ? " selected" : "") +
                    (isExpanded ? " expanded" : "")
                  }
                  onClick={() => handleSelectRoute(idx)}
                >
                  <div className="routeCardHeader">
                    <div>
                      <div className="panelCardTitle">Route {idx + 1}</div>
                      <div className="routeSummary">
                        <span>{totalStops} stops</span>
                        {transfers > 0 && (
                          <span>
                            {" "}
                            · {transfers} transfer
                            {transfers > 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="routeLinesChips">
                      {legs.map((leg, i) => (
                        <span
                          key={i}
                          className="lineChip"
                          style={{ backgroundColor: leg.color }}
                        >
                          {leg.lineName}
                        </span>
                      ))}
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="routeDetails stationsList">
                      {path.map((step, i) => {
                        const stationId = step.stationID;
                        const isLast = i === path.length - 1;

                        // use the next edge’s line to colour the dot; for the last station,
                        // fall back to the edge that arrived here
                        const edgeStep = !isLast ? path[i + 1] : step;
                        const lineId = edgeStep.lineID;
                        const meta = lineMetaById[String(lineId)] || {};
                        
                        /*
                        const color =
                          edgeStep.lineColourHex || meta.color || "#111827";
                        */

                         // choose colour so there is no grey dot ----
                          let color = null;

                          // 1) Prefer the line of the edge leaving this station
                          if (lineId) {
                            color = edgeStep.lineColourHex || meta.color || null;
                          }

                          // 2) If still no colour (pure interchange), inherit from previous edge
                          if (!color && i > 0) {
                            const prevEdge = path[i]; // edge that arrived here
                            const prevLineId = prevEdge.lineID;
                            const prevMeta = lineMetaById[String(prevLineId)] || {};
                            color = prevEdge.lineColourHex || prevMeta.color || null;
                          }

                          // 3) Final safety fallback (should rarely be used)
                          if (!color) color = "#888";
                        // a station is interchange if the edge arriving OR departing is interchange
                        const arrivesInterchange = step.connectionType === "interchange";
                        const departsInterchange =
                          !isLast && path[i + 1].connectionType === "interchange";
                        const isInterchange = arrivesInterchange || departsInterchange;

                        // work out all systems serving this station ----
                        let systems = stationSystemsById[stationId] || [];

                        // fallback if empty but we have a lineId
                        if (!systems.length && lineId) {
                          const sys = LINE_SYSTEM_BY_ID[String(lineId)];
                          if (sys) systems = [sys];
                        }

                        let systemLabel = "";
                        if (systems.length === 1) {
                          systemLabel = systems[0];                     // "LRT"
                        } else if (systems.length > 1) {
                          systemLabel = systems.join(" / ");            // "LRT / Monorail"
                        }

                        const label = systemLabel
                          ? `${systemLabel} ${nameOf(stationId)}`
                          : nameOf(stationId);
                        return (
                          <div className="routeStep" key={`${stationId}-${i}`}>
                            {/* left vertical line + glowing dot */}
                            <div className="routeStepTimeline">
                              <span
                                className="routeStepDot stationDot"
                                style={{
                                  borderColor: color,
                                  boxShadow: `0 0 0 4px ${color}33`, // glow with line colour
                                }}
                              />
                            </div>
                            {/* right text */}
                            <div className="routeStepBody">
                              <div className="routeStepTitle">{label}</div>
                              {isInterchange && (
                                <div className="routeStepMeta">interchange</div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </aside>
      )}

      {result && !heatmapOn && !showResults && isMobile && (
        <button
          type="button"
          className="resultsToggleFab"
          onClick={() => {
            if (isInfoPanelOpen && onRequestCloseInfoPanel) {
              onRequestCloseInfoPanel();
            }
            setShowResults(true);
          }}
        >
          Show routes
        </button>
      )}
    </>
  );
}
