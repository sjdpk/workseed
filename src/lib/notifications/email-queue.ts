import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import type { EmailLog, EmailStatus } from "@prisma/client";
import {
  type QueueProcessResult,
  type EmailStats,
  RETRY_CONFIG,
  BATCH_CONFIG,
} from "./types";

const FROM_EMAIL = process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@hrm.local";
const APP_NAME = process.env.APP_NAME || "Workseed";

// Create transporter lazily to avoid issues during build
let transporter: Transporter | null = null;
let isEtherealTransporter = false;
let transporterInitializing: Promise<Transporter> | null = null;

async function getTransporter(): Promise<Transporter> {
  if (transporter) return transporter;
  if (transporterInitializing) return transporterInitializing;

  transporterInitializing = initTransporter();
  return transporterInitializing;
}

async function initTransporter(): Promise<Transporter> {
  const isProduction = process.env.NODE_ENV === "production";
  const hasSmtpConfig = process.env.SMTP_USER && process.env.SMTP_PASSWORD;

  if (isProduction && hasSmtpConfig) {
    // Production: Use configured SMTP
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
    isEtherealTransporter = false;
    logger.info("Email transporter initialized with production SMTP");
  } else if (hasSmtpConfig) {
    // Development with SMTP config: Use configured SMTP
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
    isEtherealTransporter = false;
    logger.info("Email transporter initialized with configured SMTP");
  } else {
    // Development without SMTP: Use Ethereal (fake SMTP for testing)
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    isEtherealTransporter = true;
    logger.info("Email transporter initialized with Ethereal test account", {
      user: testAccount.user,
    });
  }

  return transporter;
}

/**
 * Check if SMTP is configured (or Ethereal available in dev)
 */
export function isSmtpConfigured(): boolean {
  // In development, we always have Ethereal as fallback
  if (process.env.NODE_ENV !== "production") {
    return true;
  }
  return !!(process.env.SMTP_USER && process.env.SMTP_PASSWORD);
}

/**
 * Create an email log entry (queued state)
 */
export async function createEmailLog(data: {
  templateId?: string;
  recipientId?: string;
  recipientEmail: string;
  recipientName?: string;
  subject: string;
  type: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  htmlContent: string;
}): Promise<EmailLog> {
  return prisma.emailLog.create({
    data: {
      templateId: data.templateId,
      recipientId: data.recipientId,
      recipientEmail: data.recipientEmail,
      recipientName: data.recipientName,
      subject: data.subject,
      type: data.type as EmailLog["type"],
      entityType: data.entityType,
      entityId: data.entityId,
      status: "QUEUED",
      metadata: {
        ...data.metadata,
        htmlContent: data.htmlContent,
      },
    },
  });
}

/**
 * Update email log status
 */
export async function updateEmailLogStatus(
  id: string,
  status: EmailStatus,
  extra?: {
    errorMessage?: string;
    sentAt?: Date;
    failedAt?: Date;
  }
): Promise<void> {
  await prisma.emailLog.update({
    where: { id },
    data: {
      status,
      ...extra,
      updatedAt: new Date(),
    },
  });
}

/**
 * Increment retry count for an email log
 */
export async function incrementRetryCount(
  id: string,
  errorMessage: string
): Promise<void> {
  await prisma.emailLog.update({
    where: { id },
    data: {
      retryCount: { increment: 1 },
      errorMessage,
      updatedAt: new Date(),
    },
  });
}

/**
 * Validate email address format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Send a single email
 */
export async function sendSingleEmail(
  to: string,
  subject: string,
  html: string
): Promise<boolean> {
  // Validate email address
  if (!to || !isValidEmail(to)) {
    logger.error("Invalid email address", { to, subject });
    throw new Error(`Invalid email address: ${to}`);
  }

  try {
    const transport = await getTransporter();
    const fromEmail = isEtherealTransporter ? "noreply@test.local" : FROM_EMAIL;

    const info = await transport.sendMail({
      from: `"${APP_NAME}" <${fromEmail}>`,
      to,
      subject,
      html,
    });

    logger.info("Email sent successfully", { to, subject, messageId: info.messageId });

    // Log preview URL for Ethereal (development testing)
    if (isEtherealTransporter) {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        logger.info("Ethereal preview URL", { previewUrl });
        console.log("\n========================================");
        console.log("EMAIL SENT! Preview URL:");
        console.log(previewUrl);
        console.log("========================================\n");
      }
    }

    return true;
  } catch (error) {
    logger.error("Email sending failed", { error, to, subject });
    throw error;
  }
}

/**
 * Process a single queued email
 */
async function processQueuedEmail(emailLog: EmailLog): Promise<boolean> {
  const metadata = emailLog.metadata as Record<string, unknown> | null;
  const htmlContent = metadata?.htmlContent as string | undefined;

  if (!htmlContent) {
    logger.error("Email log missing HTML content", { id: emailLog.id });
    await updateEmailLogStatus(emailLog.id, "FAILED", {
      errorMessage: "Missing HTML content",
      failedAt: new Date(),
    });
    return false;
  }

  // Update status to SENDING
  await updateEmailLogStatus(emailLog.id, "SENDING");

  try {
    await sendSingleEmail(emailLog.recipientEmail, emailLog.subject, htmlContent);

    // Update status to SENT
    await updateEmailLogStatus(emailLog.id, "SENT", {
      sentAt: new Date(),
    });

    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    // Check if we should retry
    if (emailLog.retryCount < RETRY_CONFIG.maxRetries) {
      await incrementRetryCount(emailLog.id, errorMessage);
      // Reset to QUEUED for retry
      await updateEmailLogStatus(emailLog.id, "QUEUED");
      logger.warn("Email failed, will retry", {
        id: emailLog.id,
        retryCount: emailLog.retryCount + 1,
        error: errorMessage,
      });
    } else {
      // Max retries reached, mark as FAILED
      await updateEmailLogStatus(emailLog.id, "FAILED", {
        errorMessage,
        failedAt: new Date(),
      });
      logger.error("Email permanently failed after max retries", {
        id: emailLog.id,
        retryCount: emailLog.retryCount,
        error: errorMessage,
      });
    }

    return false;
  }
}

/**
 * Process the email queue
 */
export async function processQueue(
  batchSize: number = BATCH_CONFIG.batchSize
): Promise<QueueProcessResult> {
  const result: QueueProcessResult = {
    processed: 0,
    sent: 0,
    failed: 0,
    skipped: 0,
  };

  try {
    // Initialize transporter (will use Ethereal in dev if SMTP not configured)
    await getTransporter();
    // Get batch of queued emails
    const queuedEmails = await prisma.emailLog.findMany({
      where: {
        status: "QUEUED",
        retryCount: { lt: RETRY_CONFIG.maxRetries },
      },
      orderBy: [
        { createdAt: "asc" }, // Process oldest first
      ],
      take: batchSize,
    });

    logger.info(`Processing ${queuedEmails.length} queued emails`);

    for (const emailLog of queuedEmails) {
      result.processed++;

      const success = await processQueuedEmail(emailLog);
      if (success) {
        result.sent++;
      } else {
        result.failed++;
      }

      // Small delay between emails to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    logger.info("Queue processing completed", { result });
  } catch (error) {
    logger.error("Queue processing error", { error });
  }

  return result;
}

/**
 * Get pending email count
 */
export async function getPendingCount(): Promise<number> {
  return prisma.emailLog.count({
    where: {
      status: { in: ["PENDING", "QUEUED"] },
    },
  });
}

/**
 * Get email statistics
 */
export async function getEmailStats(): Promise<EmailStats> {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - 7);

  const [
    total,
    pending,
    queued,
    sending,
    sent,
    failed,
    todaySent,
    todayFailed,
    weekSent,
    weekFailed,
  ] = await Promise.all([
    prisma.emailLog.count(),
    prisma.emailLog.count({ where: { status: "PENDING" } }),
    prisma.emailLog.count({ where: { status: "QUEUED" } }),
    prisma.emailLog.count({ where: { status: "SENDING" } }),
    prisma.emailLog.count({ where: { status: "SENT" } }),
    prisma.emailLog.count({ where: { status: "FAILED" } }),
    prisma.emailLog.count({
      where: { status: "SENT", sentAt: { gte: startOfToday } },
    }),
    prisma.emailLog.count({
      where: { status: "FAILED", failedAt: { gte: startOfToday } },
    }),
    prisma.emailLog.count({
      where: { status: "SENT", sentAt: { gte: startOfWeek } },
    }),
    prisma.emailLog.count({
      where: { status: "FAILED", failedAt: { gte: startOfWeek } },
    }),
  ]);

  return {
    total,
    pending,
    queued,
    sending,
    sent,
    failed,
    todaySent,
    todayFailed,
    weekSent,
    weekFailed,
  };
}

/**
 * Retry a failed email
 */
export async function retryEmail(id: string): Promise<boolean> {
  const emailLog = await prisma.emailLog.findUnique({
    where: { id },
  });

  if (!emailLog) {
    logger.warn("Email log not found for retry", { id });
    return false;
  }

  if (emailLog.status !== "FAILED") {
    logger.warn("Cannot retry non-failed email", { id, status: emailLog.status });
    return false;
  }

  // Reset status and retry count
  await prisma.emailLog.update({
    where: { id },
    data: {
      status: "QUEUED",
      retryCount: 0,
      errorMessage: null,
      failedAt: null,
      updatedAt: new Date(),
    },
  });

  logger.info("Email queued for retry", { id });
  return true;
}

/**
 * Get email logs with filters
 */
export async function getEmailLogs(options: {
  page?: number;
  limit?: number;
  status?: EmailStatus;
  type?: string;
  recipientEmail?: string;
  startDate?: Date;
  endDate?: Date;
}) {
  const {
    page = 1,
    limit = 20,
    status,
    type,
    recipientEmail,
    startDate,
    endDate,
  } = options;

  const where: Record<string, unknown> = {};

  if (status) where.status = status;
  if (type) where.type = type;
  if (recipientEmail) {
    where.recipientEmail = { contains: recipientEmail, mode: "insensitive" };
  }
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) (where.createdAt as Record<string, Date>).gte = startDate;
    if (endDate) (where.createdAt as Record<string, Date>).lte = endDate;
  }

  const [logs, total] = await Promise.all([
    prisma.emailLog.findMany({
      where,
      include: {
        template: {
          select: { name: true, displayName: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.emailLog.count({ where }),
  ]);

  return {
    logs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
