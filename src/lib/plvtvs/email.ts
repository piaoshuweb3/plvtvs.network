// ============================================================
// PLVTVS.ONE — Email Notification System (Resend)
// ============================================================
// Uses Resend API for transactional emails:
//   - Subscription expiry reminders (3 days, 1 day before)
//   - Subscription confirmation on purchase
//   - Admin alerts for system events
// ============================================================

import { Resend } from 'resend';
import { db, isUsingMemDb, getMemDb } from '@/lib/db';

// ----------------------------------------------------------------
// Configuration (from env)
// ----------------------------------------------------------------
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const RESEND_FROM = process.env.RESEND_FROM || 'PLVTVS.ONE <noreply@plvtvs.one>';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || '';

// Days before expiry to trigger reminders
const REMINDER_DAYS = [3, 1];

// ----------------------------------------------------------------
// Resend instance (lazy-init)
// ----------------------------------------------------------------
let resendInstance: Resend | null = null;

function getResend(): Resend | null {
  if (!RESEND_API_KEY) return null;
  if (!resendInstance) resendInstance = new Resend(RESEND_API_KEY);
  return resendInstance;
}

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------
export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export interface SendResult {
  ok: boolean;
  id?: string;
  error?: string;
}

export interface ReminderResult {
  sent: number;
  errors: number;
  details: Array<{
    walletAddress: string;
    email: string;
    daysLeft: number;
    expiresAt: string;
    ok: boolean;
    error?: string;
  }>;
}

// ----------------------------------------------------------------
// Cyberpunk Email Base Template
// ----------------------------------------------------------------
function baseTemplate(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="dark">
</head>
<body style="margin:0;padding:0;background:#000000;font-family:'Courier New',Consolas,monospace;color:#e0e0e0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#000000;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#0a0a0a;border:1px solid #00FFCC33;border-radius:8px;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="padding:32px 40px 16px;text-align:center;border-bottom:1px solid #00FFCC22;">
              <span style="font-size:28px;font-weight:bold;letter-spacing:6px;color:#00FFCC;font-family:'Courier New',Consolas,monospace;">PLVTVS</span><span style="font-size:28px;font-weight:bold;color:#FFCC00;font-family:'Courier New',Consolas,monospace;">.ONE</span>
              <div style="font-size:11px;color:#666;margin-top:4px;letter-spacing:2px;">YOUR SOUL IN THE WIRELESS SHELL</div>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding:32px 40px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px;text-align:center;border-top:1px solid #00FFCC22;font-size:11px;color:#444;">
              &copy; ${new Date().getFullYear()} PLVTVS.ONE &mdash; Beyond Agents<br>
              <span style="color:#333;">This is an automated system message.</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ----------------------------------------------------------------
// Email Templates
// ----------------------------------------------------------------

/** Subscription confirmation after successful purchase */
function buildConfirmHtml(
  walletAddress: string,
  tier: number,
  expiresAt: Date
): string {
  const tierNames: Record<number, string> = {
    1: 'MONTHLY',
    2: 'QUARTERLY',
    3: 'ANNUAL',
  };
  const tierName = tierNames[tier] || `TIER ${tier}`;
  const expiryStr = expiresAt.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return baseTemplate(`
    <div style="text-align:center;margin-bottom:24px;">
      <div style="font-size:48px;margin-bottom:8px;">&#x2714;</div>
      <div style="font-size:20px;font-weight:bold;color:#00FFCC;letter-spacing:2px;">SUBSCRIPTION ACTIVATED</div>
      <div style="font-size:12px;color:#666;margin-top:4px;">Your soul is now amplified</div>
    </div>

    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #00FFCC22;border-radius:4px;margin-bottom:24px;">
      <tr>
        <td style="padding:16px 20px;border-bottom:1px solid #00FFCC11;">
          <span style="color:#666;font-size:11px;letter-spacing:1px;">WALLET</span><br>
          <span style="color:#FFCC00;font-size:13px;word-break:break-all;">${walletAddress}</span>
        </td>
      </tr>
      <tr>
        <td style="padding:16px 20px;border-bottom:1px solid #00FFCC11;">
          <span style="color:#666;font-size:11px;letter-spacing:1px;">TIER</span><br>
          <span style="color:#00FFCC;font-size:18px;font-weight:bold;">${tierName}</span>
        </td>
      </tr>
      <tr>
        <td style="padding:16px 20px;">
          <span style="color:#666;font-size:11px;letter-spacing:1px;">EXPIRES</span><br>
          <span style="color:#e0e0e0;font-size:14px;">${expiryStr}</span>
        </td>
      </tr>
    </table>

    <div style="text-align:center;">
      <a href="https://plvtvs.one/dashboard" style="display:inline-block;padding:12px 32px;background:#00FFCC;color:#000000;text-decoration:none;border-radius:4px;font-weight:bold;font-size:14px;letter-spacing:1px;font-family:'Courier New',Consolas,monospace;">ACCESS DASHBOARD</a>
    </div>
  `);
}

/** Subscription expiry reminder */
function buildReminderHtml(
  walletAddress: string,
  daysLeft: number,
  expiresAt: Date
): string {
  const daysColor = daysLeft <= 1 ? '#FF4444' : '#FFCC00';
  const expiryStr = expiresAt.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const timeStr = expiresAt.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });

  const urgencyText =
    daysLeft <= 1
      ? 'URGENT — YOUR SUBSCRIPTION EXPIRES TOMORROW'
      : `YOUR SUBSCRIPTION EXPIRES IN ${daysLeft} DAYS`;

  return baseTemplate(`
    <div style="text-align:center;margin-bottom:24px;">
      <div style="font-size:48px;margin-bottom:8px;">&#x23F0;</div>
      <div style="font-size:16px;font-weight:bold;color:${daysColor};letter-spacing:1px;">${urgencyText}</div>
    </div>

    <!-- Countdown -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td align="center">
          <div style="display:inline-block;padding:16px 24px;background:#0d0d0d;border:1px solid ${daysColor}44;border-radius:4px;">
            <span style="font-size:36px;font-weight:bold;color:${daysColor};font-family:'Courier New',Consolas,monospace;">${daysLeft}</span>
            <div style="font-size:10px;color:#666;letter-spacing:2px;margin-top:2px;">DAYS REMAINING</div>
          </div>
        </td>
      </tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #00FFCC22;border-radius:4px;margin-bottom:24px;">
      <tr>
        <td style="padding:16px 20px;border-bottom:1px solid #00FFCC11;">
          <span style="color:#666;font-size:11px;letter-spacing:1px;">WALLET</span><br>
          <span style="color:#FFCC00;font-size:13px;word-break:break-all;">${walletAddress}</span>
        </td>
      </tr>
      <tr>
        <td style="padding:16px 20px;">
          <span style="color:#666;font-size:11px;letter-spacing:1px;">EXPIRES AT</span><br>
          <span style="color:#FF4444;font-size:14px;">${expiryStr} &middot; ${timeStr}</span>
        </td>
      </tr>
    </table>

    <div style="text-align:center;margin-bottom:8px;">
      <div style="font-size:11px;color:#666;margin-bottom:12px;">Without renewal, your soul returns to the void.</div>
      <a href="https://plvtvs.one/dashboard" style="display:inline-block;padding:12px 32px;background:#FFCC00;color:#000000;text-decoration:none;border-radius:4px;font-weight:bold;font-size:14px;letter-spacing:1px;font-family:'Courier New',Consolas,monospace;">RENEW NOW &#x2192;</a>
    </div>
  `);
}

/** Admin alert email */
function buildAdminAlertHtml(subject: string, message: string): string {
  return baseTemplate(`
    <div style="text-align:center;margin-bottom:24px;">
      <div style="font-size:36px;margin-bottom:8px;">&#x26A0;</div>
      <div style="font-size:16px;font-weight:bold;color:#FFCC00;letter-spacing:1px;">ADMIN ALERT</div>
      <div style="font-size:14px;color:#00FFCC;margin-top:8px;font-weight:bold;">${subject}</div>
    </div>

    <div style="border:1px solid #FFCC0022;border-radius:4px;padding:20px;background:#0d0d0d;margin-bottom:24px;">
      <pre style="margin:0;font-family:'Courier New',Consolas,monospace;font-size:12px;color:#e0e0e0;white-space:pre-wrap;word-break:break-word;">${message}</pre>
    </div>

    <div style="text-align:center;">
      <a href="https://plvtvs.one/admin" style="display:inline-block;padding:10px 28px;background:#00FFCC;color:#000000;text-decoration:none;border-radius:4px;font-weight:bold;font-size:13px;letter-spacing:1px;font-family:'Courier New',Consolas,monospace;">OPEN ADMIN PANEL</a>
    </div>
  `);
}

// ----------------------------------------------------------------
// Core Functions
// ----------------------------------------------------------------

/** Check whether Resend API key is configured */
export function isEmailConfigured(): boolean {
  return !!RESEND_API_KEY;
}

/** Send a single email via Resend */
export async function sendEmail(options: EmailOptions): Promise<SendResult> {
  const resend = getResend();
  if (!resend) {
    return { ok: false, error: 'Resend API key not configured (set RESEND_API_KEY)' };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: RESEND_FROM,
      to: [options.to],
      subject: options.subject,
      html: options.html,
    });

    if (error) {
      console.error('[email] Resend error:', error);
      return { ok: false, error: error.message || 'Unknown Resend error' };
    }

    console.log('[email] Sent:', data?.id, '→', options.to);
    return { ok: true, id: data?.id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[email] Exception:', msg);
    return { ok: false, error: msg };
  }
}

/** Send subscription confirmation email */
export async function sendSubscriptionConfirmation(
  email: string,
  walletAddress: string,
  tier: number,
  expiresAt: Date
): Promise<SendResult> {
  const html = buildConfirmHtml(walletAddress, tier, expiresAt);
  return sendEmail({
    to: email,
    subject: `PLVTVS.ONE — Subscription Activated (Tier ${tier})`,
    html,
  });
}

/** Send subscription expiry reminder */
export async function sendExpiryReminder(
  email: string,
  walletAddress: string,
  daysLeft: number,
  expiresAt: Date
): Promise<SendResult> {
  const html = buildReminderHtml(walletAddress, daysLeft, expiresAt);
  return sendEmail({
    to: email,
    subject: `PLVTVS.ONE — Subscription Expiring in ${daysLeft} Day${daysLeft > 1 ? 's' : ''}`,
    html,
  });
}

/** Send admin alert email */
export async function sendAdminAlert(
  subject: string,
  message: string
): Promise<SendResult> {
  if (!ADMIN_EMAIL) {
    console.warn('[email] ADMIN_EMAIL not set — alert skipped:', subject);
    return { ok: false, error: 'ADMIN_EMAIL not configured' };
  }

  const html = buildAdminAlertHtml(subject, message);
  return sendEmail({
    to: ADMIN_EMAIL,
    subject: `[PLVTVS ADMIN] ${subject}`,
    html,
  });
}

// ----------------------------------------------------------------
// Reminder Scanner
// ----------------------------------------------------------------

/**
 * Scan all users with active subscriptions and send expiry reminders.
 *
 * Checks for subscriptions expiring in exactly REMINDER_DAYS (3 and 1)
 * to avoid sending duplicate reminders. Uses a simple heuristic:
 * a user qualifies if their subscriptionExpiresAt is within the next
 * `days + 1` days but further than `days - 0.5` days.
 */
export async function checkAndSendReminders(): Promise<ReminderResult> {
  const now = new Date();
  const result: ReminderResult = { sent: 0, errors: 0, details: [] };

  if (!isEmailConfigured()) {
    console.warn('[email] checkAndSendReminders skipped — RESEND_API_KEY not set');
    return result;
  }

  // Gather users with expiring subscriptions
  interface ExpiringUser {
    walletAddress: string;
    email: string;
    subscriptionExpiresAt: Date;
  }

  let candidates: ExpiringUser[];

  if (isUsingMemDb || !db) {
    const mdb = getMemDb();
    candidates = [];
    for (const user of mdb.users.values()) {
      if (
        user.status === 'ACTIVE' &&
        user.email &&
        user.subscriptionTier > 0 &&
        user.subscriptionExpiresAt &&
        user.subscriptionExpiresAt > now
      ) {
        candidates.push({
          walletAddress: user.walletAddress,
          email: user.email,
          subscriptionExpiresAt: user.subscriptionExpiresAt,
        });
      }
    }
  } else {
    const users = await db.user.findMany({
      where: {
        status: 'ACTIVE',
        email: { not: null },
        subscriptionTier: { gt: 0 },
        subscriptionExpiresAt: {
          gt: now,
        },
      },
      select: {
        walletAddress: true,
        email: true,
        subscriptionExpiresAt: true,
      },
    });

    candidates = users
      .filter((u): u is ExpiringUser => !!u.email)
      .map((u) => ({
        walletAddress: u.walletAddress,
        email: u.email!,
        subscriptionExpiresAt: u.subscriptionExpiresAt!,
      }));
  }

  // For each candidate, check if they match any of the reminder windows
  for (const user of candidates) {
    const msUntilExpiry = user.subscriptionExpiresAt.getTime() - now.getTime();
    const daysUntilExpiry = msUntilExpiry / (1000 * 60 * 60 * 24);

    for (const targetDays of REMINDER_DAYS) {
      // Send if daysUntilExpiry is within [targetDays - 0.4, targetDays + 0.6]
      // This gives a ~1-day window per reminder and avoids duplicates for the same day
      if (
        daysUntilExpiry >= targetDays - 0.4 &&
        daysUntilExpiry <= targetDays + 0.6
      ) {
        const daysLeft = Math.round(daysUntilExpiry);
        const sendResult = await sendExpiryReminder(
          user.email,
          user.walletAddress,
          daysLeft,
          user.subscriptionExpiresAt
        );

        result.details.push({
          walletAddress: user.walletAddress,
          email: user.email,
          daysLeft,
          expiresAt: user.subscriptionExpiresAt.toISOString(),
          ok: sendResult.ok,
          error: sendResult.error,
        });

        if (sendResult.ok) {
          result.sent++;
        } else {
          result.errors++;
        }

        break; // Only one reminder per user per scan
      }
    }
  }

  // Log summary to activity log if using Prisma
  if (db && !isUsingMemDb && (result.sent > 0 || result.errors > 0)) {
    try {
      await db.activityLog.create({
        data: {
          sector: 'SYSTEM',
          level: 'INFO',
          message: `Email reminders — sent ${result.sent}, errors ${result.errors}`,
          metadata: JSON.stringify(result.details),
        },
      });
    } catch (e) {
      console.error('[email] Failed to log reminder activity:', e);
    }
  }

  return result;
}
