import { Router } from 'express';
import { query } from './db.js';
import bcrypt from 'bcrypt'; // for password hashing
import jwt from 'jsonwebtoken'; // for JWT token generation
import { findKShortestRoutes } from "./bfsRoutes.js";
import fs from "fs";
import path from "path";
import express from 'express';
import multer from "multer";
import { fileURLToPath } from "url";
import { storage } from './config/cloudinary.js';

// --- Auth middleware: attach req.user from JWT ---
function requireAuth(req, res, next) {
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer "))
    return res.status(401).json({ message: "Missing Authorization header" });

  const token = authHeader.split(" ")[1];

  jwt.verify(token, process.env.JWT_SECRET || "dev-secret-change-this",
    (err, decoded) => {
      if (err) return res.status(401).json({ message: "Invalid or expired token" });

      req.user = { userId: decoded.userId, role: decoded.role };
      next();
    }
  );
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access only' });
  }
  next();
}

const router = Router();
console.log("🚨🚨🚨 routes.js FILE IS LOADED! 🚨🚨🚨");

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    const result = await query(
      'SELECT userid, username, password_hash, role FROM "USER" WHERE username = $1',
      [username]
    );

    if (result.rowCount === 0) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    const user = result.rows[0];

    // Compare plaintext password vs bcrypt hash from DB
    const passwordMatches = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatches) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    // Block banned users explicitly
    if (user.role === 'banned') {
      return res
        .status(403)
        .json({ message: 'Your account has been banned.' });
    }

    // allow only known roles
    if (!['commuter', 'admin', 'banned'].includes(user.role)) {
      return res.status(403).json({ message: 'Role not allowed to log in' });
    }

    const token = jwt.sign(
      { userId: user.userid, role: user.role },
      process.env.JWT_SECRET || 'dev-secret-change-this',
      { expiresIn: '1d' }
    );

    res.json({
      token,
      user: {
        id: user.userid,
        username: user.username,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/register', async (req, res) => {
  try {
    const { username, password, role } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const result = await query(
      'INSERT INTO "USER" (username, password_hash, role) VALUES ($1, $2, $3) RETURNING userid, username, role',
      [username, password_hash, role || 'commuter']
    );

    const newUser = result.rows[0];

    res.status(201).json({
      user: {
        id: newUser.userid,
        username: newUser.username,
        role: newUser.role
      }
    });
  } catch (err) {
    console.error('Register error:', err);

    // Optional: nicer message if username already exists
    if (err.code === '23505') {
      return res.status(409).json({ message: 'Username already taken' });
    }

    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /api/forgot-password  { username, newPassword }
router.post('/forgot-password', async (req, res) => {
  try {
    const { username, newPassword } = req.body;

    if (!username || !newPassword) {
      return res
        .status(400)
        .json({ message: 'Username and new password are required.' });
    }

    // Hash the new password
    const password_hash = await bcrypt.hash(newPassword, 10);

    const result = await query(
      'UPDATE "USER" SET password_hash = $1 WHERE username = $2',
      [password_hash, username]
    );

    if (result.rowCount === 0) {
      return res
        .status(404)
        .json({ message: 'User not found with that username.' });
    }

    return res.json({ message: 'Password has been reset successfully.' });
  } catch (err) {
    console.error('Forgot-password error:', err);
    return res.status(500).json({ message: 'Failed to reset password.' });
  }
});

// Test endpoint
router.get('/test', (req, res) => {
  console.log("🚨 TEST ENDPOINT HIT! 🚨");
  res.json({ message: "Server is working!", timestamp: new Date() });
});

/*
// --- Helper to load JSON files once ---
function loadJson(relativePath) {
  const fullPath = path.join(process.cwd(), relativePath);
  const raw = fs.readFileSync(fullPath, 'utf8');
  return JSON.parse(raw);
}

// --- Load KTM datasets ---
const ktmStations   = loadJson('data/ktm/ktm_stations.json');
const komuterHourly = loadJson('data/ktm/ktm_hourly_pattern_by_station_dow.json');
const stationIdToName = new Map(ktmStations.map((s) => [s.id, s.name]));
const ktmExpectedDaily = loadJson('data/ktm/ktm_expected_pattern_by_line.json');

// build __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

*/

// build __dirname in ESM (put this near the top, before loadJson is used)
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// --- Helper to load JSON files relative to /server ---
function loadJson(relativePath, fallback = null) {
  const fullPath = path.join(__dirname, relativePath);

  try {
    const raw = fs.readFileSync(fullPath, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    console.error(`❌ Failed to load JSON: ${relativePath}`);
    console.error("   Path:", fullPath);
    console.error("   Reason:", err.message);
    return fallback;
  }
}

// --- Load KTM datasets (now correctly reads from server/data/...) ---
const ktmStations      = loadJson("data/ktm/ktm_stations.json", []);
const komuterHourly    = loadJson("data/ktm/ktm_hourly_pattern_by_station_dow.json", []);
const ktmExpectedDaily = loadJson("data/ktm/ridership_expected_pattern_by_line.json", []);
const stationIdToName  = new Map(ktmStations.map((s) => [s.id, s.name]));

// absolute path to /server/data/... (for LRT/MRT/Monorail next-7-days by line)
const next7Path = path.join(__dirname, "data", "ridership_next7days_by_line.json");

// --- Load line daily average ridership for heatmap ---
const lineDailyAvgPath = path.join(__dirname, "data", "line_daily_avg_ridership.json");

let lineDailyAvg = [];
try {
  if (fs.existsSync(lineDailyAvgPath)) {
    const raw = fs.readFileSync(lineDailyAvgPath, "utf-8");
    lineDailyAvg = JSON.parse(raw);
    console.log(`✅ Loaded line_daily_avg_ridership.json with ${lineDailyAvg.length} lines`);
  } else {
    console.error("❌ line_daily_avg_ridership.json not found at:", lineDailyAvgPath);
  }
} catch (err) {
  console.error("❌ Failed to load line_daily_avg_ridership.json:", err);
}

// Debug: Check if file exists
console.log("Looking for file at:", next7Path);
console.log("File exists:", fs.existsSync(next7Path));

let next7ByLine = [];
try {
  if (fs.existsSync(next7Path)) {
    const fileContent = fs.readFileSync(next7Path, "utf-8");
    next7ByLine = JSON.parse(fileContent);
    console.log(`✅ Successfully loaded ridership_next7days_by_line.json with ${next7ByLine.length} records`);
  } else {
    console.error("❌ File does not exist:", next7Path);
  }
} catch (err) {
  console.error("❌ Failed to load or parse ridership_next7days_by_line.json", err);
}

// ========== ATTRACTIONS ==========

// Use Cloudinary storage for attraction photos
const upload = multer({ storage });

// Add a new nearby attraction for a station (no admin approval yet)
router.post(
  "/stations/:stationId/attractions",
  requireAuth,
  upload.single("photo"),
  async (req, res) => {
    const { stationId } = req.params;

    try {
      console.log("➕ Add attraction hit for station:", stationId);
      console.log("   req.user:", req.user);
      console.log("   req.body:", req.body);
      console.log("   req.file:", req.file);

      let data = {};
      try {
        data = JSON.parse(req.body.data || "{}");
      } catch (parseErr) {
        console.error("❌ Failed to parse req.body.data:", parseErr);
        return res
          .status(400)
          .json({ ok: false, error: "Invalid attraction payload JSON" });
      }

      const {
        name,
        category,
        address,
        website,
        mapLocation,
        openingHours,
        distanceMeters,
        travelTimeMinutes,
        commuteOption,
        atrLatitude,
        atrLongitude,
        existingAtrId,
      } = data;

      if (existingAtrId && req.file) {
        return res.status(400).json({
          ok: false,
          error:
            "Photo upload is disabled when using autofill (existing attraction). Use Request edit to change the photo.",
        });
      }

      if (!name) {
        return res.status(400).json({ ok: false, error: "Name is required" });
      }

      const userId = req.user.userId;   // from JWT

      const distanceVal =
        distanceMeters !== undefined && distanceMeters !== ""
          ? Number(distanceMeters)
          : null;
      const travelTimeVal =
        travelTimeMinutes !== undefined && travelTimeMinutes !== ""
          ? Number(travelTimeMinutes)
          : null;
      const latVal =
        atrLatitude !== undefined && atrLatitude !== ""
          ? Number(atrLatitude)
          : null;
      const lngVal =
        atrLongitude !== undefined && atrLongitude !== ""
          ? Number(atrLongitude)
          : null;

      const coverImageUrl = req.file
        ? req.file.path // Cloudinary returns the full URL in req.file.path
        : null;

      const insertAttractionSql = `
      INSERT INTO attraction (
        userid,
        atrname,
        atrcategory,
        atraddress,
        atrwebsite,
        atrmaplocation,
        atrlatitude,
        atrlongitude,
        coverimageurl,
        openinghours,
        isverified,
        status
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12
      )
      RETURNING
        atrid,
        userid,
        atrname,
        atrcategory,
        atraddress,
        atrwebsite,
        atrmaplocation,
        atrlatitude,
        atrlongitude,
        coverimageurl,
        openinghours,
        isverified,
        status,
        created_at
    `;

      const attrValues = [
        userId,
        name,
        category && category.trim() ? category.trim() : null,
        address || null,
        website || null,
        mapLocation || null,
        latVal,
        lngVal,
        coverImageUrl,
        openingHours || null,
        false,         // not verified yet
        "pending",     // pending until admin approves
      ];

      // 1) Decide which atrid to use
      let atrIdToUse = existingAtrId ? Number(existingAtrId) : null;
      let attractionRow = null;

      if (atrIdToUse) {
        // verify the attraction exists and fetch it
        const { rows: checkRows } = await query(
          `SELECT
            atrid, userid, atrname, atrcategory, atraddress, atrwebsite, atrmaplocation,
            atrlatitude, atrlongitude, coverimageurl, openinghours, isverified, status, created_at
          FROM attraction
          WHERE atrid = $1`,
          [atrIdToUse]
        );

        if (!checkRows.length) {
          return res.status(400).json({ ok: false, error: "Selected attraction not found." });
        }

        attractionRow = checkRows[0];
      } else {
        // create a NEW attraction only when user didn't pick existing suggestion
        const { rows: createdRows } = await query(insertAttractionSql, attrValues);
        attractionRow = createdRows[0];
        atrIdToUse = attractionRow.atrid;
      }

      const linkSql = `
        INSERT INTO attraction_station
          (stationid, atrid, distance, traveltimeminutes, commuteoption)
        VALUES
          ($1, $2, $3, $4, $5)
        ON CONFLICT (stationid, atrid)
        DO UPDATE SET
          distance = EXCLUDED.distance,
          traveltimeminutes = EXCLUDED.traveltimeminutes,
          commuteoption = EXCLUDED.commuteoption
      `;

      await query(linkSql, [
        stationId,
        atrIdToUse,
        distanceVal,
        travelTimeVal,
        commuteOption || null,
      ]);

      res.status(201).json({ ok: true, attraction: attractionRow, atrid: atrIdToUse });

    } catch (err) {
      console.error("❌ Error inserting attraction:", err);
      res.status(500).json({
        ok: false,
        error: "Failed to add attraction",
        details: err.message,        // important
      });
    }
  }
);

// POST /api/attractions/:atrId/reviews
// Create or update a review for this attraction by the current user
router.post('/attractions/:atrId/reviews', requireAuth, async (req, res) => {
  try {
    const atrId = Number(req.params.atrId);
    const userId = req.user.userId;
    const { rating, review } = req.body;

    if (!atrId || !Number.isInteger(atrId)) {
      return res.status(400).json({ message: 'Invalid attraction id.' });
    }

    const numericRating = Number(rating);
    if (!numericRating || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5.' });
    }

    const comment = typeof review === 'string' ? review.trim() : null;

    const sql = `
      INSERT INTO attraction_review (atrid, userid, review, rating)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (atrid, userid)
      DO UPDATE SET
        review     = EXCLUDED.review,
        rating     = EXCLUDED.rating,
        created_at = NOW()
      RETURNING revid, atrid, userid, review, rating, created_at;
    `;

    const values = [atrId, userId, comment, numericRating];
    const { rows } = await query(sql, values);

    // optionally, you can also return updated avg rating & count
    const aggSql = `
      SELECT
        COALESCE(AVG(rating), 0) AS averagerating,
        COUNT(*)                 AS reviewcount
      FROM attraction_review
      WHERE atrid = $1;
    `;
    const { rows: aggRows } = await query(aggSql, [atrId]);

    return res.status(201).json({
      review: rows[0],
      aggregate: aggRows[0]
    });
  } catch (err) {
    console.error('Error saving review:', err);
    return res.status(500).json({ message: 'Failed to save review.' });
  }
});

// GET /api/attractions/:atrId/reviews
// Return all reviews (with username) for a given attraction
router.get('/attractions/:atrId/reviews', async (req, res) => {
  try {
    const atrId = Number(req.params.atrId);

    if (!atrId || !Number.isInteger(atrId)) {
      return res.status(400).json({ message: 'Invalid attraction id.' });
    }

    const sql = `
      SELECT
        r.revid       AS reviewid,
        r.atrid,
        r.userid,
        r.review,
        r.rating,
        r.created_at,
        u.username
      FROM attraction_review r
      JOIN "USER" u ON u.userid = r.userid
      WHERE r.atrid = $1
      ORDER BY r.created_at DESC;
    `;

    const { rows } = await query(sql, [atrId]);

    return res.json({
      reviews: rows,
    });
  } catch (err) {
    console.error('Error loading reviews for attraction:', err);
    return res.status(500).json({ message: 'Failed to load reviews.' });
  }
});

// ========== KTM ENDPOINTS ==========

// GET /api/ktm/stations
router.get('/ktm/stations', (req, res) => {
  res.json(ktmStations);
});

// GET /api/ktm/hourly?station=AG2&dow=1
// dow: 0=Monday ... 6=Sunday (optional: if missing, return all 0-6)
router.get("/ktm/hourly", (req, res) => {
  const { station, dow } = req.query;

  if (!station) {
    return res.status(400).json({
      error: "station query parameter is required, e.g. ?station=KT16&dow=1",
    });
  }

  if (!Array.isArray(komuterHourly) || komuterHourly.length === 0) {
    return res.status(503).json({
      error: "KTM hourly pattern not available (JSON not loaded)",
    });
  }

  const stationName = stationIdToName.get(station);
  if (!stationName) {
    return res.status(404).json({ error: `Unknown station id: ${station}` });
  }

  const dowNum = dow !== undefined ? Number(dow) : undefined;
  if (dow !== undefined && (Number.isNaN(dowNum) || dowNum < 0 || dowNum > 6)) {
    return res.status(400).json({ error: "dow must be 0..6" });
  }

  // New JSON fields: station, expected_ridership
  let filtered = komuterHourly.filter((row) => row.station === stationName);

  if (dowNum !== undefined) {
    filtered = filtered.filter((row) => row.dow === dowNum);
  }

  // Convert to what frontend expects: hour + avg_ridership
  const mapped = filtered.map((row) => ({
    hour: row.hour,
    avg_ridership: row.expected_ridership,
  }));

  mapped.sort((a, b) => a.hour - b.hour);

  // Guarantee 24 points when dow is provided
  if (dowNum !== undefined) {
    const byHour = new Map(mapped.map((r) => [r.hour, r]));
    const full = [];
    for (let h = 0; h < 24; h++) {
      full.push(byHour.get(h) ?? { hour: h, avg_ridership: 0 });
    }
    return res.json(full);
  }

  res.json(mapped);
});

// ========== OLDDD LRT/MRT/MONORAIL NEXT-7-LINE ==========

// LRT/MRT/Monorail - GET next 7 days per line predictions
router.get("/ridership/next7days_by_line", (req, res) => {
  if (next7ByLine.length === 0) {
    return res.status(503).json({ 
      error: "Prediction data not available",
      message: "Ridership predictions are still loading or file is missing"
    });
  }
  res.json(next7ByLine);
});

// ========== LRT/MRT/MONORAIL RIDERSHIP TREND AND INSIGHTS ==========

// Helper to load JSON safely
function readJson(relativePath) {
  // __dirname points to .../transit-app/server
  const fullPath = path.join(__dirname, 'data', relativePath);
  console.log("Reading JSON from:", fullPath);
  const raw = fs.readFileSync(fullPath, 'utf8');
  return JSON.parse(raw);
}

/**
 * 1) Insights overview (weekly, seasonality, holidays, personalities)
 * GET /api/ridership/insights-overview
 */
router.get('/ridership/insights-overview', (req, res) => {
  try {
    const data = readJson('ridership_insights_overview.json');
    res.json(data);
  } catch (err) {
    console.error('Failed to load insights overview JSON', err);
    res.status(500).json({ message: 'Failed to load insights overview' });
  }
});

/**
 * 2) Expected pattern by line (future forecast)
 * GET /api/ridership/expected-pattern
 */
router.get('/ridership/expected-pattern', (req, res) => {
  try {
    const { line_code, start_date, end_date } = req.query;

    let records = readJson('ridership_expected_pattern_by_line.json');

    if (line_code) {
      records = records.filter(r => r.line_code === line_code);
    }

    if (start_date) {
      records = records.filter(r => r.date >= start_date);
    }
    if (end_date) {
      records = records.filter(r => r.date <= end_date);
    }

    res.json(records);
  } catch (err) {
    console.error('Failed to load expected pattern JSON', err);
    res.status(500).json({ message: 'Failed to load expected pattern' });
  }
});

// GET /api/ktm/expected-pattern?stationId=KT16&start_date=2025-12-23&end_date=2025-12-29
router.get("/ktm/expected-pattern", (req, res) => {
  try {
    const { stationId, start_date, end_date } = req.query;

    if (!Array.isArray(ktmExpectedDaily) || ktmExpectedDaily.length === 0) {
      return res.status(503).json({ error: "KTM expected daily pattern not available" });
    }

    let records = ktmExpectedDaily;

    if (stationId) {
      records = records.filter((r) => r.station_id === stationId);
    }

    if (start_date) {
      records = records.filter((r) => r.date >= start_date);
    }
    if (end_date) {
      records = records.filter((r) => r.date <= end_date);
    }

    // keep sorted
    records.sort((a, b) => (a.date < b.date ? -1 : 1));

    res.json(records);
  } catch (err) {
    console.error("Failed to serve KTM expected-pattern", err);
    res.status(500).json({ error: "Failed to load KTM expected pattern" });
  }
});

// GET /api/ktm/next7days?station=KT16
router.get("/ktm/next7days", (req, res) => {
  try {
    const { station } = req.query;

    if (!station) {
      return res.status(400).json({
        error: "station query parameter is required, e.g. ?station=KT16",
      });
    }

    if (!Array.isArray(ktmExpectedDaily) || ktmExpectedDaily.length === 0) {
      return res.status(503).json({ error: "KTM expected pattern not available" });
    }

    // 1) filter to this station
    let rows = ktmExpectedDaily
      .filter((r) => r.station_id === station)
      .sort((a, b) => String(a.date).localeCompare(String(b.date)));

    if (rows.length === 0) return res.json([]);

    // 2) same "future window" logic you used before
    const todayStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    let future = rows.filter((r) => String(r.date) >= todayStr);

    // 3) fallback if no future rows
    if (future.length === 0) {
      future = rows.slice(-7);
    } else {
      future = future.slice(0, 7);
    }

    res.json(future);
  } catch (err) {
    console.error("Failed to load KTM next7days", err);
    res.status(500).json({ error: "Failed to load KTM 7-day prediction" });
  }
});

/**
 * 3) Model metrics per line
 * GET /api/ridership/model-metrics
 */
router.get('/ridership/model-metrics', (req, res) => {
  try {
    const rows = readJson('ridership_model_metrics_by_line.json');
    res.json(rows);
  } catch (err) {
    console.error('Failed to load metrics JSON', err);
    res.status(500).json({ message: 'Failed to load model metrics' });
  }
});

// ========== ATTRACTIONS ==========
// GET /api/stations/:stationID/attractions
router.get("/stations/:stationID/attractions", async (req, res) => {
  const { stationID } = req.params;

  try {
    const sql = `
      SELECT
        a.atrid,
        a.atrname,
        a.atrcategory,
        a.atraddress,
        a.atrmaplocation,
        a.atrwebsite,
        a.atrlatitude,
        a.atrlongitude,
        a.coverimageurl,
        a.openinghours,
        a.isverified,

        s.distance,
        s.traveltimeminutes,
        s.commuteoption,

        COALESCE(AVG(r.rating), 0)       AS averagerating,
        COUNT(r.revid)                   AS reviewcount

      FROM attraction_station s
      JOIN attraction a
        ON s.atrid = a.atrid
      LEFT JOIN attraction_review r
        ON r.atrid = a.atrid
      WHERE s.stationid = $1 AND a.status = 'approved' 
      GROUP BY
        a.atrid,
        a.atrname,
        a.atrcategory,
        a.atraddress,
        a.atrmaplocation,
        a.atrwebsite,
        a.atrlatitude,
        a.atrlongitude,
        a.coverimageurl,
        a.openinghours,
        a.isverified,
        s.distance,
        s.traveltimeminutes,
        s.commuteoption
      ORDER BY
        s.distance NULLS LAST,
        averagerating DESC;
    `;

    const { rows } = await query(sql, [stationID]);

    return res.json({
      stationID,
      attractions: rows,
    });
  } catch (err) {
    console.error("❌ Error fetching attractions for station:", stationID, err);
    return res.status(500).json({
      error: "Failed to fetch attractions for this station",
    });
  }
});

// CREATE a new edit/delete request for an attraction
router.post("/attractions/requests", requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;

    const { type, data } = req.body || {};
    const requestTypeRaw = (type || "").toLowerCase();  // e.g. "EDIT" -> "edit"

    if (!["edit", "delete"].includes(requestTypeRaw)) {
      return res.status(400).json({ message: "Invalid request type." });
    }

    if (!data || !data.atrid) {
      return res.status(400).json({ message: "Attraction id is required." });
    }

    const atrId = Number(data.atrid);
    if (!Number.isInteger(atrId) || atrId <= 0) {
      return res.status(400).json({ message: "Invalid attraction id." });
    }

    const stationId = data.stationID || null;      // optional, but nice for indexing
    const reason    = data.reason || null;         // for delete / general
    const changes   = data.requestedChanges || null; // for edit (we'll hook this later)

    // Optional: snapshot current attraction row for admin context
    let existingSnapshot = null;
    try {
      const { rows } = await query(
        `
          SELECT
            a.atrid,
            a.atrname,
            a.atrcategory,
            a.atraddress,
            a.atrmaplocation,
            a.atrwebsite,
            a.atrlatitude,
            a.atrlongitude,
            a.coverimageurl,
            a.openinghours,
            a.isverified,
            a.status,
            ast.stationid,
            ast.distance,
            ast.traveltimeminutes,
            ast.commuteoption
          FROM attraction a
          LEFT JOIN attraction_station ast ON ast.atrid = a.atrid
          WHERE a.atrid = $1
          LIMIT 1;
        `,
        [atrId]
      );
      if (rows.length) {
        existingSnapshot = rows[0];
      }
    } catch (snapErr) {
      console.warn("⚠️ Failed to load existing snapshot for attraction", atrId, snapErr);
    }

    const insertSql = `
      INSERT INTO attraction_request (
        atrid,
        stationid,
        requested_by,
        request_type,
        existing_snapshot,
        requested_changes,
        reason,
        status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
      RETURNING requestid, atrid, stationid, request_type, status, created_at;
    `;

    const values = [
      atrId,
      stationId,
      userId,
      requestTypeRaw,
      existingSnapshot ? JSON.stringify(existingSnapshot) : null,
      changes ? JSON.stringify(changes) : null,
      reason,
    ];

    const { rows } = await query(insertSql, values);
    const newRequest = rows[0];

    console.log("📬 New attraction request saved:", newRequest);

    return res.status(201).json({ ok: true, request: newRequest });
  } catch (err) {
    console.error("Error creating attraction request:", err);
    return res.status(500).json({ message: "Failed to create attraction request." });
  }
});

// --- USER PROFILE: attractions submitted by this user ---
router.get('/users/:userId/attractions', async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    if (!userId) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    const sql = `
      SELECT 
        a.atrid,
        a.atrname,
        a.atrcategory,
        a.atraddress,
        a.atrmaplocation,
        a.atrwebsite,
        a.coverimageurl,
        a.isverified,
        a.status,
        a.admin_remark,
        a.reviewed_at,
        a.created_at,
        s.stationname,
        s.stationid,
        ast.distance,
        ast.traveltimeminutes,
        ast.commuteoption
      FROM attraction a
      LEFT JOIN attraction_station ast ON ast.atrid = a.atrid
      LEFT JOIN station s ON s.stationid = ast.stationid
      WHERE a.userid = $1
      ORDER BY a.created_at DESC;
    `;

    const { rows } = await query(sql, [userId]);  // ✅
    res.json({ attractions: rows });              // ✅

  } catch (err) {
    console.error("Error loading user attractions:", err);
    res.status(500).json({ message: "Failed to load attractions." });
  }
});

// GET /api/users/:userId/attraction-requests
router.get("/users/:userId/attraction-requests", requireAuth, async (req, res) => {
    try {
      const userId = Number(req.params.userId);
      if (!userId) {
        return res.status(400).json({ message: "Invalid user id" });
      }

      // only owner or admin
      if (req.user.userId !== userId && req.user.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }

      const sql = `
        SELECT
          ar.requestid,
          ar.atrid,
          ar.stationid,
          ar.request_type,
          ar.reason,
          ar.status,
          ar.admin_remark,
          ar.created_at,
          ar.handled_at,
          ar.existing_snapshot,
          ar.requested_changes,
          a.atrname
        FROM attraction_request ar
        LEFT JOIN attraction a ON a.atrid = ar.atrid
        WHERE ar.requested_by = $1
        ORDER BY ar.created_at DESC;
      `;

      const { rows } = await query(sql, [userId]);
      res.json({ requests: rows });
    } catch (err) {
      console.error("Error loading user attraction requests:", err);
      res.status(500).json({ message: "Failed to load attraction requests." });
    }
  }
);

// --- USER PROFILE: reviews submitted by this user ---
router.get('/users/:userId/reviews', async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    if (!userId) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    const sql = `
      SELECT
        r.revid,
        r.rating,
        r.review AS comment,
        r.created_at,

        a.atrid,
        a.atrname,
        a.coverimageurl
      FROM attraction_review r
      JOIN attraction a ON a.atrid = r.atrid
      WHERE r.userid = $1
      ORDER BY r.created_at DESC;
    `;

    const { rows } = await query(sql, [userId]);  // grab rows array only
    res.json({ reviews: rows });                  // now reviews is an array

  } catch (err) {
    console.error("Error loading user reviews:", err);
    res.status(500).json({ message: "Failed to load reviews." });
  }
});

// GET /api/attractions/explore?q=&category=&stationID=
// Simple search endpoint for ExplorePanel
router.get("/attractions/explore", async (req, res) => {
  try {
    const { q, category, stationID } = req.query;

    const whereClauses = ["a.status = 'approved'"];
    const params = [];
    let i = 1;

    if (q && q.trim()) {
      whereClauses.push(`a.atrname ILIKE $${i++}`);
      params.push(`%${q.trim()}%`);
    }

    if (category && category.trim()) {
      whereClauses.push(`a.atrcategory = $${i++}`);
      params.push(category.trim());
    }

    if (stationID && stationID.trim()) {
      whereClauses.push(`s.stationid = $${i++}`);
      params.push(stationID.trim());
    }

    const whereSql = whereClauses.join(" AND ");

    const sql = `
      SELECT
        a.atrid,
        a.atrname,
        a.atrcategory,
        a.atraddress,
        a.atrmaplocation,
        a.atrwebsite,
        a.atrlatitude,
        a.atrlongitude,
        a.coverimageurl,
        a.openinghours,
        a.isverified,

        s.stationid,
        s.stationname,

        COALESCE(AVG(r.rating), 0) AS averagerating,
        COUNT(r.revid)            AS reviewcount

      FROM attraction a
      JOIN attraction_station ast
        ON ast.atrid = a.atrid
      JOIN station s
        ON s.stationid = ast.stationid
      LEFT JOIN attraction_review r
        ON r.atrid = a.atrid

      WHERE ${whereSql}
      GROUP BY
        a.atrid,
        a.atrname,
        a.atrcategory,
        a.atraddress,
        a.atrmaplocation,
        a.atrwebsite,
        a.atrlatitude,
        a.atrlongitude,
        a.coverimageurl,
        a.openinghours,
        a.isverified,
        s.stationid,
        s.stationname

      ORDER BY
        averagerating DESC,
        a.atrname ASC
      LIMIT 50;
    `;

    const { rows } = await query(sql, params);

    res.json({ attractions: rows });
  } catch (err) {
    console.error("❌ Error searching attractions (explore):", err);
    res.status(500).json({ message: "Failed to search attractions." });
  }
});

// SEARCH attractions for ExplorePanel
router.get("/attractions/search", async (req, res) => {
  try {
    const q = String(req.query.q ?? "").trim();
    const category = String(req.query.category ?? "").trim();

    const params = [];
    const where = [];

    where.push(`a.status = 'approved'`);

    if (q) {
      params.push(`%${q}%`);
      where.push(`a.atrname ILIKE $${params.length}`);
    }

    if (category && category.toUpperCase() !== "ALL") {
      params.push(category);
      where.push(`LOWER(a.atrcategory) = LOWER($${params.length})`);
    }

    const whereSql = where.length ? "WHERE " + where.join(" AND ") : "";

    const sql = `
      SELECT
        a.atrid,
        a.atrname,
        a.atrcategory,
        a.atraddress,
        a.atrmaplocation,
        a.atrwebsite,
        a.coverimageurl,
        a.atrlatitude,
        a.atrlongitude,
        a.openinghours,

        COALESCE(AVG(r.rating), 0) AS averagerating,
        COUNT(DISTINCT r.revid)    AS reviewcount,

        -- ✅ ALL nearby stations for this attraction
        COALESCE(
          JSONB_AGG(
            DISTINCT JSONB_BUILD_OBJECT(
              'stationid', s.stationid,
              'stationname', s.stationname,
              'distance', ast.distance,
              'traveltimeminutes', ast.traveltimeminutes,
              'commuteoption', ast.commuteoption
            )
          ) FILTER (WHERE s.stationid IS NOT NULL),
          '[]'::jsonb
        ) AS stations

      FROM attraction a
      LEFT JOIN attraction_review r
        ON r.atrid = a.atrid

      LEFT JOIN attraction_station ast
        ON ast.atrid = a.atrid
      LEFT JOIN station s
        ON s.stationid = ast.stationid

      ${whereSql}

      GROUP BY a.atrid
      ORDER BY a.atrname ASC
      LIMIT 50;
    `;

    const dbResult = await query(sql, params);
    res.json(dbResult.rows);
  } catch (err) {
    console.error("Error in /api/attractions/search:", err);
    res.status(500).json({ message: "Failed to search attractions" });
  }
});

// GET /api/attractions/similar?q=searchTerm
// Search for similar attractions (for autofill suggestions)
router.get("/attractions/similar", async (req, res) => {
  try {
    const { q = "" } = req.query;

    if (!q.trim()) {
      return res.json({ attractions: [] });
    }

    const searchTerm = `%${q.trim()}%`;
    const sql = `
      SELECT
        a.atrid,
        a.atrname,
        a.atrcategory,
        a.atraddress,
        a.atrwebsite,
        a.atrmaplocation,
        a.atrlatitude,
        a.atrlongitude,
        a.coverimageurl,
        a.openinghours,
        a.isverified,

        COALESCE(AVG(r.rating), 0) AS averagerating,
        COUNT(r.revid) AS reviewcount

      FROM attraction a
      LEFT JOIN attraction_review r ON r.atrid = a.atrid
      WHERE a.status = 'approved' 
        AND a.atrname ILIKE $1
      GROUP BY
        a.atrid,
        a.atrname,
        a.atrcategory,
        a.atraddress,
        a.atrwebsite,
        a.atrmaplocation,
        a.atrlatitude,
        a.atrlongitude,
        a.coverimageurl,
        a.openinghours,
        a.isverified
      ORDER BY
        a.isverified DESC,
        averagerating DESC,
        a.atrname ASC
      LIMIT 10;
    `;

    const { rows } = await query(sql, [searchTerm]);
    res.json({ attractions: rows });
  } catch (err) {
    console.error("Error in /api/attractions/similar:", err);
    res.status(500).json({ message: "Failed to search similar attractions" });
  }
});

// ==================== ADMIN: USERS ====================

// Shared SQL for both "edit" and "decision"
const ADMIN_UPDATE_ATTR_SQL = `
  UPDATE attraction
  SET
    atrname        = COALESCE($1, atrname),
    atrcategory    = COALESCE($2, atrcategory),
    atraddress     = COALESCE($3, atraddress),
    atrmaplocation = COALESCE($4, atrmaplocation),
    atrwebsite     = COALESCE($5, atrwebsite),
    openinghours   = COALESCE($6, openinghours),

    -- status change (varchar)
    status         = COALESCE($7::varchar, status),

    -- auto toggle isverified
    isverified     = CASE 
                       WHEN $7::varchar  = 'approved' THEN TRUE
                       WHEN $7::varchar  = 'rejected' THEN FALSE
                       ELSE isverified
                     END,

    -- admin remark (text)
    admin_remark   = COALESCE($8::text, admin_remark),

    -- reviewer metadata
    reviewed_by    = CASE WHEN $7 IS NOT NULL THEN $9 ELSE reviewed_by END,
    reviewed_at    = CASE WHEN $7 IS NOT NULL THEN NOW() ELSE reviewed_at END

  WHERE atrid = $10
  RETURNING *;
`;

/**
 * ⭐️ Core admin attraction update function
 * Handles both PATCH (full edit) and POST (decision-only)
 */
async function updateAttractionAdmin(atrId, fields, reviewerId) {
  const {
    atrName = null,
    atrCategory = null,
    atrAddress = null,
    atrMapLocation = null,
    atrWebsite = null,
    openingHours = null,
    status = null,
    adminRemark = null
  } = fields;

  const values = [
    atrName,
    atrCategory,
    atrAddress,
    atrMapLocation,
    atrWebsite,
    openingHours,
    status,
    adminRemark,
    reviewerId,
    atrId
  ];

  const { rows } = await query(ADMIN_UPDATE_ATTR_SQL, values);
  return rows[0];
}

// GET /api/admin/users  -> list users + basic stats
router.get('/admin/users', requireAuth, requireAdmin, async (req, res) => {
  try {
    const sql = `
      SELECT
        u.userid,
        u.username,
        u.role,
        COUNT(DISTINCT a.atrid) AS attractions_count,
        COUNT(DISTINCT r.revid) AS reviews_count
      FROM "USER" u
      LEFT JOIN attraction a
        ON a.userid = u.userid
      LEFT JOIN attraction_review r
        ON r.userid = u.userid
      GROUP BY u.userid, u.username, u.role
      ORDER BY u.userid;
    `;

    const { rows } = await query(sql, []);
    res.json({ users: rows });
  } catch (err) {
    console.error("Error loading admin users:", err);
    res.status(500).json({ message: "Failed to load users." });
  }
});

// PATCH /api/admin/users/:userId  -> change user role
// PATCH /api/admin/users/:userId  -> change user role
router.patch('/admin/users/:userId', requireAuth, requireAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);

    // normalise role from body
    const rawRole = req.body?.role;
    const role =
      typeof rawRole === "string" ? rawRole.trim().toLowerCase() : "";

    const ALLOWED_ROLES = ["commuter", "admin", "banned"];

    console.log("PATCH /admin/users", { userId, rawRole, normalised: role });

    if (!Number.isInteger(userId) || userId <= 0 || !ALLOWED_ROLES.includes(role)) {
      return res.status(400).json({ message: "Invalid user id or role." });
    }

    // optional: prevent admin from demoting themselves
    if (userId === req.user.userId && role !== "admin") {
      return res
        .status(400)
        .json({ message: "You cannot change your own role." });
    }

    const sql = `
      UPDATE "USER"
      SET role = $1
      WHERE userid = $2
      RETURNING userid, username, role;
    `;

    const { rows } = await query(sql, [role, userId]);
    if (!rows.length) {
      return res.status(404).json({ message: "User not found." });
    }

    res.json({ user: rows[0] });
  } catch (err) {
    console.error("Error updating user role:", err);
    res.status(500).json({ message: "Failed to update user." });
  }
});

// Admin: list all attractions (with creator, station & reviews)
// GET /api/admin/attractions?status=pending|approved|rejected|all
router.get('/admin/attractions', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { status = 'pending' } = req.query;

    const params = [];
    let whereClause = '1=1';
    if (status !== 'all') {
      params.push(status);
      whereClause = 'a.status = $1';
    }

    const sql = `
      SELECT
        a.atrid,
        a.atrname,
        a.atrcategory,
        a.atraddress,
        a.atrmaplocation,
        a.atrwebsite,
        a.atrlatitude,
        a.atrlongitude,
        a.coverimageurl,
        a.openinghours,
        a.isverified,
        a.status,
        a.admin_remark,
        a.created_at,
        a.reviewed_at,

        -- creator
        cu.userid      AS creator_id,
        cu.username    AS creator_username,

        -- reviewer
        ru.userid      AS reviewer_id,
        ru.username    AS reviewer_username,

        -- station (first linked station)
        s.stationid,
        s.stationname,

        -- reviews overview
        COALESCE(AVG(r.rating), 0) AS avg_rating,
        COUNT(r.revid)            AS review_count

      FROM attraction a
      LEFT JOIN "USER" cu
        ON cu.userid = a.userid

      LEFT JOIN "USER" ru
        ON ru.userid = a.reviewed_by

      LEFT JOIN attraction_station ast
        ON ast.atrid = a.atrid

      LEFT JOIN station s
        ON s.stationid = ast.stationid

      LEFT JOIN attraction_review r
        ON r.atrid = a.atrid

      WHERE ${whereClause}
      GROUP BY
        a.atrid,
        cu.userid, cu.username,
        ru.userid, ru.username,
        s.stationid, s.stationname
      ORDER BY a.created_at DESC;
    `;

    const { rows } = await query(sql, params);
    res.json({ attractions: rows });
  } catch (err) {
    console.error('Error loading admin attractions:', err);
    res.status(500).json({ message: 'Failed to load attractions.' });
  }
});

// Admin: update + approve / reject (with remark)
// PATCH /api/admin/attractions/:atrId
router.patch('/admin/attractions/:atrId', requireAuth, requireAdmin, async (req, res) => {
  try {
    const atrId = Number(req.params.atrId);
    if (!atrId) return res.status(400).json({ message: "Invalid attraction id" });

    const updated = await updateAttractionAdmin(atrId, req.body, req.user.userId);
    if (!updated) return res.status(404).json({ message: "Attraction not found" });

    res.json({ attraction: updated });
  } catch (err) {
    console.error("Error updating attraction (admin):", err);
    res.status(500).json({ message: "Failed to update attraction." });
  }
});

// quick approve / reject : POST /api/admin/attractions/:atrId/decision
router.post('/admin/attractions/:atrId/decision', requireAuth, requireAdmin, async (req, res) => {
  try {
    const atrId = Number(req.params.atrId);
    const { decision, adminRemark } = req.body;

    const status =
      decision === "approve" ? "approved" :
      decision === "reject"  ? "rejected" :
      null;

    if (!atrId || !status) {
      return res.status(400).json({ message: "Invalid decision or attraction id" });
    }

    const updated = await updateAttractionAdmin(
      atrId,
      { status, adminRemark },
      req.user.userId
    );

    if (!updated) return res.status(404).json({ message: "Attraction not found" });

    res.json({ attraction: updated });
  } catch (err) {
    console.error("Error deciding attraction:", err);
    res.status(500).json({ message: "Failed to save decision." });
  }
});

// ==================== ADMIN: ATTRACTION REQUESTS ====================
// GET /api/admin/attraction-requests?status=pending|approved|rejected|all
router.get("/admin/attraction-requests", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { status = "pending" } = req.query;

      const params = [];
      let whereClause = "1=1";
      if (status !== "all") {
        params.push(status);
        whereClause = "ar.status = $1";
      }

      const sql = `
        SELECT
          ar.requestid,
          ar.atrid,
          ar.stationid,
          ar.request_type,
          ar.reason,
          ar.status,
          ar.created_at,
          ar.handled_at,
          ar.requested_changes,
          ar.existing_snapshot,

          -- who requested
          u.userid   AS requester_id,
          u.username AS requester_username,

          -- which attraction
          a.atrname,
          a.atrcategory,
          a.atraddress,
          a.atrwebsite,
          a.atrmaplocation,
          a.status      AS attraction_status,
          a.isverified  AS attraction_isverified,

          -- station info (if available)
          s.stationname

        FROM attraction_request ar
        LEFT JOIN "USER" u
          ON u.userid = ar.requested_by
        LEFT JOIN attraction a
          ON a.atrid = ar.atrid
        LEFT JOIN station s
          ON s.stationid = ar.stationid

        WHERE ${whereClause}
        ORDER BY ar.created_at DESC;
      `;

      const { rows } = await query(sql, params);
      res.json({ requests: rows });
    } catch (err) {
      console.error("Error loading attraction requests (admin):", err);
      res.status(500).json({ message: "Failed to load attraction requests." });
    }
  }
);

// POST /api/admin/attraction-requests/:requestId/decision
// body: { decision: "approved" | "rejected", adminRemark?: string }
router.post(
  "/admin/attraction-requests/:requestId/decision",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const requestId = Number(req.params.requestId);
      const { decision, adminRemark } = req.body;

      if (!requestId || !["approved", "rejected"].includes(decision)) {
        return res.status(400).json({ message: "Invalid decision or request id" });
      }

      // 1) Load the request
      const { rows: reqRows } = await query(
        `SELECT * FROM attraction_request WHERE requestid = $1`,
        [requestId]
      );
      if (!reqRows.length) {
        return res.status(404).json({ message: "Request not found" });
      }
      const request = reqRows[0];

      // 2) If approved, apply the effect on attraction
      if (decision === "approved") {
        if (request.request_type === "edit" && request.requested_changes) {
          const changes = request.requested_changes; // JSONB → object in node-postgres

          // map JSON keys into updateAttractionAdmin fields
          await updateAttractionAdmin(
            request.atrid,
            {
              atrName:        changes.atrname        ?? null,
              atrCategory:    changes.atrcategory    ?? null,
              atrAddress:     changes.atraddress     ?? null,
              atrMapLocation: changes.atrmaplocation ?? null,
              atrWebsite:     changes.atrwebsite     ?? null,
              openingHours:   changes.openinghours   ?? null,
              status:         "approved", // or keep existing
              adminRemark:    adminRemark ?? null,
            },
            req.user.userId
          );

          // you might also want to update attraction_station
          // with distance / traveltimeminutes / commuteoption if you stored them
        }

        if (request.request_type === "delete") {
          // soft-delete / reject attraction
          await updateAttractionAdmin(
            request.atrid,
            {
              status:      "rejected",   // or "deleted"
              adminRemark: adminRemark ?? "Removed via admin request.",
            },
            req.user.userId
          );
        }
      }

      // 3) Update the request row itself
      const { rows: updatedReqRows } = await query(
        `
          UPDATE attraction_request
          SET 
            status = $1, 
            handled_at = NOW(),
            admin_remark = $3,
            handled_by = $4
          WHERE requestid = $2
          RETURNING *;
        `,
        [decision, requestId, adminRemark || null, req.user.userId]
      );

      console.log("✅ Attraction request decided:", updatedReqRows[0]);

      res.json({ request: updatedReqRows[0] });
    } catch (err) {
      console.error("Error deciding attraction request:", err);
      res.status(500).json({ message: "Failed to decide attraction request." });
    }
  }
);

// ==================== HEATMAP ====================
// GET /api/heatmap/daily-average
// Returns per-station daily average ridership for non-KTM systems
// YANG NI TAK GUNA PONG
router.get("/heatmap/daily-average", async (req, res) => {
  try {
    if (!lineDailyAvg.length) {
      return res.status(503).json({ error: "Heatmap line averages not loaded" });
    }

    // Map line_code -> avg ridership for quick lookup
    const lineCodeToAvg = {};
    for (const row of lineDailyAvg) {
      lineCodeToAvg[row.line_code] = row.avg_daily_ridership;
    }

    // Map your DB lineid -> line_code used in RF dataset
    const lineIdToCode = {
      "3": "rail_lrt_ampang",
      "4": "rail_lrt_ampang",
      "5": "rail_lrt_kj",
      "8": "rail_monorail",
      "9": "rail_mrt_kajang",
      "12": "rail_mrt_pjy",
      // no KTM, no ETS, no Intercity, no Tebrau, no ERL
    };

    // Query stations + lines (same as your /stations route)
    const stationQuery = `
      SELECT 
        s.stationid,
        s.stationname,
        s.stationlatitude,
        s.stationlongitude,
        s.isactive,
        sl.lineid,
        sl.sequenceonline,
        l.linename,
        l.linecolourhex
      FROM station s
      JOIN station_line sl ON s.stationid = sl.stationid
      JOIN line l ON sl.lineid = l.lineid
      WHERE s.isactive = TRUE
      ORDER BY sl.lineid, sl.sequenceonline;
    `;

    const { rows: stations } = await query(stationQuery);

    // Group stations by lineid
    const stationsByLine = {};
    for (const s of stations) {
      const lineid = s.lineid;
      if (!lineIdToCode[lineid]) continue; // skip lines we don't want

      if (!stationsByLine[lineid]) stationsByLine[lineid] = [];
      stationsByLine[lineid].push(s);
    }

    const stationPoints = [];

    for (const [lineid, stationList] of Object.entries(stationsByLine)) {
      const lineCode = lineIdToCode[lineid];
      const avgLineRidership = lineCodeToAvg[lineCode];
      if (!avgLineRidership) continue;

      const perStation = avgLineRidership / stationList.length;

      stationList.forEach((s) => {
        if (s.stationlatitude == null || s.stationlongitude == null) return;

        stationPoints.push({
          station_id: s.stationid,
          station_name: s.stationname,
          lat: Number(s.stationlatitude),
          lng: Number(s.stationlongitude),
          line_id: lineid,
          line_name: s.linename,
          line_colour_hex: s.linecolourhex,
          avg_daily_ridership: perStation,
        });
      });
    }

    if (stationPoints.length === 0) {
      return res.status(500).json({ error: "No stations available for heatmap" });
    }

    // Normalise for heatmap weights
    const maxR = Math.max(...stationPoints.map((p) => p.avg_daily_ridership));
    stationPoints.forEach((p) => {
      p.weight = p.avg_daily_ridership / maxR; // between 0 and 1
    });

    res.json(stationPoints);
  } catch (err) {
    console.error("❌ Error building daily-average heatmap:", err);
    res.status(500).json({ error: "Failed to build daily-average heatmap" });
  }
});

// Today's prediction heatmap
// GET /api/heatmap/today-forecast
// Uses RF line-level forecast for "today", distributes to stations.
router.get("/heatmap/today-forecast", async (req, res) => {
  try {
    if (!lineExpectedPattern.length) {
      return res
        .status(503)
        .json({ error: "Expected pattern data not loaded" });
    }

    // 1) Decide which date to show
    //    - default: today (YYYY-MM-DD)
    //    - allow ?date=YYYY-MM-DD override (nice for testing)
    const paramDate = req.query.date;
    const todayStr = new Date().toISOString().slice(0, 10);
    const targetDate = paramDate || todayStr;

    // 2) Filter RF rows for that date
    // Adjust field names if your JSON uses slightly different ones
    let rowsForDate = lineExpectedPattern.filter(
      (r) => String(r.date).slice(0, 10) === targetDate
    );

    // Fallback: if no exact match, use latest available date in the file
    if (!rowsForDate.length) {
      const maxDate = lineExpectedPattern.reduce((max, r) => {
        const d = String(r.date).slice(0, 10);
        return d > max ? d : max;
      }, "0000-00-00");

      rowsForDate = lineExpectedPattern.filter(
        (r) => String(r.date).slice(0, 10) === maxDate
      );
    }

    if (!rowsForDate.length) {
      return res
        .status(500)
        .json({ error: "No forecast rows available for any date" });
    }

    // 3) Map line_code -> today's predicted ridership
    // (adjust the property names if needed)
    const lineCodeToForecast = {};
    for (const r of rowsForDate) {
      const code = r.line_code || r.line || r.feature; // be a bit defensive
      const val =
        r.expected_line_ridership ??
        r.expected_ridership ??
        r.y_hat ??
        r.prediction ??
        null;

      if (!code || val == null) continue;
      lineCodeToForecast[code] = val;
    }

    if (!Object.keys(lineCodeToForecast).length) {
      return res
        .status(500)
        .json({ error: "No line-level forecast values for target date" });
    }

    // 4) Map your DB lineid -> RF line_code (same idea as daily-average)
    const lineIdToCode = {
      "3": "rail_lrt_ampang",
      "4": "rail_lrt_ampang",
      "5": "rail_lrt_kj",
      "8": "rail_monorail",
      "9": "rail_mrt_kajang",
      "12": "rail_mrt_pjy",
      // still no KTM / ERL here
    };

    // 5) Fetch all active stations + line info (same query as before)
    const stationQuery = `
      SELECT 
        s.stationid,
        s.stationname,
        s.stationlatitude,
        s.stationlongitude,
        s.isactive,
        sl.lineid,
        sl.sequenceonline,
        l.linename,
        l.linecolourhex
      FROM station s
      JOIN station_line sl ON s.stationid = sl.stationid
      JOIN line l ON sl.lineid = l.lineid
      WHERE s.isactive = TRUE
      ORDER BY sl.lineid, sl.sequenceonline;
    `;

    const { rows: stations } = await query(stationQuery);

    // 6) Group stations by DB lineid, but only keep lines that have a forecast
    const stationsByLine = {};
    for (const s of stations) {
      const lineid = String(s.lineid);
      const lineCode = lineIdToCode[lineid];

      if (!lineCode) continue; // not a rapid rail line
      if (!lineCodeToForecast[lineCode]) continue; // no forecast for this line

      if (!stationsByLine[lineid]) stationsByLine[lineid] = [];
      stationsByLine[lineid].push(s);
    }

    const stationPoints = [];

    // 7) Distribute each line's forecast equally across its stations
    for (const [lineid, stationList] of Object.entries(stationsByLine)) {
      const lineCode = lineIdToCode[lineid];
      const lineForecast = lineCodeToForecast[lineCode];
      if (!lineForecast || !stationList.length) continue;

      const perStation = lineForecast / stationList.length;

      stationList.forEach((s) => {
        if (s.stationlatitude == null || s.stationlongitude == null) return;

        stationPoints.push({
          station_id: s.stationid,
          station_name: s.stationname,
          lat: Number(s.stationlatitude),
          lng: Number(s.stationlongitude),
          line_id: Number(lineid),
          line_name: s.linename,
          line_colour_hex: s.linecolourhex,
          date: targetDate,
          predicted_station_ridership: perStation,
        });
      });
    }

    if (!stationPoints.length) {
      return res.status(500).json({
        error: "No station points generated for today's forecast",
      });
    }

    // 8) Normalise for heat weights
    const maxR = Math.max(
      ...stationPoints.map((p) => p.predicted_station_ridership)
    );
    stationPoints.forEach((p) => {
      p.weight = maxR > 0 ? p.predicted_station_ridership / maxR : 0;
    });

    res.json(stationPoints);
  } catch (err) {
    console.error("❌ Error building today-forecast heatmap:", err);
    res
      .status(500)
      .json({ error: "Failed to build today-forecast heatmap" });
  }
});

// load line-level expected pattern (RF forecast)
let lineExpectedPattern = [];
try {
  const raw = fs.readFileSync(
    path.join(__dirname, "data", "ridership_expected_pattern_by_line.json"),
    "utf8"
  );
  lineExpectedPattern = JSON.parse(raw);
  console.log(
    "✅ loaded ridership_expected_pattern_by_line.json with",
    lineExpectedPattern.length,
    "rows"
  );
} catch (err) {
  console.error(
    "❌ Failed to load ridership_expected_pattern_by_line.json:",
    err.message
  );
  lineExpectedPattern = [];
}

// ========== INSIGHTS OVERVIEW (Trend Analysis Board) ==========
// --- Load insights overview JSON once ---
let insightsOverview = null;
try {
  insightsOverview = loadJson("data/ridership_insights_overview.json");
  console.log("✅ Loaded ridership_insights_overview.json");
} catch (err) {
  console.error("❌ Failed to load ridership_insights_overview.json:", err);
}

// GET /api/insights/overview
router.get("/insights/overview", (req, res) => {
  try {
    if (!insightsOverview) {
      return res
        .status(503)
        .json({ error: "Insights overview not available on server" });
    }
    res.json(insightsOverview);
  } catch (err) {
    console.error("Error serving insights overview:", err);
    res.status(500).json({ error: "Failed to load insights overview" });
  }
});

// ========== CORE STATION & ROUTING ENDPOINTS ==========

// GET basic stations info
router.get("/stations/basic", async (req, res) => {
  const { rows } = await query(`SELECT * FROM station WHERE isactive=TRUE`);
  res.json(rows);
});

// GET stations joined with station_line and line
router.get("/stations", async (req, res) => {
  try {
    const q = `
      SELECT 
        s.stationid,
        s.stationname,
        s.stationlatitude,
        s.stationlongitude,
        s.isactive,
        sl.lineid,
        sl.sequenceonline,
        l.linename,
        l.linecolourhex
      FROM station s
      JOIN station_line sl ON s.stationid = sl.stationid
      JOIN line l ON sl.lineid = l.lineid
      WHERE s.isactive = TRUE
      ORDER BY sl.lineid, sl.sequenceonline;
    `;

    const { rows } = await query(q);
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to fetch stations + lines" });
  }
});

// Example: paramized query (prevents SQL injection)
router.get('/routes/:from/:to', async (req, res) => {
  const { from, to } = req.params;
  try {
    const { rows } = await query(
      `SELECT * FROM connection WHERE fromstationid = $1 AND tostationid = $2`,
      [from, to]
    );
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch route' });
  }
});

// --- BFS shortest path route ---
router.get('/shortest-path', async (req, res) => {
  console.log("✅ shortest-path running");

  try {
    const from = String(req.query.from || '').trim().toUpperCase();
    const to   = String(req.query.to || '').trim().toUpperCase();

    if (!from || !to) {
      return res.status(400).json({ error: "Missing 'from' or 'to' query params." });
    }

    // Load all connections
    const { rows: connections } = await query(`
      SELECT DISTINCT
        TRIM(UPPER(c.fromstationid)) AS fromstationid,
        TRIM(UPPER(c.tostationid))   AS tostationid,
        c.connectiontype,

        -- Try to load ride line info
        sl1.lineid AS ride_lineid,
        l.linecolourhex AS ride_linecolourhex

      FROM connection c

      -- sl1 = FROM station’s line (for ride)
      LEFT JOIN station_line sl1
        ON TRIM(UPPER(c.fromstationid)) = TRIM(UPPER(sl1.stationid))

      -- sl2 = TO station sharing line sl1.lineid (only ride connections)
      LEFT JOIN station_line sl2
        ON TRIM(UPPER(c.tostationid)) = TRIM(UPPER(sl2.stationid))
       AND sl1.lineid = sl2.lineid

      LEFT JOIN line l 
        ON l.lineid = sl1.lineid

      WHERE c.connectiontype IN ('ride','interchange')
      ORDER BY 1, 2;
    `);

    // build graph and lineMap
    const graph = {};
    const lineMap = {};

    for (const row of connections) {
      const a = row.fromstationid;
      const b = row.tostationid;

      // Create adjacency lists
      if (!graph[a]) graph[a] = new Set();
      if (!graph[b]) graph[b] = new Set();

      graph[a].add(b);
      graph[b].add(a);

      // Create line key for color lookup
      const key = `${a}-${b}`;
      const rkey = `${b}-${a}`;

      if (!lineMap[key]) lineMap[key] = [];
      if (!lineMap[rkey]) lineMap[rkey] = [];

      const isInterchange = row.connectiontype === "interchange";

      // Store ride OR interchange info
      lineMap[key].push({
        lineid: isInterchange ? null : (row.ride_lineid ?? null),
        linecolourhex: isInterchange ? "#999999" : (row.ride_linecolourhex ?? "#999999"),
        connectiontype: row.connectiontype
      });

      lineMap[rkey].push({
        lineid: isInterchange ? null : (row.ride_lineid ?? null),
        linecolourhex: isInterchange ? "#999999" : (row.ride_linecolourhex ?? "#999999"),
        connectiontype: row.connectiontype
      });

    }

    // Convert Sets → Arrays for BFS
    const cleanGraph = {};
    for (const k in graph) cleanGraph[k] = [...graph[k]];

    // run BFS to find K shortest paths
    const paths = findKShortestRoutes(cleanGraph, from, to, 3);

    if (!paths.length) {
      return res.json({
        from,
        to,
        numPaths: 0,
        distance: null,
        paths: []
      });
    }

    // Add colour line info to each path segment
    const finalPaths = paths.map(path =>
      path.map((stationID, idx) => {
        if (idx === 0) {
          return { stationID, lineID: null, lineColourHex: null };
        }

        const prev = path[idx - 1];
        const key = `${prev}-${stationID}`;

        const info = lineMap[key]?.[0] || {
          lineid: null,
          linecolourhex: "#999999",
          connectiontype: "interchange"
        };

        return {
          stationID,
          lineID: info.lineid,
          lineColourHex: info.linecolourhex,
          connectionType: info.connectiontype
        };
      })
    );

    // return result
    res.json({
      from,
      to,
      numPaths: finalPaths.length,
      distance: finalPaths[0].length - 1,
      paths: finalPaths
    });

  } catch (err) {
    console.error("❌ shortest-path crashed:", err);
    return res.status(500).json({ error: "Server error processing route" });
  }
});
export default router;