"""
Classifies concert detections as:
- tour_announcement: artist announces upcoming tour/dates
- presale: presale codes, early access, fan club sale — tickets NOT yet on general sale
- ticket_sale: tickets on sale to general public NOW
- cancelled: cancelled, postponed, or rescheduled shows
- unknown: can't determine
"""

CANCELLATION_KEYWORDS = [
    "cancel", "cancelled", "cancellation", "postpone", "postponed",
    "rescheduled", "rescheduling", "called off", "no longer", "unfortunately",
    "tour is off", "shows cancelled", "dates cancelled", "tour cancelled",
    "passing", "passed away", "rest in peace", "tribute to", "memory of",
    "in honor of", "died", "death of"
]

PRESALE_KEYWORDS = [
    "presale", "pre-sale", "pre sale", "fan presale", "verified fan",
    "artist presale", "citi presale", "amex presale", "presale code",
    "early access", "fan club", "vip presale", "exclusive presale",
    "presale tickets", "presale starts", "presale begins", "presale opens",
    "presale only", "before general sale", "before public sale",
]

# These indicate GENERAL public sale is now open — overrides presale
GENERAL_SALE_KEYWORDS = [
    "on sale now", "tickets on sale", "buy tickets now", "get tickets now",
    "available now", "general sale", "general on sale", "public on sale",
    "onsale now", "tickets available now", "book now", "purchase now",
    "on sale friday", "on sale saturday", "on sale sunday",
    "on sale monday", "on sale tuesday", "on sale wednesday", "on sale thursday",
    "on sale today", "just went on sale", "tickets just dropped",
]

ANNOUNCEMENT_KEYWORDS = [
    "announce", "announced", "announcing", "new tour", "tour dates",
    "coming soon", "dates revealed", "world tour", "headline tour",
    "tour announcement", "just announced", "newly announced",
    "excited to announce", "reveals tour", "reveals dates", "new dates",
    "upcoming tour", "heading to", "coming to", "touring",
]

# Known tribute band indicators
TRIBUTE_INDICATORS = [
    "tribute", "salute to", "celebration of", "the music of",
    "performing the songs of", "a night of", "legacy of",
    "experience", "story of", "performed by", "starring",
]


def classify_concert(raw_text: str, event_title: str = "") -> str:
    """
    Classify a concert detection.
    Returns: 'cancelled', 'presale', 'ticket_sale', 'tour_announcement', or 'unknown'
    """
    combined = ((raw_text or "") + " " + (event_title or "")).lower()

    # Check cancellation first — highest priority
    if any(kw in combined for kw in CANCELLATION_KEYWORDS):
        return "cancelled"

    # General sale overrides presale — if both mentioned, general sale wins
    has_general_sale = any(kw in combined for kw in GENERAL_SALE_KEYWORDS)
    has_presale = any(kw in combined for kw in PRESALE_KEYWORDS)

    if has_general_sale:
        return "ticket_sale"

    if has_presale:
        return "presale"

    if any(kw in combined for kw in ANNOUNCEMENT_KEYWORDS):
        return "tour_announcement"

    return "unknown"


def is_tribute_event(event_name: str, artist_name: str) -> bool:
    """Check if an event is a tribute act rather than the real artist."""
    event_lower = event_name.lower()
    artist_lower = artist_name.lower()
    
    # If the event name contains tribute indicators
    if any(ind in event_lower for ind in TRIBUTE_INDICATORS):
        return True
    
    # If artist name appears but with extra words suggesting tribute
    # e.g. "The Nirvana Experience" or "Coldplay Tribute Night"
    if artist_lower in event_lower:
        words_around = event_lower.replace(artist_lower, "").strip()
        if any(ind in words_around for ind in ["tribute", "experience", "story", "salute", "night of"]):
            return True
    
    return False


def format_tribute_label(artist_name: str) -> str:
    """Return display name with Tribute suffix."""
    return f"{artist_name} (Tribute)"
