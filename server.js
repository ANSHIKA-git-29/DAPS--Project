/*
  ============================================
  DAPS — Digital Asset Protection System
  Backend Server — Node.js + Express
  ============================================
*/

const express  = require('express');
const multer   = require('multer');
const crypto   = require('crypto');
const cors     = require('cors');
const path     = require('path');
const fs       = require('fs');

const app  = express();
const PORT = process.env.PORT || 3001;

// ── CORS (allow frontend to call this API) ──
app.use(cors());
app.use(express.json());

// ── Serve frontend files ──
app.use(express.static(__dirname));
// app.use(express.static(path.join(__dirname, '../frontend')));

// ── Multer — File Upload Config ──
// Files are stored temporarily in /uploads folder
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    // Unique name to avoid collisions
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e6);
    cb(null, unique + path.extname(file.originalname));
  },
});

// Accept images, videos, and documents up to 50 MB
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/mpeg', 'video/quicktime',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not supported'), false);
    }
  },
});


// ─────────────────────────────────────────
// SIMULATED DATABASE of known flagged hashes
// In a real system, this would be a database
// of SHA-256 hashes of copyrighted content
// ─────────────────────────────────────────
const KNOWN_VIOLATIONS = new Set([
  // These are example placeholder hashes
  'abc123flagged',
  'pirated_video_hash',
  'stolen_image_hash',
]);


// ──────────────────────────────────────────
// ROUTE: POST /analyze
// Receives a file, computes its hash, and
// simulates AI-based copyright detection
// ──────────────────────────────────────────
app.post('/analyze', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    const filePath = req.file.path;

    // ── Step 1: Compute SHA-256 hash of the file ──
    const fileBuffer = fs.readFileSync(filePath);
    const hash = crypto
      .createHash('sha256')
      .update(fileBuffer)
      .digest('hex')
      .toUpperCase();

    // ── Step 2: Simulate AI Analysis ──
    // Method A: Check against known hash database
    const inDatabase = KNOWN_VIOLATIONS.has(hash.toLowerCase());

    // Method B: Probabilistic simulation (35% chance of violation)
    // Used when hash not found in DB — simulates AI uncertainty
    let hashNum = 0;
    for (const c of hash) hashNum += c.charCodeAt(0);
    const probabilisticFlag = (hashNum % 100) < 35;

    const isFlagged = inDatabase || probabilisticFlag;

    // ── Step 3: File metadata ──
    const stats    = fs.statSync(filePath);
    const fileSize = formatSize(stats.size);
    const scanTime = (1.5 + Math.random() * 2).toFixed(2) + 's';

    // ── Step 4: Build response ──
    const result = isFlagged
      ? {
          status:     'danger',
          message:    'Unauthorized Usage Detected',
          detail:     'This file matches a known protected asset. Unauthorized distribution may violate copyright law.',
          hash:       hash.substring(0, 16) + '...',
          fileName:   req.file.originalname,
          fileSize,
          confidence: (74 + Math.floor(hashNum % 22)) + '%',
          scanTime,
        }
      : {
          status:     'safe',
          message:    'No Issues Found',
          detail:     'This file passed all checks. No copyright fingerprints, unauthorized usage, or known violations were detected.',
          hash:       hash.substring(0, 16) + '...',
          fileName:   req.file.originalname,
          fileSize,
          confidence: (89 + Math.floor(hashNum % 10)) + '%',
          scanTime,
        };

    // ── Step 5: Clean up uploaded file ──
    fs.unlinkSync(filePath);

    // ── Step 6: Return result ──
    return res.json(result);

  } catch (err) {
    console.error('Analysis error:', err.message);
    // Clean up on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    return res.status(500).json({ error: 'Analysis failed', detail: err.message });
  }
});


// ─────────────────────────────
// ROUTE: GET /health
// Simple health check endpoint
// ─────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'DAPS Backend', version: '2.1' });
});


// ─────────────────────────────
// Utility: Format bytes
// ─────────────────────────────
function formatSize(bytes) {
  if (bytes < 1024)            return bytes + ' B';
  if (bytes < 1024 * 1024)     return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}


// ── Start Server ──
app.listen(PORT, () => {
  console.log(`\n✅ DAPS Backend running at http://localhost:${PORT}`);
  console.log(`📁 Serving frontend at  http://localhost:${PORT}`);
  console.log(`🔍 API endpoint:         POST http://localhost:${PORT}/analyze\n`);
});