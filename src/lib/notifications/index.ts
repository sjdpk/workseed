// Main notification service exports
export {
  sendNotification,
  sendNotificationSync,
  sendCustomEmail,
  sendAppreciation,
  sendWelcomeEmail,
  sendLeaveNotification,
  sendRequestNotification,
  sendAnnouncementNotification,
  sendAssetNotification,
  getEmailLog,
  testEmailConfiguration,
} from "./notification-service";

// Queue management exports
export {
  processQueue,
  getEmailStats,
  getEmailLogs,
  retryEmail,
  getPendingCount,
  isSmtpConfigured,
} from "./email-queue";

// Template engine exports
export {
  getTemplate,
  getTemplateById,
  renderTemplate,
  validateTemplate,
  parseVariables,
  getDefaultTemplate,
  DEFAULT_TEMPLATES,
  baseTemplate,
} from "./template-engine";

// Recipient resolver exports
export {
  resolveRecipients,
  getNotificationRule,
  isNotificationEnabled,
  getDefaultRecipientConfig,
} from "./recipient-resolver";

// Type exports
export type {
  NotificationContext,
  NotificationRecipient,
  TemplateVariables,
  RenderedEmail,
  RecipientConfig,
  QueueProcessResult,
  EmailStats,
} from "./types";

export {
  NotificationType,
  EmailStatus,
  PRIORITY_VALUES,
  RETRY_CONFIG,
  BATCH_CONFIG,
} from "./types";
