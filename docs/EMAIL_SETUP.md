# Email Setup Guide

## Quick Setup (Gmail)

### Step 1: Enable 2-Step Verification
1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable "2-Step Verification"

### Step 2: Generate App Password
1. Go to [App Passwords](https://myaccount.google.com/apppasswords)
2. Select "Mail" and "Other (Custom name)"
3. Enter "HRM System" and click Generate
4. Copy the 16-character password

### Step 3: Configure Environment
Add to your `.env` file:
```env
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=abcdefghijklmnop
APP_NAME=Your Company HRM
```

> **Note:** Enter the app password without spaces.

---

## Other Email Providers

For non-Gmail providers, add these additional settings:

```env
SMTP_HOST=smtp.yourprovider.com
SMTP_PORT=587
SMTP_USER=your-email@provider.com
SMTP_PASSWORD=your-password
APP_NAME=Your Company HRM
```

### Common SMTP Settings

| Provider | SMTP_HOST | SMTP_PORT |
|----------|-----------|-----------|
| Gmail | smtp.gmail.com | 587 |
| Outlook | smtp.office365.com | 587 |
| Yahoo | smtp.mail.yahoo.com | 587 |
| SendGrid | smtp.sendgrid.net | 587 |

---

## Testing

1. Log in as Admin/HR
2. Go to **Settings > Notifications**
3. Enter test email and click "Send Test"

---

## Troubleshooting

**"Authentication failed"**
- For Gmail: Ensure 2FA is enabled and use App Password (not regular password)
- Regenerate App Password if it was revoked

**Emails in spam**
- Use a professional email domain
- Set up SPF/DKIM records for your domain

**View failed emails**
- Go to Settings > Notifications > Email Logs
- Click "Retry" on failed emails
