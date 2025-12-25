import React, { useState, useEffect, useMemo, useRef } from "react";
import JourneyPlanner from "./JourneyPlanner.jsx"; 
//import RidershipNext7Chart from "./RidershipNext7Chart.jsx";
import HeatmapLayer from "./HeatmapLayer.jsx";
import StationSidePanel from "./StationSidePanel.jsx";
import WelcomeCard from "./WelcomeCard.jsx";
import "../../Components/userpage/UserPage.css";
import { MapContainer, TileLayer, Polyline, Marker, Popup, Circle, Tooltip } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useMap } from "react-leaflet";
import startMarkerIcon from "../../assets/markers/marker-green.svg";
import endMarkerIcon from "../../assets/markers/marker-red.svg";
import interchangeMarkerIcon from "../../assets/markers/marker-yellow-interchange.svg";
import startInterchangeMarkerIcon from "../../assets/markers/marker-green-interchange.svg";
import endInterchangeMarkerIcon from "../../assets/markers/marker-red-interchange.svg";

// Fix Leaflet default icon paths
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// Custom colored Leaflet-style pins (SVG)
const startIcon = L.icon({
  iconUrl: startMarkerIcon,
  iconSize: [30, 46],      // same as Leaflet default
  iconAnchor: [15, 46],
  popupAnchor: [0, -46],
});

const endIcon = L.icon({
  iconUrl: endMarkerIcon,
  iconSize: [30, 46],
  iconAnchor: [15, 46],
  popupAnchor: [0, -46],
});

const interchangeIcon = L.icon({
  iconUrl: interchangeMarkerIcon,
  iconSize: [30, 46],
  iconAnchor: [15, 46],
  popupAnchor: [0, -46],
});

const startInterchangeIcon = L.icon({
  iconUrl: startInterchangeMarkerIcon,
  iconSize: [30, 46],
  iconAnchor: [15, 46],
  popupAnchor: [0, -46],
});

const endInterchangeIcon = L.icon({
  iconUrl: endInterchangeMarkerIcon,
  iconSize: [30, 46],
  iconAnchor: [15, 46],
  popupAnchor: [0, -46],
});

const userLocationIcon = L.divIcon({
  className: "user-location-icon",
  html: '<div class="user-location-dot"></div>',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

// Component to show user location marker + accuracy circle
function UserLocationMarker({ position }) {
  const map = useMap();

  // Center map when we get the position
  useEffect(() => {
    if (position) {
      map.flyTo(position, 15, { duration: 1 });
    }
  }, [position, map]);

  if (!position) return null;

  return (
    <>
      {/* accuracy bubble */}
      <Circle
        center={position}
        radius={200} // 200m bubble, just for visual
        pathOptions={{
          color: "#3b82f6",
          fillColor: "#3b82f6",
          fillOpacity: 0.15,
        }}
      />
      <Marker position={position} icon={userLocationIcon}>
        <Popup>You are here (approximate)</Popup>
      </Marker>
    </>
  );
}

function getAttractionIcon(category) {
  const key = (category || "").toUpperCase();

  const colorMap = {
    MALL: "#1d4ed8",    // blue
    FOOD: "#b45309",    // brown/orange
    PARK: "#15803d",    // green
    MUSEUM: "#6b21a8",  // purple
  };

  const color = colorMap[key] || "#4b5563";

  return L.divIcon({
    className: "attraction-marker-icon",
    html: `
      <div
        style="
          width: 18px;
          height: 18px;
          border-radius: 999px;
          border: 2px solid #ffffff;
          background: ${color};
          box-shadow: 0 2px 6px rgba(0,0,0,0.35);
        "
      ></div>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -10],
  });
}

const makeAttractionIcon = (extraClass) =>
  L.divIcon({
    className: `attraction-icon ${extraClass}`,
    html: '<div class="attraction-dot"></div>',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });

const genericAttractionIcon = makeAttractionIcon("attraction-generic");
const mallAttractionIcon    = makeAttractionIcon("attraction-mall");
const foodAttractionIcon    = makeAttractionIcon("attraction-food");
const parkAttractionIcon    = makeAttractionIcon("attraction-park");
const museumAttractionIcon  = makeAttractionIcon("attraction-museum");

function pickAttractionIcon(category) {
  const c = (category || "").toLowerCase();

  if (/mall|shopping|retail/.test(c)) return mallAttractionIcon;
  if (/food|dining|restaurant|cafe|eat/.test(c)) return foodAttractionIcon;
  if (/park|garden|outdoor|recreation/.test(c)) return parkAttractionIcon;
  if (/museum|gallery|heritage|history/.test(c)) return museumAttractionIcon;

  return genericAttractionIcon;
}

// Component to fit map bounds to route segments after user search
function FitRouteBounds({ routeSegments }) {
  const map = useMap();

  useEffect(() => {
    if (!routeSegments || routeSegments.length === 0) return;
    const allCoords = routeSegments.flatMap(seg => seg.coords);
    if (allCoords.length < 2) return;
    const bounds = L.latLngBounds(allCoords);

    map.flyToBounds(bounds, {
      padding: [60, 60],
      maxZoom: 15,
      duration: 1.2
    });
  }, [routeSegments, map]);

  return null;
}

function MapFlyTo({ target }) {
  const map = useMap();

  useEffect(() => {
    if (!target) return;

    map.flyTo([target.lat, target.lng], target.zoom ?? 17, {
      duration: 1,
    });
  }, [target, map]);

  return null;
}

// Map 0..1 intensity -> heat colour (cool → warm)
function lineHeatColor(t) {
  // clamp
  const x = Math.max(0, Math.min(1, t));

  // simple 4-stop gradient: blue → cyan → yellow → red
  // you can tweak these hex codes to match your brand
  if (x < 0.25) return "#2b6cb0";      // low, cool blue
  if (x < 0.5)  return "#38b2ac";      // teal
  if (x < 0.75) return "#f6e05e";      // yellow
  return "#e53e3e";                    // high, hot red
}

// Legend for heatmap
function HeatmapLegendInline() {
  return (
    <div className="heatmap-legend-inline">
      <div className="heatmap-legend-title">
        Today&apos;s predicted ridership by corridor
      </div>

      <div className="heatmap-legend-bar" />
      <div className="heatmap-legend-labels">
        <span>Quieter</span>
        <span>Busier</span>
      </div>

      <div className="heatmap-legend-line">All rapid rail corridors</div>
    </div>
  );
}

const KTM_LINE_IDS = [1, 2, 10];
const RAPID_RAIL_LINE_IDS = ["3", "4", "5", "8", "9", "12"]; // Rapid Rail Line IDs (NO KTM, NO ERL)

export default function HomePage() {

  const [stationsRaw, setStationsRaw] = useState([]);  // raw joined rows
  const [stationsById, setStationsById] = useState({}); // grouped
  const [routeResult, setRouteResult] = useState(null);
  const [showStations, setShowStations] = useState(false);
  const [routeSegments, setRouteSegments] = useState([]); // each segment = { coords: [[lat,lng]...], color }
  const [routeStationIds, setRouteStationIds] = useState(new Set());
  const [selectedRouteIdx, setSelectedRouteIdx] = useState(0);
  const [next7Predictions, setNext7Predictions] = useState([]); // loaded on mount
  const mapRef = useRef(null);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [heatmapRaw, setHeatmapRaw] = useState([]); // keep full data from API
  const [heatmapPoints, setHeatmapPoints] = useState([]);  // points for current view
  const [lineRidership, setLineRidership] = useState({});
  const [lineIntensity, setLineIntensity] = useState({});
  const [isLoadingHeatmap, setIsLoadingHeatmap] = useState(false);
  const [hoveredLineId, setHoveredLineId] = useState(null);
  const [userLocation, setUserLocation] = useState(null); // [lat, lng]
  const [isLocLoading, setIsLocLoading] = useState(false);
  const [locError, setLocError] = useState(null);
  const [attractionMarkers, setAttractionMarkers] = useState([]);
  const [showAttractionMarkers, setShowAttractionMarkers] = useState(false);
  const [selectedAttractionId, setSelectedAttractionId] = useState(null);
  const [flyToTarget, setFlyToTarget] = useState(null);
  const [attractionNearbyStations, setAttractionNearbyStations] = useState([]);
  const requestUserLocation = () => {
    if (!("geolocation" in navigator)) {
      setLocError("Geolocation is not supported in this browser.");
      return;
    }

    setIsLocLoading(true);
    setLocError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;

        // ✅ Only accept locations inside Klang Valley
        if (!isWithinKlangValley(latitude, longitude)) {
          console.warn("User location outside Klang Valley:", latitude, longitude);

          setUserLocation(null); // no marker
          setLocError(
            "Your current location is outside the Klang Valley area, so the location marker is hidden."
          );
          setIsLocLoading(false);
          return;
        }

        // ✅ Inside service area → show marker + nearest station
        setUserLocation([latitude, longitude]);
        setIsLocLoading(false);
      },
      (err) => {
        console.error("Geolocation error:", err);
        setLocError(err.message || "Failed to get your location.");
        setIsLocLoading(false);
      },
      {
        enableHighAccuracy: false,
        timeout: 15000,
        maximumAge: 300000,
      }
    );
  };

  useEffect(() => {
    requestUserLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toRad(deg) {
    return (deg * Math.PI) / 180;
  }

  function haversineMeters(lat1, lng1, lat2, lng2) {
    const R = 6371000; // Earth radius in meters
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  const stationsList = useMemo(
    () => Object.values(stationsById),
    [stationsById]
  );

  const nearestStationFromUser = useMemo(() => {
    if (!userLocation || stationsList.length === 0) return null;

    const [uLat, uLng] = userLocation;

    let bestStation = null;
    let bestDist = Infinity;

    for (const s of stationsList) {
      const sLat = Number(s.stationLatitude);
      const sLng = Number(s.stationLongitude);
      if (Number.isNaN(sLat) || Number.isNaN(sLng)) continue;

      const d = haversineMeters(uLat, uLng, sLat, sLng);
      if (d < bestDist) {
        bestDist = d;
        bestStation = s;
      }
    }

    if (!bestStation) return null;

    return {
      ...bestStation,
      distanceMetersFromUser: bestDist,
    };
  }, [userLocation, stationsList]);

// Load predictions function (make it reusable)
const loadPredictions = async () => {
  try {
    const res = await fetch("/api/ridership/expected-pattern");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();

    //store into state
    console.log("Expected pattern rows:", data.length, data[0]);
    setNext7Predictions(data);           // <— you commented this out before
  } catch (e) {
    console.error("Failed to load expected pattern", e);
  }
};

  // Load predictions on mount
  useEffect(() => {
    loadPredictions();
  }, []); // load once on mount

  const lineNameById = useMemo(() => {
    const map = {};
    for (const r of stationsRaw) {
      if (r.lineid && r.linename) {
        map[r.lineid] = r.linename;
      }
    }
    return map;
  }, [stationsRaw]);

  // current selected path (from backend)
  const selectedPath = routeResult?.paths?.[selectedRouteIdx] || [];

  // start/end station IDs
  const startId = selectedPath[0]?.stationID;
  const endId   = selectedPath[selectedPath.length - 1]?.stationID;

  // find interchange stations first
  const interchangeIds = new Set();
  const interchangeInfoByStation = {};

  for (let i = 1; i < selectedPath.length; i++) {
    const step = selectedPath[i];
    const prev = selectedPath[i - 1];
    const next = selectedPath[i + 1];   // look ahead

    const isExplicitInterchange = step.connectionType === "interchange";
    const lineChanged =
      prev.lineID && step.lineID && prev.lineID !== step.lineID;

    if (isExplicitInterchange || lineChanged) {
      interchangeIds.add(step.stationID);

      // If explicit interchange, the "to line" is the NEXT step's line
      const fromLineId = prev.lineID ?? null;
      const toLineId = isExplicitInterchange
        ? (next?.lineID ?? null)
        : (step.lineID ?? null);

      // fallback: if still null, infer from station_line list
      let inferredToLineId = toLineId;
      if (!inferredToLineId) {
        const stationLines = stationsById[step.stationID]?.lines || [];
        inferredToLineId =
          stationLines.find(l => l.lineID !== fromLineId)?.lineID ?? null;
      }

      interchangeInfoByStation[step.stationID] = {
        fromLineId,
        toLineId: inferredToLineId,
        fromLineName: fromLineId
          ? (lineNameById[fromLineId] || fromLineId)
          : "Unknown line",
        toLineName: inferredToLineId
          ? (lineNameById[inferredToLineId] || inferredToLineId)
          : "Unknown line",
      };

      // Option B (start/end also marked if interchange edge touches them)
      interchangeIds.add(prev.stationID);
      if (prev.stationID === startId) {
        interchangeInfoByStation[startId] = interchangeInfoByStation[step.stationID];
      }
      if (step.stationID === endId) {
        interchangeInfoByStation[endId] = interchangeInfoByStation[step.stationID];
      }
    }
  }

  function zoomToAttractions(atrs) {
    if (!Array.isArray(atrs) || atrs.length === 0) return;
    if (!mapRef.current) return;

    const coords = atrs
      .map((a) => {
        const lat = Number(
          a.atrlatitude ??
          a.atrLatitude ??
          a.latitude ??
          a.lat
        );
        const lng = Number(
          a.atrlongitude ??
          a.atrLongitude ??
          a.longitude ??
          a.lng
        );

        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          return [lat, lng];
        }

        // Debug if something is wrong with this attraction
        console.warn("Invalid attraction coordinates:", a);
        return null;
      })
      .filter(Boolean);

    if (coords.length === 0) return;

    // Single attraction → zoom in
    if (coords.length === 1) {
      mapRef.current.flyTo(coords[0], 17, { duration: 1 });
      return;
    }

    // Multiple → fit bounds
    const bounds = L.latLngBounds(coords);
    mapRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
  }

  // start/end station objects
  const startStation = startId ? stationsById[startId] : null;
  const endStation   = endId ? stationsById[endId] : null;
  const startIsInterchange = startId && interchangeIds.has(startId);
  const endIsInterchange   = endId && interchangeIds.has(endId);

  // Toggle heatmap display
  const toggleHeatmap = async () => {
    // turning ON and we don't have data yet
    if (!showHeatmap && heatmapRaw.length === 0) {
      try {
        setIsLoadingHeatmap(true);
        const res = await fetch("/api/heatmap/today-forecast"); // 👈 NEW ENDPOINT
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        console.log("Today-forecast heatmap rows:", data.length, data[0]);
        setHeatmapRaw(data);           // keep full station objects
      } catch (err) {
        console.error("Error loading today-forecast heatmap:", err);
      } finally {
        setIsLoadingHeatmap(false);
      }
    }

    setShowHeatmap((prev) => !prev);
  };

  useEffect(() => {
    if (!heatmapRaw.length) return;

    const filtered = heatmapRaw; // no per-line filter anymore

    const pts = filtered.map((p) => [p.lat, p.lng, p.weight ?? 1]);
    setHeatmapPoints(pts);

    const perLineTotals = {};
    const perLineCounts = {};

    for (const p of filtered) {
      const lid = String(p.line_id);
      const val =
        p.predicted_station_ridership ??
        p.avg_daily_ridership ??
        0;

      if (!perLineTotals[lid]) {
        perLineTotals[lid] = 0;
        perLineCounts[lid] = 0;
      }
      perLineTotals[lid] += val;
      perLineCounts[lid] += 1;
    }

    const perLineAvg = {};
    let maxAvg = 0;

    Object.keys(perLineTotals).forEach((lid) => {
      const avg = perLineTotals[lid] / (perLineCounts[lid] || 1);
      perLineAvg[lid] = avg;
      if (avg > maxAvg) maxAvg = avg;
    });

    const intensity = {};
    Object.keys(perLineAvg).forEach((lid) => {
      intensity[lid] = maxAvg > 0 ? perLineAvg[lid] / maxAvg : 0;
    });

    setLineIntensity(intensity);
    setLineRidership(perLineTotals); 
  }, [heatmapRaw]);

  useEffect(() => {
    // enter map mode: lock scroll
    document.body.classList.add("no-scroll");

    // leave map mode: restore normal page scroll
    return () => {
      document.body.classList.remove("no-scroll");
    };
  }, []);

  useEffect(() => {
    const grouped = {};

    for (const r of stationsRaw) {
      const id = r.stationid;

      // create station core once
      if (!grouped[id]) {
        grouped[id] = {
          stationID: r.stationid,
          stationName: r.stationname,
          stationLatitude: r.stationlatitude,
          stationLongitude: r.stationlongitude,
          isActive: r.isactive,
          lines: [],

        };
      }

      // push line info
      const alreadyHasLine = grouped[id].lines.some(l => l.lineID === r.lineid);
      if (!alreadyHasLine) {
        grouped[id].lines.push({
          lineID: r.lineid,
          lineName: r.linename,
          lineColourHex: r.linecolourhex,
          sequenceOnLine: r.sequenceonline
        });
      }
    }

    setStationsById(grouped);
  }, [stationsRaw]);

  useEffect(() => {
    if (!routeResult || stationsRaw.length === 0) return;

    const path = routeResult.paths?.[selectedRouteIdx];
    if (!path || path.length < 2) {
      setRouteSegments([]);
      setRouteStationIds(new Set());
      return;
    }

    // Build station ID set for markers
    const ids = new Set(path.map(step => step.stationID));
    setRouteStationIds(ids);

    // Build colored segments
    const segs = [];

    // Start color from first edge
    let currentColor = path[1]?.lineColourHex || "#333333";

    // Start coords at first station
    let currentCoords = [];
    const firstStation = stationsById[path[0].stationID];
    if (firstStation) {
      currentCoords.push([firstStation.stationLatitude, firstStation.stationLongitude]);
    }

    for (let i = 1; i < path.length; i++) {
      const step = path[i];
      const st = stationsById[step.stationID];
      if (!st) continue;

      const coord = [st.stationLatitude, st.stationLongitude];
      const stepColor = step.lineColourHex || currentColor || "#333333";

      if (stepColor === currentColor) {
        currentCoords.push(coord);
      } else {
        if (currentCoords.length >= 2) {
          segs.push({ coords: currentCoords, color: currentColor });
        }

        currentColor = stepColor;

        const prevStep = path[i - 1];
        const prevSt = stationsById[prevStep.stationID];
        currentCoords = [];

        if (prevSt) {
          currentCoords.push([prevSt.stationLatitude, prevSt.stationLongitude]);
        }
        currentCoords.push(coord);
      }
    }

    if (currentCoords.length >= 2) {
      segs.push({ coords: currentCoords, color: currentColor });
    }

    setRouteSegments(segs);

  }, [routeResult, selectedRouteIdx, stationsRaw, stationsById]);

  // All transit lines as ordered polylines (for network skeleton)
  const networkLines = useMemo(() => {

    if (!stationsRaw || stationsRaw.length === 0) return [];

    const byLine = {};

    for (const r of stationsRaw) {
      const lineId = r.lineid;
      if (!lineId) continue;

      if (!byLine[lineId]) {
        byLine[lineId] = {
          lineId,
          lineName: r.linename,
          color: r.linecolourhex,
          stations: [],
        };
      }

      byLine[lineId].stations.push({
        stationID: r.stationid,
        seq: r.sequenceonline,
        lat: Number(r.stationlatitude),
        lng: Number(r.stationlongitude),
      });
    }

    // Convert grouped object -> array with sorted coords
    return Object.values(byLine)
      .map((line) => {
        const coords = line.stations
          .filter((s) => !Number.isNaN(s.lat) && !Number.isNaN(s.lng))
          .sort((a, b) => a.seq - b.seq)
          .map((s) => [s.lat, s.lng]);

        return {
          lineId: line.lineId,
          lineName: line.lineName,
          color: line.color,
          coords,
        };
      })
      // keep only lines with at least 2 points
      .filter((line) => line.coords.length >= 2);
  }, [stationsRaw]);

  // Non-KTM, rapid-rail lines for heatmap view, filtered by the same chips
  const visibleNetworkLines = useMemo(() => {
    if (!networkLines || networkLines.length === 0) return [];

    // Only keep rapid rail line ids (no chip filter)
    let lines = networkLines.filter((l) =>
      RAPID_RAIL_LINE_IDS.includes(String(l.lineId))
    );

    // Guard for KTM ids, just in case
    lines = lines.filter((l) => !KTM_LINE_IDS.includes(Number(l.lineId)));

    return lines;
  }, [networkLines]);

  // Debug: check if network lines are correct
  useEffect(() => {
    console.log("Network lines for map:", networkLines);
  }, [networkLines]);

  // Load stations if not already loaded
  async function loadStationsIfNeeded() {
    if (stationsRaw.length > 0) return; // already loaded

    const res = await fetch("/api/stations");
    const data = await res.json();
    setStationsRaw(data);
  }
  
  useEffect(() => {
    // load stations once on initial page load
    loadStationsIfNeeded();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When a new routeResult is set, process it into routeLines for map display
  async function handleRouteFound(data) {
    setShowHeatmap(false);   // whenever a route is found, make sure heatmap is OFF
    setRouteResult(data);
    setSelectedRouteIdx(0)
    await loadStationsIfNeeded(); 
    setShowStations(true);
  }

  const KLANG_VALLEY_CENTER = [3.02, 101.7]; // a bit south of KL, closer to Putrajaya

  // Focused bounding box: Klang ↔ Kajang, up to Rawang, down to Sepang-ish
  const KLANG_VALLEY_BOUNDS = [
    [2.65, 101.2], // South-West (near Sepang / Port Dickson side)
    [3.45, 102.0], // North-East (Rawang / Semenyih area)
  ];

  // Helper: check if lat/lng is inside Klang Valley bbox
  function isWithinKlangValley(lat, lng) {
    const [sw, ne] = KLANG_VALLEY_BOUNDS;
    const [southLat, westLng] = sw;
    const [northLat, eastLng] = ne;

    return (
      lat >= southLat &&
      lat <= northLat &&
      lng >= westLng &&
      lng <= eastLng
    );
  }

  const [selectedStation, setSelectedStation] = useState(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false); // left panel open/closed

  const handleStationClick = (station, options = {}) => {
    if (!station) return;

    setSelectedStation(station);
    setIsPanelOpen(true);

    const shouldFly = options.fly !== false; // default: true

    if (
      shouldFly &&
      station.stationLatitude != null &&
      station.stationLongitude != null
    ) {
      const lat = Number(station.stationLatitude);
      const lng = Number(station.stationLongitude);

      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        // use the same MapFlyTo helper as attractions
        setFlyToTarget({ lat, lng, zoom: 16 });
      } else {
        console.warn("handleStationClick: invalid lat/lng", station);
      }
    }
  };

  function handleHighlightAttraction(atr) {
    if (!atr) {
      setSelectedAttractionId(null);
      setSelectedStation(null);
      setAttractionMarkers([]);
      setShowAttractionMarkers(false);
      setFlyToTarget(null);
      // clear extra stations list if you add it
      setAttractionNearbyStations([]);
      return;
    }

    // 1) Only keep this attraction on the map
    setSelectedAttractionId(atr.atrid);
    setAttractionMarkers([atr]);
    setShowAttractionMarkers(true);

    // 2) Compute lat/lng robustly
    const lat = Number(
      atr.atrlatitude ??
        atr.atrLatitude ??
        atr.latitude ??
        atr.lat
    );
    const lng = Number(
      atr.atrlongitude ??
        atr.atrLongitude ??
        atr.longitude ??
        atr.lng
    );

    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      setFlyToTarget({ lat, lng, zoom: 17 });
    } else {
      console.warn("handleHighlightAttraction: no valid lat/lng for", atr);
    }

    // if backend returns multiple stations, use them
    // Expect atr.stations = [{ stationid, stationname, ... }, ...]
    const linkedStations = Array.isArray(atr.stations) ? atr.stations : [];

    const resolvedStations = linkedStations
      .map((s) => {
        const id = s.stationid || s.stationID;
        return id ? stationsById[id] : null;
      })
      .filter(Boolean);

    // 3) Find station(s)
    let primaryStation = null;

    if (resolvedStations.length > 0) {
      // Choose closest as primary (if distance provided), else first
      const withDistance = linkedStations
        .map((s) => {
          const id = s.stationid || s.stationID;
          const full = id ? stationsById[id] : null;
          return full
            ? { station: full, distance: Number(s.distance) }
            : null;
        })
        .filter(Boolean);

      if (withDistance.length > 0 && withDistance.some((x) => Number.isFinite(x.distance))) {
        withDistance.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
        primaryStation = withDistance[0].station;
      } else {
        primaryStation = resolvedStations[0];
      }

      // store list for UI display (recommended)
      setAttractionNearbyStations(resolvedStations);
    } else {
      // Fallback: old logic (single stationid OR nearest station by haversine)
      let station = null;
      const stationId = atr.stationid || atr.stationID;

      if (stationId && stationsById[stationId]) {
        station = stationsById[stationId];
      } else if (Number.isFinite(lat) && Number.isFinite(lng) && stationsList.length > 0) {
        let bestStation = null;
        let bestDist = Infinity;

        for (const s of stationsList) {
          const sLat = Number(s.stationLatitude);
          const sLng = Number(s.stationLongitude);
          if (!Number.isFinite(sLat) || !Number.isFinite(sLng)) continue;

          const d = haversineMeters(lat, lng, sLat, sLng);
          if (d < bestDist) {
            bestDist = d;
            bestStation = s;
          }
        }

        station = bestStation;
      }

      primaryStation = station;
      setAttractionNearbyStations(station ? [station] : []);
    }

    // 4) Open the side panel for the primary station (but DON'T move map)
    if (primaryStation) {
      handleStationClick(primaryStation, { fly: false });
    }
  }

  // toggle side panel open/close
  const toggleSidePanel = () => {
    setIsPanelOpen((prev) => !prev);
  };

  const clearStation = () => {
    setSelectedStation(null);
    // you can keep panel open or close it; I’ll keep it open but empty
  };

  return (
    <>
      {/* Welcome Card Overlay */}
      <WelcomeCard />
      
      {/* Fullscreen map area */}
      <main className="mapPage">
        <div className="mapWrapper">
          {/* The actual Leaflet map */}
          <MapContainer
            center={KLANG_VALLEY_CENTER}
            zoom={11}
            minZoom={10}
            maxZoom={18}
            maxBounds={KLANG_VALLEY_BOUNDS}
            maxBoundsViscosity={1.0}
            className={`mapFullscreen ${showHeatmap ? "heatmap-on" : ""}`}  
            scrollWheelZoom={true}
            whenCreated={(map) => { mapRef.current = map; }}
          >

            {/* Base map tiles */}
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; OpenStreetMap contributors'
            />

            <MapFlyTo target={flyToTarget} />

            {/* User location marker + accuracy circle */}
            <UserLocationMarker position={userLocation} />

            {/* When heatmap mode is ON, show network lines (+ optional blob layer) */}
            {showHeatmap && (
              <>
                {/* OPTIONAL: bring back the station blobs if you want the soft background glow */}
                {heatmapPoints.length > 0 && (
                  <HeatmapLayer
                    points={heatmapPoints}
                    radius={20}
                    blur={30}
                    maxZoom={16}
                  />
                )}

                {/* Corridor skeleton coloured by line-level intensity */}
                {visibleNetworkLines.map((line) => {
                  const lid = String(line.lineId);
                  const s = lineIntensity[lid] ?? 0.15;       // 0..1
                  const ridership = lineRidership[lid] ?? null;
                  const isHovered = hoveredLineId === line.lineId;

                  // Heat colour from cool → warm
                  const baseColor = lineHeatColor(s);

                  // CONSTANT widths – only a small change on hover
                  const outerWidth = isHovered ? 12 : 10;
                  const innerWidth = isHovered ? 6 : 4;

                  const outerOpacity = 0.25;                 // soft glow
                  const innerOpacity = isHovered ? 1.0 : 0.9;

                  const handlers = {
                    mouseover: () => setHoveredLineId(line.lineId),
                    mouseout: () => setHoveredLineId(null),
                  };

                  return (
                    <React.Fragment key={line.lineId}>
                      {/* OUTER GLOW: soft corridor, constant width */}
                      <Polyline
                        positions={line.coords}
                        pathOptions={{
                          color: baseColor,
                          weight: outerWidth,
                          opacity: outerOpacity,
                          lineCap: "round",
                          lineJoin: "round",
                          smoothFactor: 2,
                        }}
                        eventHandlers={handlers}
                      />

                      {/* INNER STROKE: sharp coloured line + tooltip */}
                      <Polyline
                        positions={line.coords}
                        pathOptions={{
                          color: baseColor,
                          weight: innerWidth,
                          opacity: innerOpacity,
                          lineCap: "round",
                          lineJoin: "round",
                          smoothFactor: 2,
                        }}
                        eventHandlers={handlers}
                      >
                        <Tooltip sticky direction="top" offset={[0, -8]} opacity={0.95}>
                          <div style={{ fontSize: "12px", fontWeight: 600 }}>
                            {line.lineName}
                          </div>
                          <div style={{ fontSize: "11px" }}>
                            Corridor colour reflects today&apos;s predicted ridership.
                          </div>
                          {ridership != null && (
                            <div style={{ fontSize: "11px", marginTop: 2 }}>
                              ≈ {ridership.toLocaleString()} riders today
                            </div>
                          )}
                        </Tooltip>
                      </Polyline>
                    </React.Fragment>
                  );
                })}
              </>
            )}

            {/* Hide routes + stations when heatmap mode is ON */}
            {!showHeatmap && (
              <>
                {/* Auto zoom to selected route */}
                <FitRouteBounds routeSegments={routeSegments} />

                {/* Route segments – neon style */}
                {routeSegments.map((seg, i) => (
                  <React.Fragment key={i}>
                    {/* Colored outer glow */}
                    <Polyline
                      positions={seg.coords}
                      pathOptions={{
                        color: seg.color,
                        weight: 16,
                        opacity: 0.18,
                        smoothFactor: 2,
                      }}
                    />

                    {/* Inner glow */}
                    <Polyline
                      positions={seg.coords}
                      pathOptions={{
                        color: seg.color,
                        weight: 10,
                        opacity: 0.75,
                        smoothFactor:2,
                      }}
                    />

                    {/* White core highlight */}
                    <Polyline
                      positions={seg.coords}
                      pathOptions={{
                        color: seg.color,
                        weight: 4,
                        opacity: 1.0,
                        smoothFactor: 2,
                      }}
                    />
                  </React.Fragment>
                ))}


                {/* Start Marker */}
                {startStation && (
                  <Marker
                    position={[startStation.stationLatitude, startStation.stationLongitude]}
                    icon={startIsInterchange ? startInterchangeIcon : startIcon}
                    zIndexOffset={1000}
                    eventHandlers={{ click: () => handleStationClick(startStation) }}
                  >
                    <Popup>
                      <div className="popupTimeline">
                        <div className="popupTitle">Start</div>
                        <div className="popupStationName">
                          {startStation.stationName} ({startStation.stationID})
                        </div>
                        <div className="popupLines">
                          {startStation.lines.map((l) => l.lineName).join(" · ")}
                        </div>
                        {startIsInterchange && (
                          <div className="popupMeta">Interchange station</div>
                        )}
                      </div>
                    </Popup>

                  </Marker>
                )}

                {/* End Marker */}
                {endStation && (
                  <Marker
                    position={[endStation.stationLatitude, endStation.stationLongitude]}
                    icon={endIsInterchange ? endInterchangeIcon : endIcon}
                    zIndexOffset={1000}
                    eventHandlers={{ click: () => handleStationClick(endStation) }}
                  >
                    <Popup>
                      <div className="popupTimeline">
                        <div className="popupTitle">Destination</div>
                        <div className="popupStationName">
                          {endStation.stationName} ({endStation.stationID})
                        </div>
                        <div className="popupLines">
                          {endStation.lines.map((l) => l.lineName).join(" · ")}
                        </div>
                        {endIsInterchange && (
                          <div className="popupMeta">Interchange station</div>
                        )}
                      </div>
                  </Popup>

                  </Marker>
                )}

                {/* Interchange Markers */}
                {showStations && routeResult && stationsList
                  .filter(st => interchangeIds.has(st.stationID))
                  .map((station) => {
                    if (station.stationID === startId || station.stationID === endId) return null;

                    return (
                      <Marker
                        key={station.stationID + "-interchange"}
                        position={[station.stationLatitude, station.stationLongitude]}
                        icon={interchangeIcon}
                        zIndexOffset={900}
                        eventHandlers={{ click: () => handleStationClick(station) }}
                      >
                        <Popup>
                          <div className="popupTimeline">
                            <div className="popupStationName">{station.stationName}</div>
                            <div className="popupLines">
                              {station.lines.map((l) => l.lineName).join(" · ")}
                            </div>
                            <div className="popupMeta">Interchange station</div>
                          </div>
                        </Popup>

                      </Marker>
                    );
                })}
                {/* Normal Stations */}
                {showStations && routeResult && stationsList
                  .filter(st => routeStationIds.has(st.stationID))
                  .map((station) => {
                    const isStart = station.stationID === startId;
                    const isEnd = station.stationID === endId;
                    const isInterchange = interchangeIds.has(station.stationID);

                    if (isStart || isEnd || isInterchange) return null;

                    return (
                      <Marker
                        key={station.stationID}
                        position={[station.stationLatitude, station.stationLongitude]}
                        eventHandlers={{ click: () => handleStationClick(station) }}
                      >
                        <Popup>
                          <div className="popupTimeline">
                            <div className="popupStationName">
                              {station.stationName}
                            </div>
                             <div className="popupLines">
                              {station.lines.map((l) => l.lineName).join(" · ")}
                            </div>
                            {/* no "Click for details" text anymore */}
                          </div>
                        </Popup>
                      </Marker>

                    );
                })}

                {/* Fallback marker for a selected station that is NOT on the current route */}
                {selectedStation &&
                  !routeStationIds.has(selectedStation.stationID) && (
                    <Marker
                      key={`selected-${selectedStation.stationID}`}
                      position={[
                        Number(selectedStation.stationLatitude),
                        Number(selectedStation.stationLongitude),
                      ]}
                      zIndexOffset={1400} // make nearest station “float” above others
                      eventHandlers={{ click: () => handleStationClick(selectedStation) }}
                    >
                      <Popup>
                        <div className="popupTimeline">
                          <div className="popupStationName">
                            {selectedStation.stationName} ({selectedStation.stationID})
                          </div>
                          <div className="popupLines">
                            {selectedStation.lines.map((l) => l.lineName).join(" · ")}
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                )}
                {/* Attraction markers from ExplorePanel search */}
                {showAttractionMarkers &&
                  attractionMarkers.map((a) => {
                    const lat = Number(a.atrlatitude ?? a.atrLatitude);
                    const lng = Number(a.atrlongitude ?? a.atrLongitude);
                    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

                    const isSelected = a.atrid === selectedAttractionId;

                    return (
                      <Marker
                        key={`atr-${a.atrid}`}
                        position={[lat, lng]}
                        icon={pickAttractionIcon(a.atrcategory)}
                        zIndexOffset={isSelected ? 1500 : 800}
                        eventHandlers={{
                          click: () => handleHighlightAttraction(a),
                        }}
                      >
                        <Popup>
                          <div className="popupTimeline">
                            <div className="popupStationName">{a.atrname}</div>
                            {a.atrcategory && (
                              <div className="popupLines">{a.atrcategory}</div>
                            )}
                            {a.stationname && (
                              <div className="popupMeta">
                                Near {a.stationname} ({a.stationid})
                              </div>
                            )}
                          </div>
                        </Popup>
                      </Marker>
                    );
                  })}
              </>
            )}
          </MapContainer>

          {/*Pass the callback from HomePage → JourneyPlanner*/}
          <JourneyPlanner
            onRouteFound={handleRouteFound}
            onRouteSelect={setSelectedRouteIdx}
            selectedRouteIdx={selectedRouteIdx}
            stations={stationsList} 
            heatmapOn={showHeatmap}
          />

          {/* Heatmap button overlay */}
          {/* Floating button when heatmap is OFF */}
          {!showHeatmap && (
            <button className="heatmapToggle" onClick={toggleHeatmap}>
              {isLoadingHeatmap ? "Loading heatmap..." : "View Heatmap"}
            </button>
          )}

          {/* Side panel when heatmap is ON */}
          {showHeatmap && (
            <div className="heatmap-panel">
              <HeatmapLegendInline />
              <p
                style={{
                  fontSize: "11px",
                  color: "#777",
                  marginTop: "8px",
                  marginBottom: "8px",
                  fontStyle: "italic",
                }}
              >
                Heatmap shows today&apos;s predicted ridership along rapid rail corridors,
                approximated from line-level Random Forest forecasts (2019–2024 training
                data). Warmer-coloured corridors indicate busier lines within the selected
                group.
              </p>
              <button className="heatmapBtn" onClick={toggleHeatmap}>
                Hide Heatmap
              </button>
            </div>
          )}

          {/* Station detail slide card (optional overlay on the right/bottom) */}
          <StationSidePanel
            isOpen={isPanelOpen}
            onToggle={toggleSidePanel}
            selectedStation={selectedStation}
            onClearStation={clearStation}
            onStationClick={handleStationClick}
            next7Predictions={next7Predictions}
            nearestStationFromUser={nearestStationFromUser}
            requestUserLocation={requestUserLocation}
            isLocLoading={isLocLoading}
            locError={locError}
            allStations={stationsList}
            onAttractionSearchResults={setAttractionMarkers}
            onToggleAttractionMarkers={setShowAttractionMarkers}
            onFitAttractions={zoomToAttractions}
            onHighlightAttraction={handleHighlightAttraction} 
            selectedAttractionId={selectedAttractionId} 
            attractionNearbyStations={attractionNearbyStations}
          />
        </div>
      </main>
    </>
  );
}