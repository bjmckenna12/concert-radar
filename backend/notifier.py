import smtplib
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from datetime import datetime

from config import SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, FRONTEND_URL

logger = logging.getLogger(__name__)


def build_html_email(user_name: str, concerts: list) -> tuple[str, str]:
    """Build plain text and HTML email for concert alerts."""
    count = len(concerts)
    subject = f"🎸 {count} new concert{'s' if count > 1 else ''} detected near you — Concert Radar"

    rows_html = ""
    rows_text = ""
    for c in concerts:
        source_badge = {
            "website": "Artist Website",
            "news": "News Article",
            "twitter": "Twitter",
            "mailing_list": "Mailing List",
        }.get(c.get("source", ""), c.get("source", "Unknown"))

        accent = "#1DB954" if c.get("source") == "website" else "#555"
        rows_html += f"""
        <tr>
          <td style="padding:14px 0;border-bottom:1px solid #222;">
            <div style="font-size:16px;font-weight:600;color:#f0f0f0;margin-bottom:4px;">{c.get('artist_name','')}</div>
            <div style="font-size:13px;color:#999;margin-bottom:6px;">
              {c.get('event_date','') or 'Date TBC'} &nbsp;·&nbsp; {c.get('city','') or c.get('country','Australia')}
              {f"&nbsp;·&nbsp; {c.get('venue','')}" if c.get('venue') else ''}
            </div>
            <span style="font-size:11px;background:rgba(255,255,255,0.07);color:#aaa;padding:3px 8px;border-radius:4px;border:1px solid #333;">{source_badge}</span>
            {f'<br><div style="font-size:12px;color:#777;margin-top:8px;font-style:italic;">{c.get("raw_text","")[:200]}</div>' if c.get('raw_text') else ''}
            {f'<br><a href="{c.get("source_url","")}" style="color:#1DB954;font-size:12px;text-decoration:none;">View source →</a>' if c.get('source_url') else ''}
          </td>
        </tr>"""

        rows_text += f"\n• {c.get('artist_name','')} — {c.get('event_date','TBC')} in {c.get('city','') or 'Australia'}\n  Source: {source_badge}\n"
        if c.get("source_url"):
            rows_text += f"  Link: {c.get('source_url')}\n"

    html = f"""
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="background:#0a0a0f;margin:0;padding:0;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px;">

    <div style="margin-bottom:28px;">
      <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#1DB954;margin-right:8px;"></span>
      <span style="font-size:11px;letter-spacing:0.12em;color:#1DB954;text-transform:uppercase;font-weight:600;">Concert Radar</span>
    </div>

    <h1 style="font-size:26px;color:#f0f0f0;margin:0 0 8px;font-weight:700;">
      {count} new show{'s' if count > 1 else ''} detected
    </h1>
    <p style="font-size:14px;color:#888;margin:0 0 28px;">
      Hi {user_name}, we found upcoming concerts from artists you follow on Spotify.
    </p>

    <table style="width:100%;border-collapse:collapse;">
      {rows_html}
    </table>

    <div style="margin-top:28px;padding-top:20px;border-top:1px solid #1a1a1a;">
      <a href="{FRONTEND_URL}/concerts" style="display:inline-block;background:#1DB954;color:#000;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;">
        View all alerts →
      </a>
    </div>

    <p style="margin-top:28px;font-size:11px;color:#444;line-height:1.6;">
      You're receiving this because you set up Concert Radar.<br>
      <a href="{FRONTEND_URL}/settings" style="color:#555;">Manage your settings</a>
    </p>
  </div>
</body>
</html>"""

    plain = f"Concert Radar — {count} new show{'s' if count > 1 else ''} near you\n\nHi {user_name},{rows_text}\nView all: {FRONTEND_URL}/concerts\n"
    return subject, html, plain


async def send_alert_email(to_email: str, user_name: str, concerts: list) -> bool:
    """Send concert alert email via Gmail SMTP. Returns True on success."""
    if not SMTP_USER or not SMTP_PASSWORD:
        logger.warning("SMTP credentials not configured — skipping email")
        return False

    if not concerts:
        return True

    try:
        subject, html_body, plain_body = build_html_email(user_name, concerts)

        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"Concert Radar <{SMTP_USER}>"
        msg["To"] = to_email

        msg.attach(MIMEText(plain_body, "plain"))
        msg.attach(MIMEText(html_body, "html"))

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.ehlo()
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(SMTP_USER, to_email, msg.as_string())

        logger.info(f"Alert email sent to {to_email} with {len(concerts)} concerts")
        return True

    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}")
        return False
