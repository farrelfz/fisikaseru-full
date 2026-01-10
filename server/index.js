require('dotenv').config();
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'CHANGE_ME_DEV_ONLY';
const COOKIE_NAME = 'fs_session';
const POPUP_COOKIE = 'fs_popup';
const isProd = process.env.NODE_ENV === 'production';

// In-memory user store (replace with DB later)
const users = new Map();

// In-memory per-user data stores (replace with DB later)
const milikanPrelimByUid = new Map();
const milikanHistoryByUid = new Map();

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: function (origin, callback) {
    // Allow same-origin and local dev origins
    const allowed = [
      undefined, // same-origin
      'http://localhost:' + PORT,
      'http://127.0.0.1:' + PORT,
    ];
    if (!origin || allowed.includes(origin)) return callback(null, true);
    return callback(null, true); // relax for dev; tighten later
  },
  credentials: true,
}));

// Passport serialization (minimal)
passport.serializeUser((user, done) => {
  done(null, user.uid);
});
passport.deserializeUser((uid, done) => {
  const user = users.get(uid);
  done(null, user || null);
});

// OAuth config guards
const GOOGLE_CFG = {
  id: process.env.GOOGLE_CLIENT_ID,
  secret: process.env.GOOGLE_CLIENT_SECRET,
  callback: process.env.GOOGLE_CALLBACK_URL || `http://localhost:${PORT}/auth/google/callback`,
};
const GITHUB_CFG = {
  id: process.env.GITHUB_CLIENT_ID,
  secret: process.env.GITHUB_CLIENT_SECRET,
  callback: process.env.GITHUB_CALLBACK_URL || `http://localhost:${PORT}/auth/github/callback`,
};
function isValidStr(v) { return typeof v === 'string' && v.trim().length > 0; }
const googleEnabled = isValidStr(GOOGLE_CFG.id) && isValidStr(GOOGLE_CFG.secret);
const githubEnabled = isValidStr(GITHUB_CFG.id) && isValidStr(GITHUB_CFG.secret);

if (googleEnabled) {
  // Google OAuth 2.0
  passport.use(new GoogleStrategy({
    clientID: GOOGLE_CFG.id,
    clientSecret: GOOGLE_CFG.secret,
    callbackURL: GOOGLE_CFG.callback,
  }, (accessToken, refreshToken, profile, done) => {
    const uid = 'google:' + profile.id;
    const user = {
      uid,
      provider: 'google',
      name: profile.displayName,
      email: Array.isArray(profile.emails) && profile.emails[0] ? profile.emails[0].value : null,
      avatar: Array.isArray(profile.photos) && profile.photos[0] ? profile.photos[0].value : null,
    };
    users.set(uid, user);
    return done(null, user);
  }));
} else {
  console.warn('Google OAuth not configured. Set GOOGLE_CLIENT_ID/SECRET in .env');
}

if (githubEnabled) {
  // GitHub OAuth 2.0
  passport.use(new GitHubStrategy({
    clientID: GITHUB_CFG.id,
    clientSecret: GITHUB_CFG.secret,
    callbackURL: GITHUB_CFG.callback,
  }, (accessToken, refreshToken, profile, done) => {
    const uid = 'github:' + profile.id;
    const user = {
      uid,
      provider: 'github',
      name: profile.displayName || profile.username,
      email: Array.isArray(profile.emails) && profile.emails[0] ? profile.emails[0].value : null,
      avatar: Array.isArray(profile.photos) && profile.photos[0] ? profile.photos[0].value : null,
    };
    users.set(uid, user);
    return done(null, user);
  }));
} else {
  console.warn('GitHub OAuth not configured. Set GITHUB_CLIENT_ID/SECRET in .env');
}

app.use(passport.initialize());

function issueSession(res, user) {
  const token = jwt.sign({ uid: user.uid, provider: user.provider }, JWT_SECRET, {
    expiresIn: '7d',
  });
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

function cookieOpts({ maxAgeMs } = {}) {
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    maxAge: maxAgeMs,
    path: '/',
  };
}

function verifyToken(req) {
  const token = req.cookies[COOKIE_NAME];
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = users.get(payload.uid);
    return user || null;
  } catch (e) {
    return null;
  }
}

function requireAuth(req, res, next) {
  const user = verifyToken(req);
  if (!user) return res.status(401).json({ error: 'unauthenticated' });
  req.user = user;
  next();
}

function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

function validateMilikanPrelim(body) {
  const studentName = String(body.studentName || '').trim();
  const studentNIM = String(body.studentNIM || '').trim();
  const programStudy = String(body.programStudy || '').trim();
  const university = String(body.university || '').trim();

  if (!studentName || /^\d+$/.test(studentName)) return { ok: false, error: 'invalid_studentName' };
  if (!studentNIM) return { ok: false, error: 'invalid_studentNIM' };
  if (!programStudy) return { ok: false, error: 'invalid_programStudy' };
  if (!university) return { ok: false, error: 'invalid_university' };

  return {
    ok: true,
    data: {
      studentName,
      studentNIM,
      programStudy,
      university,
    },
  };
}

// Auth status endpoint for frontend UI
app.get('/auth/status', (req, res) => {
  res.json({ google: googleEnabled, github: githubEnabled });
});

// Auth routes (guarded if not configured)
app.get('/auth/google', (req, res, next) => {
  if (!googleEnabled) return res.status(501).json({ error: 'Google OAuth not configured' });
  if (String(req.query.popup || '') === '1') {
    res.cookie(POPUP_COOKIE, '1', cookieOpts({ maxAgeMs: 10 * 60 * 1000 }));
  }
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});
app.get('/auth/google/callback', (req, res, next) => {
  if (!googleEnabled) return res.redirect('/pages/landing_page.html');
  passport.authenticate('google', { failureRedirect: '/pages/landing_page.html' })(req, res, () => {
    const user = req.user;
    issueSession(res, user);

    const isPopup = req.cookies && req.cookies[POPUP_COOKIE] === '1';
    if (isPopup) {
      res.clearCookie(POPUP_COOKIE, { path: '/' });
      return res.redirect('/auth/popup-complete');
    }
    return res.redirect('/pages/landing_page.html');
  });
});

app.get('/auth/github', (req, res, next) => {
  if (!githubEnabled) return res.status(501).json({ error: 'GitHub OAuth not configured' });
  if (String(req.query.popup || '') === '1') {
    res.cookie(POPUP_COOKIE, '1', cookieOpts({ maxAgeMs: 10 * 60 * 1000 }));
  }
  passport.authenticate('github', { scope: ['user:email'] })(req, res, next);
});
app.get('/auth/github/callback', (req, res, next) => {
  if (!githubEnabled) return res.redirect('/pages/landing_page.html');
  passport.authenticate('github', { failureRedirect: '/pages/landing_page.html' })(req, res, () => {
    const user = req.user;
    issueSession(res, user);

    const isPopup = req.cookies && req.cookies[POPUP_COOKIE] === '1';
    if (isPopup) {
      res.clearCookie(POPUP_COOKIE, { path: '/' });
      return res.redirect('/auth/popup-complete');
    }
    return res.redirect('/pages/landing_page.html');
  });
});

// Popup completion page for modal-based auth (posts message then closes)
app.get('/auth/popup-complete', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Auth complete</title>
  </head>
  <body>
    <script>
      (function () {
        try {
          if (window.opener && !window.opener.closed) {
            window.opener.postMessage({ type: 'fs-auth-complete' }, window.location.origin);
          }
        } catch (e) {}
        try { window.close(); } catch (e) {}
        setTimeout(function () { window.location.href = '/pages/landing_page.html'; }, 500);
      })();
    </script>
  </body>
</html>`);
});

app.post('/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME, { path: '/' });
  res.status(200).json({ ok: true });
});

app.get('/api/me', (req, res) => {
  const user = verifyToken(req);
  if (!user) return res.status(401).json({ authenticated: false });
  res.json({ authenticated: true, user });
});

// ===== Millikan: prelim (login-only persistence) =====
app.get('/api/milikan/prelim', requireAuth, (req, res) => {
  const existing = milikanPrelimByUid.get(req.user.uid) || null;
  res.json({ ok: true, prelim: existing });
});

app.post('/api/milikan/prelim', requireAuth, (req, res) => {
  const v = validateMilikanPrelim(req.body || {});
  if (!v.ok) return res.status(400).json({ ok: false, error: v.error });
  const record = {
    ...v.data,
    updatedAt: new Date().toISOString(),
  };
  milikanPrelimByUid.set(req.user.uid, record);
  res.json({ ok: true, prelim: record });
});

// ===== Millikan: history (login-only) =====
app.get('/api/milikan/history', requireAuth, (req, res) => {
  const kind = isNonEmptyString(req.query.kind) ? String(req.query.kind) : null;
  const items = milikanHistoryByUid.get(req.user.uid) || [];
  const filtered = kind ? items.filter((x) => x.kind === kind) : items;
  res.json({ ok: true, items: filtered });
});

app.post('/api/milikan/history', requireAuth, (req, res) => {
  const kind = String(req.body && req.body.kind ? req.body.kind : '').trim();
  const data = (req.body && req.body.data) ? req.body.data : null;
  if (!['analysis', 'progress'].includes(kind)) {
    return res.status(400).json({ ok: false, error: 'invalid_kind' });
  }
  if (data === null || typeof data !== 'object') {
    return res.status(400).json({ ok: false, error: 'invalid_data' });
  }

  const items = milikanHistoryByUid.get(req.user.uid) || [];
  const record = {
    id: String(Date.now()) + '-' + Math.random().toString(16).slice(2),
    sim: 'millikan',
    kind,
    data,
    createdAt: new Date().toISOString(),
  };
  items.unshift(record);
  // Keep memory bounded
  milikanHistoryByUid.set(req.user.uid, items.slice(0, 50));
  res.json({ ok: true, item: record });
});

// Serve static frontend
app.use(express.static(path.join(__dirname, '..')));

// Fallback to index for non-file routes
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`FisikaSeru server running at http://localhost:${PORT}`);
});
