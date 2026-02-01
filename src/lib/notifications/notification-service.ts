import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import type { EmailLog, EmailTemplate } from "@prisma/client";
import type { NotificationType, NotificationContext, PRIORITY_VALUES } from "./types";
import {
  getTemplate,
  renderTemplate,
  buildTemplateVariables,
  getDefaultTemplate,
  baseTemplate,
  replaceVariables,
} from "./template-engine";
import { resolveRecipients } from "./recipient-resolver";
import { createEmailLog, processQueue, isSmtpConfigured } from "./email-queue";

/**
 * Send a notification (non-blocking)
 * This is the main entry point for sending notifications.
 * It queues the email for async processing and returns immediately.
 */
export async function sendNotification(
  type: NotificationType,
  context: NotificationContext
): Promise<void> {
  // Fire and forget - don't await
  queueNotification(type, context).catch((error) => {
    logger.error("Failed to queue notification", { error, type, context });
  });
}

/**
 * Queue a notification for sending
 * Returns the email log IDs created
 */
export async function queueNotification(
  type: NotificationType,
  context: NotificationContext
): Promise<string[]> {
  const emailLogIds: string[] = [];

  try {
    // Resolve recipients
    const recipients = await resolveRecipients(type, context);

    if (recipients.length === 0) {
      logger.debug("No recipients for notification", { type });
      return emailLogIds;
    }

    // Get template
    let template: EmailTemplate | null = await getTemplate(type);
    let subject: string;
    let htmlBody: string;

    if (template) {
      // Use database template
      subject = template.subject;
      htmlBody = template.htmlBody;
    } else {
      // Use default template
      const defaultTemplate = getDefaultTemplate(type);
      subject = defaultTemplate.subject;
      htmlBody = defaultTemplate.htmlBody;
    }

    // Queue email for each recipient
    for (const recipient of recipients) {
      try {
        const variables = buildTemplateVariables(
          recipient.name,
          recipient.email,
          context.variables
        );

        const renderedSubject = replaceVariables(subject, variables);
        const renderedBody = replaceVariables(htmlBody, variables);
        const fullHtml = baseTemplate(renderedBody);

        const emailLog = await createEmailLog({
          templateId: template?.id,
          recipientId: recipient.userId,
          recipientEmail: recipient.email,
          recipientName: recipient.name,
          subject: renderedSubject,
          type: type,
          entityType: context.entityType,
          entityId: context.entityId,
          metadata: {
            priority: context.priority || "NORMAL",
            actorId: context.actorId,
            actorName: context.actorName,
          },
          htmlContent: fullHtml,
        });

        emailLogIds.push(emailLog.id);

        logger.debug("Email queued", {
          id: emailLog.id,
          type,
          recipient: recipient.email,
        });
      } catch (error) {
        logger.error("Failed to queue email for recipient", {
          error,
          type,
          recipient: recipient.email,
        });
      }
    }

    logger.info("Notifications queued", {
      type,
      recipientCount: recipients.length,
      queuedCount: emailLogIds.length,
    });

    // Optionally trigger immediate processing for high-priority
    if (context.priority === "URGENT" || context.priority === "HIGH") {
      // Process queue immediately (but don't wait for it)
      processQueue(10).catch((error) => {
        logger.error("Failed to process urgent queue", { error });
      });
    }

    return emailLogIds;
  } catch (error) {
    logger.error("Failed to queue notification", { error, type });
    return emailLogIds;
  }
}

/**
 * Send notification synchronously (blocking)
 * Use sparingly - only when immediate send confirmation is needed
 */
export async function sendNotificationSync(
  type: NotificationType,
  context: NotificationContext
): Promise<{ success: boolean; sentCount: number; failedCount: number }> {
  const result = {
    success: false,
    sentCount: 0,
    failedCount: 0,
  };

  try {
    // Queue the notifications
    const emailLogIds = await queueNotification(type, context);

    if (emailLogIds.length === 0) {
      result.success = true;
      return result;
    }

    // Process queue immediately
    const processResult = await processQueue(emailLogIds.length);

    result.sentCount = processResult.sent;
    result.failedCount = processResult.failed;
    result.success = processResult.failed === 0;

    return result;
  } catch (error) {
    logger.error("Failed to send notification sync", { error, type });
    return result;
  }
}

/**
 * Send a custom email (not using notification rules)
 */
export async function sendCustomEmail(options: {
  to: string | string[];
  subject: string;
  content: string;
  entityType?: string;
  entityId?: string;
}): Promise<string[]> {
  const recipients = Array.isArray(options.to) ? options.to : [options.to];
  const emailLogIds: string[] = [];

  for (const recipientEmail of recipients) {
    try {
      const fullHtml = baseTemplate(options.content);

      const emailLog = await createEmailLog({
        recipientEmail,
        subject: options.subject,
        type: "CUSTOM",
        entityType: options.entityType,
        entityId: options.entityId,
        htmlContent: fullHtml,
      });

      emailLogIds.push(emailLog.id);
    } catch (error) {
      logger.error("Failed to queue custom email", {
        error,
        recipientEmail,
      });
    }
  }

  return emailLogIds;
}

/**
 * Send appreciation email
 */
export async function sendAppreciation(options: {
  recipientId: string;
  recipientEmail: string;
  recipientName: string;
  senderName: string;
  message: string;
}): Promise<void> {
  await sendNotification("APPRECIATION", {
    subjectId: options.recipientId,
    subjectEmail: options.recipientEmail,
    subjectName: options.recipientName,
    variables: {
      senderName: options.senderName,
      message: options.message,
    },
  });
}

/**
 * Send welcome email to new employee
 */
export async function sendWelcomeEmail(options: {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  employeeId: string;
}): Promise<void> {
  await sendNotification("WELCOME_EMAIL", {
    subjectId: options.userId,
    subjectEmail: options.email,
    subjectName: `${options.firstName} ${options.lastName}`,
    variables: {
      employeeName: `${options.firstName} ${options.lastName}`,
      email: options.email,
      employeeId: options.employeeId,
    },
  });
}

/**
 * Send leave request notification
 */
export async function sendLeaveNotification(
  notificationType:
    | "LEAVE_REQUEST_SUBMITTED"
    | "LEAVE_REQUEST_APPROVED"
    | "LEAVE_REQUEST_REJECTED"
    | "LEAVE_REQUEST_CANCELLED"
    | "LEAVE_PENDING_APPROVAL",
  options: {
    leaveRequestId: string;
    userId: string;
    userEmail: string;
    userName: string;
    leaveType: string;
    startDate: string;
    endDate: string;
    days: number;
    reason?: string;
    approverName?: string;
    rejectionReason?: string;
  }
): Promise<void> {
  await sendNotification(notificationType, {
    entityType: "LEAVE_REQUEST",
    entityId: options.leaveRequestId,
    subjectId: options.userId,
    subjectEmail: options.userEmail,
    subjectName: options.userName,
    variables: {
      employeeName: options.userName,
      leaveType: options.leaveType,
      startDate: options.startDate,
      endDate: options.endDate,
      days: options.days,
      reason: options.reason || "",
      approverName: options.approverName || "",
      rejectionReason: options.rejectionReason || "",
    },
  });
}

/**
 * Send request notification (self-service requests)
 */
export async function sendRequestNotification(
  notificationType: "REQUEST_SUBMITTED" | "REQUEST_APPROVED" | "REQUEST_REJECTED",
  options: {
    requestId: string;
    userId: string;
    userEmail: string;
    userName: string;
    requestType: string;
    subject: string;
    approverName?: string;
    response?: string;
  }
): Promise<void> {
  await sendNotification(notificationType, {
    entityType: "EMPLOYEE_REQUEST",
    entityId: options.requestId,
    subjectId: options.userId,
    subjectEmail: options.userEmail,
    subjectName: options.userName,
    variables: {
      requestType: options.requestType,
      subject: options.subject,
      approverName: options.approverName || "",
      response: options.response || "",
    },
  });
}

/**
 * Send announcement notification
 */
export async function sendAnnouncementNotification(options: {
  noticeId: string;
  title: string;
  content: string;
  type: "GENERAL" | "IMPORTANT" | "URGENT";
  publishedBy: string;
  recipientIds?: string[];
}): Promise<void> {
  const typeLabel =
    options.type === "URGENT"
      ? "Urgent"
      : options.type === "IMPORTANT"
        ? "Important"
        : "General";

  const preview =
    options.content.length > 200
      ? options.content.substring(0, 200) + "..."
      : options.content;

  await sendNotification("ANNOUNCEMENT_PUBLISHED", {
    entityType: "NOTICE",
    entityId: options.noticeId,
    customRecipientIds: options.recipientIds,
    priority: options.type === "URGENT" ? "URGENT" : options.type === "IMPORTANT" ? "HIGH" : "NORMAL",
    variables: {
      typeLabel,
      title: options.title,
      preview,
      publishedBy: options.publishedBy,
    },
  });
}

/**
 * Send asset notification
 */
export async function sendAssetNotification(
  notificationType: "ASSET_ASSIGNED" | "ASSET_RETURNED",
  options: {
    assetId: string;
    assetName: string;
    assetTag: string;
    category: string;
    userId: string;
    userEmail: string;
    userName: string;
    actionByName: string;
    condition?: string;
  }
): Promise<void> {
  await sendNotification(notificationType, {
    entityType: "ASSET",
    entityId: options.assetId,
    subjectId: options.userId,
    subjectEmail: options.userEmail,
    subjectName: options.userName,
    variables: {
      assetName: options.assetName,
      assetTag: options.assetTag,
      category: options.category,
      assignedBy: options.actionByName,
      returnedBy: options.actionByName,
      condition: options.condition || "",
    },
  });
}

/**
 * Get email log by ID
 */
export async function getEmailLog(id: string): Promise<EmailLog | null> {
  return prisma.emailLog.findUnique({
    where: { id },
    include: {
      template: true,
    },
  });
}

/**
 * Test email configuration
 */
export async function testEmailConfiguration(
  testEmail: string
): Promise<{ success: boolean; message: string }> {
  if (!isSmtpConfigured()) {
    return {
      success: false,
      message: "SMTP not configured. Please set SMTP_USER and SMTP_PASSWORD environment variables.",
    };
  }

  try {
    const emailLogIds = await sendCustomEmail({
      to: testEmail,
      subject: "Test Email - HRM System",
      content: `
        <h2 class="title">Test Email</h2>
        <p>This is a test email to verify your email configuration is working correctly.</p>
        <p style="color: #666; font-size: 12px;">Sent at: ${new Date().toISOString()}</p>
      `,
    });

    // Process immediately
    await processQueue(1);

    // Check result
    const emailLog = await getEmailLog(emailLogIds[0]);

    if (emailLog?.status === "SENT") {
      return {
        success: true,
        message: "Test email sent successfully!",
      };
    } else {
      return {
        success: false,
        message: emailLog?.errorMessage || "Email failed to send. Check logs for details.",
      };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      success: false,
      message: `Failed to send test email: ${message}`,
    };
  }
}
