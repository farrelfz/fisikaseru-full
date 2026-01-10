# FisikaSeru

Professional physics education platform with secure authentication, SPA simulations, and academic integrity.

## 🚀 Features

- **HTML5** - Modern HTML structure with best practices
- **Tailwind CSS** - Utility-first CSS framework for rapid UI development
- **Custom Components** - Pre-built component classes for buttons and containers
- **NPM Scripts** - Easy-to-use commands for development and building
- **Responsive Design** - Mobile-first approach for all screen sizes

## 📋 Prerequisites

- Node.js (v12.x or higher)
- npm or yarn

## 🛠️ Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables (create `.env` in project root):
```
PORT=3000
NODE_ENV=development
JWT_SECRET=CHANGE_ME_SECURE

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback

# GitHub OAuth
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GITHUB_CALLBACK_URL=http://localhost:3000/auth/github/callback
```

3. Run dev server (Windows-friendly):
```bash
npm run dev:all
```

4. Open http://localhost:3000 in your browser.

## 📁 Project Structure

```
fisikaseru/
├── css/
│   ├── tailwind.css   # Tailwind source file with custom utilities
│   └── main.css       # Compiled CSS (generated)
├── pages/             # HTML pages
├── public/            # Client scripts (auth, physics, etc.)
├── server/            # Express OAuth backend
├── index.html         # Main entry point
├── package.json       # Project dependencies and scripts
├── tailwind.config.js # Tailwind CSS configuration
└── .env               # Local env vars (not committed)

## 🔐 Authentication

- OAuth 2.0 Authorization Code Flow (Google & GitHub)
- Backend issues HTTP-only `fs_session` cookie with signed JWT
- Frontend checks login state via `/api/me`
- Logout via `POST /logout`

### User model
- `uid`: provider-scoped unique id (e.g., `google:123456`)
- `name`, `email`, `provider`, `avatar`

## 🧪 Milikan Lab Gating

- Access requires login
- Preliminary data stored per-user in LocalStorage key: `prelim:<uid>:millikan`
- Empty state in SPA if preliminary data is missing

## 🚦 Scripts

- `npm run serve` – Start Express server (serves static + auth)
- `npm run watch:css` – Tailwind watcher
- `npm run dev:all` – Run both server and CSS watcher concurrently
```

## 🎨 Styling

This project uses Tailwind CSS for styling. Custom utility classes include:


## 🧩 Customization

To customize the Tailwind configuration, edit the `tailwind.config.js` file:


## 📦 Build for Production

Build the CSS for production:

```bash
npm run build:css
# or
yarn build:css
```

## 📱 Responsive Design

The app is built with responsive design using Tailwind CSS breakpoints:

- `sm`: 640px and up
- `md`: 768px and up
- `lg`: 1024px and up
- `xl`: 1280px and up
- `2xl`: 1536px and up

