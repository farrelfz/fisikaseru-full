import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { connectDb, dbStore } from './db.js';
import { generatePdf } from './pdf.js';

dotenv.config();

const app = express();
const PORT = process.env.PLATFORM_PORT || 4000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const LABS_URL = process.env.LABS_URL || 'http://localhost:5174';
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';

const allowedOrigins = [CLIENT_URL, LABS_URL];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());
app.use(passport.initialize());

const signUser = (user) => jwt.sign(user, JWT_SECRET, { expiresIn: '12h' });

const issueCookie = (res, user) => {
  const token = signUser(user);
  res.cookie('fs_session', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 12 * 60 * 60 * 1000,
  });
};

const requireAuth = (req, res, next) => {
  const token = req.cookies.fs_session;
  if (!token) return res.status(401).json({ error: 'Login required' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid session' });
  }
};

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID || 'missing',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'missing',
  callbackURL: process.env.GOOGLE_CALLBACK_URL || `http://localhost:${PORT}/auth/google/callback`,
}, async (accessToken, refreshToken, profile, done) => {
  const user = {
    uid: `google:${profile.id}`,
    name: profile.displayName,
    email: profile.emails?.[0]?.value,
    provider: 'google',
    avatar: profile.photos?.[0]?.value,
  };
  await dbStore.upsertUser(user);
  done(null, user);
}));

passport.use(new GitHubStrategy({
  clientID: process.env.GITHUB_CLIENT_ID || 'missing',
  clientSecret: process.env.GITHUB_CLIENT_SECRET || 'missing',
  callbackURL: process.env.GITHUB_CALLBACK_URL || `http://localhost:${PORT}/auth/github/callback`,
}, async (accessToken, refreshToken, profile, done) => {
  const user = {
    uid: `github:${profile.id}`,
    name: profile.displayName || profile.username,
    email: profile.emails?.[0]?.value,
    provider: 'github',
    avatar: profile.photos?.[0]?.value,
  };
  await dbStore.upsertUser(user);
  done(null, user);
}));

app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));
app.get('/auth/google/callback', passport.authenticate('google', { session: false, failureRedirect: CLIENT_URL }), (req, res) => {
  issueCookie(res, req.user);
  res.redirect(CLIENT_URL);
});

app.get('/auth/github', passport.authenticate('github', { scope: ['user:email'], session: false }));
app.get('/auth/github/callback', passport.authenticate('github', { session: false, failureRedirect: CLIENT_URL }), (req, res) => {
  issueCookie(res, req.user);
  res.redirect(CLIENT_URL);
});

app.get('/api/me', (req, res) => {
  const token = req.cookies.fs_session;
  if (!token) return res.status(200).json({ user: null });
  try {
    const user = jwt.verify(token, JWT_SECRET);
    return res.json({ user });
  } catch (err) {
    return res.status(200).json({ user: null });
  }
});

app.post('/api/history', requireAuth, async (req, res) => {
  const entry = {
    uid: req.user.uid,
    simKey: req.body.simKey,
    summary: req.body.summary,
    createdAt: new Date(),
  };
  await dbStore.addHistory(entry);
  res.json({ status: 'ok' });
});

app.get('/api/history', requireAuth, async (req, res) => {
  const items = await dbStore.listHistory(req.user.uid);
  res.json({ items });
});

app.post('/api/pdf', requireAuth, async (req, res) => {
  try {
    const result = await generatePdf(req.body);
    await dbStore.addPdf({ uid: req.user.uid, filename: result.filename, createdAt: new Date() });
    res.json({ filename: result.filename });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/logout', (req, res) => {
  res.clearCookie('fs_session');
  res.json({ status: 'ok' });
});

connectDb(process.env.MONGO_URL).catch(() => null);

app.listen(PORT, () => {
  console.log(`Platform server running on ${PORT}`);
});
