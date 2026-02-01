import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import type { Role } from "@prisma/client";
import type {
  NotificationType,
  NotificationContext,
  NotificationRecipient,
  RecipientConfig,
} from "./types";

/**
 * Get notification rule for a type
 */
export async function getNotificationRule(type: NotificationType) {
  try {
    return await prisma.notificationRule.findUnique({
      where: { type },
    });
  } catch (error) {
    logger.error("Failed to fetch notification rule", { error, type });
    return null;
  }
}

/**
 * Check if user has disabled notifications for this type
 */
export async function isNotificationEnabled(
  userId: string,
  type: NotificationType
): Promise<boolean> {
  try {
    const preference = await prisma.notificationPreference.findUnique({
      where: {
        userId_type: { userId, type },
      },
    });

    // Default to enabled if no preference set
    return preference?.emailEnabled ?? true;
  } catch (error) {
    logger.error("Failed to check notification preference", { error, userId, type });
    return true; // Default to enabled on error
  }
}

/**
 * Get user by ID with relevant details
 */
async function getUserById(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      status: true,
      managerId: true,
      teamId: true,
      departmentId: true,
      team: {
        select: {
          leadId: true,
        },
      },
      department: {
        select: {
          headId: true,
        },
      },
    },
  });
}

/**
 * Get users by role
 */
async function getUsersByRole(roles: Role[]): Promise<NotificationRecipient[]> {
  const users = await prisma.user.findMany({
    where: {
      role: { in: roles },
      status: "ACTIVE",
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
    },
  });

  return users.map((u) => ({
    userId: u.id,
    email: u.email,
    name: `${u.firstName} ${u.lastName}`,
  }));
}

/**
 * Get users by specific IDs
 */
async function getUsersByIds(userIds: string[]): Promise<NotificationRecipient[]> {
  if (!userIds.length) return [];

  const users = await prisma.user.findMany({
    where: {
      id: { in: userIds },
      status: "ACTIVE",
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
    },
  });

  return users.map((u) => ({
    userId: u.id,
    email: u.email,
    name: `${u.firstName} ${u.lastName}`,
  }));
}

/**
 * Get the manager chain for a user (direct manager)
 */
async function getManagerForUser(userId: string): Promise<NotificationRecipient | null> {
  const user = await getUserById(userId);
  if (!user?.managerId) return null;

  const manager = await prisma.user.findUnique({
    where: { id: user.managerId, status: "ACTIVE" },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
    },
  });

  if (!manager) return null;

  return {
    userId: manager.id,
    email: manager.email,
    name: `${manager.firstName} ${manager.lastName}`,
  };
}

/**
 * Get team lead for a user
 */
async function getTeamLeadForUser(userId: string): Promise<NotificationRecipient | null> {
  const user = await getUserById(userId);
  if (!user?.team?.leadId) return null;

  const teamLead = await prisma.user.findUnique({
    where: { id: user.team.leadId, status: "ACTIVE" },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
    },
  });

  if (!teamLead) return null;

  return {
    userId: teamLead.id,
    email: teamLead.email,
    name: `${teamLead.firstName} ${teamLead.lastName}`,
  };
}

/**
 * Get department head for a user
 */
async function getDepartmentHeadForUser(userId: string): Promise<NotificationRecipient | null> {
  const user = await getUserById(userId);
  if (!user?.department?.headId) return null;

  const deptHead = await prisma.user.findUnique({
    where: { id: user.department.headId, status: "ACTIVE" },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
    },
  });

  if (!deptHead) return null;

  return {
    userId: deptHead.id,
    email: deptHead.email,
    name: `${deptHead.firstName} ${deptHead.lastName}`,
  };
}

/**
 * Parse recipient config from JSON
 */
function parseRecipientConfig(config: unknown): RecipientConfig {
  if (typeof config !== "object" || config === null) {
    return {};
  }
  return config as RecipientConfig;
}

/**
 * Main function to resolve recipients based on notification rules
 */
export async function resolveRecipients(
  type: NotificationType,
  context: NotificationContext
): Promise<NotificationRecipient[]> {
  const recipients: NotificationRecipient[] = [];
  const seenEmails = new Set<string>();

  // Helper to add recipient without duplicates
  const addRecipient = (recipient: NotificationRecipient | null) => {
    if (recipient && !seenEmails.has(recipient.email.toLowerCase())) {
      seenEmails.add(recipient.email.toLowerCase());
      recipients.push(recipient);
    }
  };

  // If custom recipients specified in context, use those exclusively
  if (context.customRecipientIds?.length) {
    const customRecipients = await getUsersByIds(context.customRecipientIds);
    customRecipients.forEach(addRecipient);
    return recipients;
  }

  if (context.customRecipientEmails?.length) {
    context.customRecipientEmails.forEach((email) => {
      addRecipient({ email, name: email });
    });
    return recipients;
  }

  // Get notification rule from database
  const rule = await getNotificationRule(type);

  if (!rule || !rule.isActive) {
    logger.debug("No active notification rule found, using defaults", { type });
    // Default: notify requester if available
    if (context.subjectId && context.subjectEmail && context.subjectName) {
      addRecipient({
        userId: context.subjectId,
        email: context.subjectEmail,
        name: context.subjectName,
      });
    }
    return recipients;
  }

  const config = parseRecipientConfig(rule.recipientConfig);
  const subjectUserId = context.subjectId || context.actorId;

  // Notify the requester/subject
  if (config.notifyRequester && context.subjectEmail && context.subjectName) {
    addRecipient({
      userId: context.subjectId,
      email: context.subjectEmail,
      name: context.subjectName,
    });
  }

  // Notify manager
  if (config.notifyManager && subjectUserId) {
    const manager = await getManagerForUser(subjectUserId);
    addRecipient(manager);
  }

  // Notify team lead
  if (config.notifyTeamLead && subjectUserId) {
    const teamLead = await getTeamLeadForUser(subjectUserId);
    addRecipient(teamLead);
  }

  // Notify department head
  if (config.notifyDepartmentHead && subjectUserId) {
    const deptHead = await getDepartmentHeadForUser(subjectUserId);
    addRecipient(deptHead);
  }

  // Notify HR users
  if (config.notifyHR) {
    const hrUsers = await getUsersByRole(["HR"]);
    hrUsers.forEach(addRecipient);
  }

  // Notify Admin users
  if (config.notifyAdmin) {
    const adminUsers = await getUsersByRole(["ADMIN"]);
    adminUsers.forEach(addRecipient);
  }

  // Notify custom recipients (specific users)
  if (config.customRecipients?.length) {
    const customUsers = await getUsersByIds(config.customRecipients);
    customUsers.forEach(addRecipient);
  }

  // Notify by role
  if (config.roleRecipients?.length) {
    const roleUsers = await getUsersByRole(config.roleRecipients as Role[]);
    roleUsers.forEach(addRecipient);
  }

  // Filter out recipients who have disabled this notification type
  const enabledRecipients: NotificationRecipient[] = [];
  for (const recipient of recipients) {
    if (recipient.userId) {
      const enabled = await isNotificationEnabled(recipient.userId, type);
      if (enabled) {
        enabledRecipients.push(recipient);
      } else {
        logger.debug("Recipient has disabled notifications", {
          userId: recipient.userId,
          type,
        });
      }
    } else {
      // Non-user recipients (custom emails) are always included
      enabledRecipients.push(recipient);
    }
  }

  return enabledRecipients;
}

/**
 * Get default recipient config for a notification type
 */
export function getDefaultRecipientConfig(type: NotificationType): RecipientConfig {
  const defaults: Partial<Record<NotificationType, RecipientConfig>> = {
    LEAVE_REQUEST_SUBMITTED: {
      notifyRequester: true,
    },
    LEAVE_REQUEST_APPROVED: {
      notifyRequester: true,
    },
    LEAVE_REQUEST_REJECTED: {
      notifyRequester: true,
    },
    LEAVE_REQUEST_CANCELLED: {
      notifyManager: true,
      notifyHR: true,
    },
    LEAVE_PENDING_APPROVAL: {
      notifyManager: true,
      notifyTeamLead: true,
      notifyHR: true,
    },
    REQUEST_SUBMITTED: {
      notifyRequester: true,
      notifyHR: true,
    },
    REQUEST_APPROVED: {
      notifyRequester: true,
    },
    REQUEST_REJECTED: {
      notifyRequester: true,
    },
    ANNOUNCEMENT_PUBLISHED: {
      // All users - handled specially
    },
    BIRTHDAY_REMINDER: {
      notifyRequester: true, // Birthday person
    },
    WORK_ANNIVERSARY: {
      notifyRequester: true, // Employee
    },
    ASSET_ASSIGNED: {
      notifyRequester: true, // Assignee
    },
    ASSET_RETURNED: {
      notifyHR: true,
      notifyAdmin: true,
    },
    WELCOME_EMAIL: {
      notifyRequester: true, // New employee
    },
    PASSWORD_RESET: {
      notifyRequester: true, // User requesting reset
    },
    APPRECIATION: {
      notifyRequester: true, // Recipient of appreciation
    },
    CUSTOM: {
      // No defaults
    },
  };

  return defaults[type] || {};
}
