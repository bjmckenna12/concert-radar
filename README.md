# 🎸 Concert Radar

Never miss a show from artists you follow on Spotify. Concert Radar monitors artist websites, Google News, and social media feeds — alerting you by email before tickets even hit Ticketmaster.

## Features

- **Spotify integration** — reads your followed artists automatically; picks up new follows on every scan
- **Multi-source monitoring** — artist tour pages, Google News RSS, Twitter/X via Nitter
- **Smart location** — auto-detects your city via IP; Tasmania users automatically get Melbourne & Sydney included
- **Early alerts** — finds announcements before they reach Ticketmaster
- **Gmail email alerts** — beautiful HTML emails with source links and presale info
- **Shareable** — friends connect their own Spotify and get their own personalised alerts
- **Fully free** — no paid APIs required

---

## Project Structure

```
concert-radar/
├── backend/          # Python FastAPI backend
│   ├── main.py       # App entry point + scheduler
│   ├── database.py   # SQLite with aiosqlite
│   ├── monitor.py    # Core monitoring engine
│   ├── scraper.py    # Web scraping + Google News RSS
│   ├── notifier.py   # Gmail SMTP email alerts
│   ├── geolocation.py
│   ├── config.py
│   ├── routers/
│   │   ├── auth.py      # Spotify OAuth + JWT
│   │   ├── artists.py   # Spotify artist sync
│   │   ├── concerts.py  # Concert listings + scan trigger
│   │   └── settings.py  # User preferences
│   └── requirements.txt
└── frontend/         # React frontend
    ├── src/
    │   ├── pages/    # Landing, Dashboard, Concerts, Settings
    │   ├── components/Layout.js
    │   ├── hooks/useAuth.js
    │   └── utils/api.js
    └── package.json
```

---

## Setup Guide

### Step 1 — Create a Spotify Developer App

1. Go to [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard)
2. Click **Create app**
3. Fill in:
   - App name: `Concert Radar`
   - Redirect URI: `https://your-backend.railway.app/auth/callback`
     *(use `http://localhost:8000/auth/callback` for local dev)*
4. Copy your **Client ID** and **Client Secret**

---

### Step 2 — Set up Gmail App Password

Gmail requires an "App Password" for SMTP (not your regular password):

1. Go to [myaccount.google.com/security](https://myaccount.google.com/security)
2. Enable **2-Step Verification** if not already on
3. Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
4. Select app: **Mail**, device: **Other** → name it "Concert Radar"
5. Copy the 16-character password generated

---

### Step 3 — Deploy the Backend to Railway (Free)

Railway runs the Python backend and the background scanner scheduler.

1. Go to [railway.app](https://railway.app) and sign up (free)
2. Click **New Project → Deploy from GitHub repo**
3. Connect your GitHub and push this project (or use the Railway CLI)
4. Set the **Root Directory** to `backend`
5. Add a **Volume** mounted at `/data` (for the SQLite database)
6. Add these **Environment Variables** in Railway's dashboard:

```
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret
SPOTIFY_REDIRECT_URI=https://YOUR-BACKEND.railway.app/auth/callback
FRONTEND_URL=https://YOUR-FRONTEND.vercel.app
BACKEND_URL=https://YOUR-BACKEND.railway.app
SECRET_KEY=generate_with_python_c_import_secrets_print_secrets_token_hex_32
SMTP_USER=your.gmail@gmail.com
SMTP_PASSWORD=your_16char_app_password
DB_PATH=/data/concert_radar.db
```

7. Railway will auto-detect Python and deploy using `railway.toml`
8. Note your Railway URL (e.g. `https://concert-radar-production.railway.app`)

---

### Step 4 — Deploy the Frontend to Vercel (Free)

1. Go to [vercel.com](https://vercel.com) and sign up (free)
2. Click **Add New → Project → Import Git Repository**
3. Set the **Root Directory** to `frontend`
4. Add this **Environment Variable**:
   ```
   REACT_APP_API_URL=https://YOUR-BACKEND.railway.app
   ```
5. Click **Deploy**
6. Note your Vercel URL (e.g. `https://concert-radar.vercel.app`)

---

### Step 5 — Update Spotify Redirect URI

Back in your Spotify Developer Dashboard:
1. Edit your app
2. Add the production redirect URI: `https://YOUR-BACKEND.railway.app/auth/callback`
3. Save

---

### Step 6 — Update Railway Environment Variables

Now that you have your Vercel URL, update Railway:
```
FRONTEND_URL=https://your-actual-app.vercel.app
SPOTIFY_REDIRECT_URI=https://your-actual-backend.railway.app/auth/callback
```

Railway will redeploy automatically.

---

## Running Locally

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# Edit .env with your credentials

python main.py
# API running at http://localhost:8000
# Docs at http://localhost:8000/docs
```

### Frontend

```bash
cd frontend
npm install

cp .env.example .env
# Edit .env: REACT_APP_API_URL=http://localhost:8000

npm start
# App running at http://localhost:3000
```

---

## Sharing with Friends

Once deployed, share your Vercel URL with friends. Each person:

1. Visits your app URL
2. Clicks "Connect with Spotify" — authenticates with **their own** Spotify account
3. Adds their own Gmail in Settings
4. Gets alerts based on **their own** followed artists and **their own** detected location

No data is shared between users.

---

## How the Monitoring Works

Every 6 hours (configurable), the scheduler runs for each user:

```
1. Spotify sync       — refresh followed artists list (picks up new follows)
2. Tour page scrape   — fetch artist website /tour pages, diff against last snapshot
3. Google News RSS    — search for "[Artist] tour OR concert OR tickets Australia"
4. Twitter/Nitter     — search public tweets for tour announcements
5. Dedup + save       — store new findings, skip duplicates
6. Email alert        — send Gmail digest of all new concerts found
```

### Location logic

- IP detected as Tasmania → searches Hobart + Melbourne + Sydney automatically
- User moves → IP updates automatically, no config change needed
- Manual override → Settings page → "Location override" field

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/auth/login` | Redirect to Spotify OAuth |
| GET | `/auth/callback` | OAuth callback, returns JWT |
| GET | `/auth/me` | Current user profile |
| GET | `/artists/sync` | Sync followed artists from Spotify |
| GET | `/artists/` | List monitored artists |
| GET | `/concerts/` | List detected concerts |
| POST | `/concerts/scan` | Trigger manual scan |
| PATCH | `/settings/` | Update user settings |
| POST | `/trigger-scan` | Trigger scan for all users (admin) |

---

## Troubleshooting

**"Spotify credentials not configured"**
→ Check `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` are set in Railway env vars.

**No concerts showing up**
→ Trigger a manual scan from the Dashboard. First scan can take a few minutes.

**Emails not sending**
→ Ensure `SMTP_USER` and `SMTP_PASSWORD` are set. Use Gmail App Password, not your account password. Check that 2FA is enabled on your Gmail account.

**"Token expired" after login**
→ Ensure `SECRET_KEY` is set and consistent. Changing it logs everyone out.

**Spotify redirect fails**
→ Make sure the redirect URI in Railway env vars exactly matches what's configured in your Spotify app dashboard (including `https://`).

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Backend | Python 3.11+, FastAPI, uvicorn |
| Database | SQLite via aiosqlite |
| Scraping | httpx, BeautifulSoup4, feedparser |
| Auth | Spotify OAuth 2.0, PyJWT |
| Scheduling | APScheduler |
| Email | Gmail SMTP (smtplib) |
| Frontend | React 18, React Router v6 |
| Hosting | Railway (backend) + Vercel (frontend) |

---

## License

MIT — do whatever you want with it.
