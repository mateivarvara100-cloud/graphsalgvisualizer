import os
import smtplib
from datetime import datetime
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv

def get_smtp_config() -> dict:
    load_dotenv(override=True)
    return {
        "host": os.getenv("SMTP_HOST", "").strip(),
        "port": int(os.getenv("SMTP_PORT", "587")),
        "user": os.getenv("SMTP_USER", "").strip(),
        "password": os.getenv("SMTP_PASSWORD", "").strip(),
        "from_email": os.getenv("SMTP_FROM_EMAIL", "").strip() or os.getenv("SMTP_USER", "noreply@algorbit.com").strip(),
        "from_name": os.getenv("SMTP_FROM_NAME", "Algorbit Security").strip(),
    }

def send_password_reset_email(to_email: str, reset_code: str, user_name: str = "") -> dict:
    config = get_smtp_config()
    recipient_name = user_name.strip() if user_name else to_email.split("@")[0]

    subject = f"Algorbit — Password Reset Verification Code: {reset_code}"

    html_content = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {{
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #0b1120;
      color: #f8fafc;
      margin: 0;
      padding: 32px 16px;
    }}
    .email-wrapper {{
      max-width: 520px;
      margin: 0 auto;
      background: #0f172a;
      border-radius: 18px;
      border: 1px solid rgba(255, 255, 255, 0.12);
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
      padding: 36px 32px;
      overflow: hidden;
    }}
    .brand {{
      text-align: center;
      margin-bottom: 24px;
    }}
    .brand-title {{
      font-size: 22px;
      font-weight: 800;
      letter-spacing: 1px;
      color: #818cf8;
      display: inline-block;
    }}
    .headline {{
      font-size: 18px;
      font-weight: 700;
      color: #ffffff;
      text-align: center;
      margin-bottom: 8px;
    }}
    .description {{
      font-size: 14px;
      color: #94a3b8;
      text-align: center;
      line-height: 1.5;
      margin-bottom: 28px;
    }}
    .code-card {{
      background: rgba(99, 102, 241, 0.08);
      border: 2px dashed #6366f1;
      border-radius: 14px;
      text-align: center;
      padding: 24px 16px;
      margin-bottom: 24px;
    }}
    .code-label {{
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: #a5b4fc;
      margin-bottom: 8px;
    }}
    .code-value {{
      font-size: 38px;
      font-weight: 800;
      letter-spacing: 10px;
      color: #ffffff;
      font-family: 'JetBrains Mono', Consolas, Monaco, monospace;
    }}
    .expiry-badge {{
      display: inline-block;
      margin-top: 10px;
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: #fca5a5;
      border-radius: 20px;
      padding: 4px 14px;
      font-size: 12px;
      font-weight: 600;
    }}
    .security-note {{
      font-size: 12.5px;
      color: #64748b;
      line-height: 1.5;
      text-align: center;
      margin-bottom: 24px;
    }}
    .footer {{
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      padding-top: 20px;
      text-align: center;
      font-size: 11.5px;
      color: #475569;
      line-height: 1.4;
    }}
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="brand">
      <span class="brand-title">✨ ALGORBIT</span>
    </div>
    <div class="headline">Password Reset Request</div>
    <div class="description">
      Hello <strong>{recipient_name}</strong>,<br>
      We received a request to reset the password for your Algorbit account (<code>{to_email}</code>).
    </div>
    <div class="code-card">
      <div class="code-label">Verification Code</div>
      <div class="code-value">{reset_code}</div>
      <div class="expiry-badge">⏱️ Valid for 15 minutes</div>
    </div>
    <div class="security-note">
      Enter this 6-digit code in the Algorbit verification window to set a new password.<br>
      If you did not request this, you can safely disregard this email.
    </div>
    <div class="footer">
      Algorbit Interactive Graph Algorithm Visualizer<br>
      Automated Security Notification • Please do not reply to this message
    </div>
  </div>
</body>
</html>"""

    plain_content = f"""Hello {recipient_name},

We received a request to reset your password for your Algorbit account ({to_email}).

Your 6-Digit Password Reset Verification Code: {reset_code}
(Valid for 15 minutes)

If you did not request a password reset, you can safely ignore this email.

— The Algorbit Team
"""

    if config["host"] and config["user"] and config["password"]:
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"{config['from_name']} <{config['from_email']}>"
            msg["To"] = to_email

            msg.attach(MIMEText(plain_content, "plain", "utf-8"))
            msg.attach(MIMEText(html_content, "html", "utf-8"))

            if config["port"] == 465:
                server = smtplib.SMTP_SSL(config["host"], config["port"], timeout=10)
            else:
                server = smtplib.SMTP(config["host"], config["port"], timeout=10)
                server.ehlo()
                server.starttls()
                server.ehlo()

            server.login(config["user"], config["password"])
            server.send_message(msg)
            server.quit()

            print(f"✅ [EMAIL SERVICE] Successfully sent reset code via SMTP to {to_email}")
            return {"success": True, "method": "smtp", "delivered": True}
        except Exception as e:
            print(f"⚠️ [EMAIL SERVICE] SMTP delivery failed ({e}). Falling back to dispatcher log.")

    print(f"\n" + "=" * 68)
    print(f"📧 [EMAIL DISPATCHER] Password Reset Request for: {to_email}")
    print(f"🔑 6-DIGIT VERIFICATION CODE: {reset_code}")
    print(f"⏱️  EXPIRES IN: 15 minutes")
    if not (config["host"] and config["user"] and config["password"]):
        print(f"ℹ️  [SMTP CONFIG] To deliver directly to recipient inboxes, configure SMTP_USER & SMTP_PASSWORD in backend/.env")
    print("=" * 68 + "\n")

    is_prod = os.getenv("ENVIRONMENT", "development").lower() == "production"
    if not is_prod:
        try:
            log_path = os.path.join(os.path.dirname(__file__), "sent_emails.log")
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            with open(log_path, "a", encoding="utf-8") as f:
                f.write(f"[{timestamp}] Recipient: {to_email} | Reset Code: {reset_code} | Expires in: 15 mins\n")
        except Exception:
            pass

    return {"success": True, "method": "logged", "delivered": False}
