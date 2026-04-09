import os
from dotenv import load_dotenv

load_dotenv()

# Spotify OAuth
SPOTIFY_CLIENT_ID = os.getenv("SPOTIFY_CLIENT_ID", "")
SPOTIFY_CLIENT_SECRET = os.getenv("SPOTIFY_CLIENT_SECRET", "")
SPOTIFY_REDIRECT_URI = os.getenv("SPOTIFY_REDIRECT_URI", "http://localhost:8000/auth/callback")
SPOTIFY_SCOPES = "user-follow-read user-read-email user-read-private user-top-read"

# App
SECRET_KEY = os.getenv("SECRET_KEY", "change-me-in-production-use-random-string")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")

# Gmail SMTP
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")  # App password, not account password

# Ticketmaster
TICKETMASTER_API_KEY = os.getenv("TICKETMASTER_API_KEY", "")

# Geolocation
IPAPI_URL = "https://ipapi.co/{ip}/json/"

# Tasmania nearby cities to always include
TASMANIA_NEARBY_CITIES = ["Melbourne", "Sydney"]
TASMANIA_KEYWORDS = ["tasmania", "hobart", "launceston", "devonport", "burnie"]

# Monitoring
DEFAULT_SCAN_HOURS = 6
DEFAULT_RADIUS_KM = 80

# Concert keywords used in scraping
CONCERT_KEYWORDS = [
    "tour", "concert", "live", "show", "gig", "tickets", "presale",
    "on sale", "headline", "supports", "festival", "arena", "venue"
]

LOCATION_KEYWORDS_AU = [
    "australia", "melbourne", "sydney", "brisbane", "perth", "adelaide",
    "hobart", "canberra", "darwin", "tasmania", "victoria", "nsw",
    "queensland", "western australia"
]
