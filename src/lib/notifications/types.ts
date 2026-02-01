import { NotificationType, EmailStatus } from "@prisma/client";

export { NotificationType, EmailStatus };

/**
 * Context for sending a notification
 */
export interface NotificationContext {
  /** The entity that triggered the notification (e.g., "LEAVE_REQUEST") */
  entityType?: string;
  /** The ID of the related entity */
  entityId?: string;
  /** The user who triggered the action */
  actorId?: string;
  /** Name of the user who triggered the action */
  actorName?: string;
  /** The primary subject user of the notification (e.g., the employee requesting leave) */
  subjectId?: string;
  /** Name of the subject user */
  subjectName?: string;
  /** Email of the subject user (for notifications to the requester) */
  subjectEmail?: string;
  /** Additional template variables */
  variables: Record<string, string | number | boolean | null | undefined>;
  /** Override recipients (user IDs) - bypasses rule-based resolution */
  customRecipientIds?: string[];
  /** Override recipient emails - bypasses rule-based resolution */
  customRecipientEmails?: string[];
  /** Priority for queue ordering */
  priority?: "LOW" | "NORMAL" | "HIGH" | "URGENT";
}

/**
 * Resolved recipient for notification
 */
export interface NotificationRecipient {
  /** User ID if recipient is a system user */
  userId?: string;
  /** Email address */
  email: string;
  /** Display name */
  name: string;
}

/**
 * Template variables available for rendering
 */
export interface TemplateVariables {
  /** Application name */
  appName: string;
  /** Application URL */
  appUrl: string;
  /** Current year */
  currentYear: number;
  /** Recipient's name */
  recipientName: string;
  /** Recipient's email */
  recipientEmail: string;
  /** Dynamic variables from context */
  [key: string]: string | number | boolean | null | undefined;
}

/**
 * Rendered email content
 */
export interface RenderedEmail {
  subject: string;
  html: string;
  text?: string;
}

/**
 * Recipient configuration stored in NotificationRule
 */
export interface RecipientConfig {
  /** Notify the user who initiated the action (requester) */
  notifyRequester?: boolean;
  /** Notify the requester's direct manager */
  notifyManager?: boolean;
  /** Notify the requester's team lead */
  notifyTeamLead?: boolean;
  /** Notify the requester's department head */
  notifyDepartmentHead?: boolean;
  /** Notify all HR users */
  notifyHR?: boolean;
  /** Notify all Admin users */
  notifyAdmin?: boolean;
  /** Specific user IDs to always notify */
  customRecipients?: string[];
  /** Specific roles to notify */
  roleRecipients?: string[];
}

/**
 * Result of queue processing
 */
export interface QueueProcessResult {
  processed: number;
  sent: number;
  failed: number;
  skipped: number;
}

/**
 * Email statistics
 */
export interface EmailStats {
  total: number;
  pending: number;
  queued: number;
  sending: number;
  sent: number;
  failed: number;
  todaySent: number;
  todayFailed: number;
  weekSent: number;
  weekFailed: number;
}

/**
 * Priority values for queue ordering
 */
export const PRIORITY_VALUES: Record<string, number> = {
  LOW: 0,
  NORMAL: 1,
  HIGH: 2,
  URGENT: 3,
};

/**
 * Default retry configuration
 */
export const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelayMs: 1000, // 1 second
  maxDelayMs: 60000, // 1 minute
};

/**
 * Batch processing configuration
 */
export const BATCH_CONFIG = {
  batchSize: 50,
  processingIntervalMs: 5000, // 5 seconds
};
