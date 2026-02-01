import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import type { EmailTemplate } from "@prisma/client";
import type { NotificationType, TemplateVariables, RenderedEmail } from "./types";

const APP_NAME = process.env.APP_NAME || "Workseed";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

/**
 * Base HTML template wrapper with consistent styling
 */
export function baseTemplate(content: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .card { background: #fff; border-radius: 8px; padding: 32px; margin: 20px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .header { text-align: center; margin-bottom: 24px; }
    .logo { font-size: 24px; font-weight: 700; color: #111; }
    .title { font-size: 20px; font-weight: 600; color: #111; margin: 0 0 16px; }
    .subtitle { font-size: 14px; color: #666; margin: 0 0 24px; }
    .content { font-size: 14px; color: #444; }
    .button { display: inline-block; background: #111; color: #fff !important; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500; margin: 16px 0; }
    .button:hover { background: #333; }
    .footer { text-align: center; font-size: 12px; color: #999; margin-top: 32px; padding-top: 16px; border-top: 1px solid #eee; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 16px; font-size: 12px; font-weight: 500; }
    .badge-pending { background: #FEF3C7; color: #92400E; }
    .badge-approved { background: #D1FAE5; color: #065F46; }
    .badge-rejected { background: #FEE2E2; color: #991B1B; }
    .badge-info { background: #DBEAFE; color: #1E40AF; }
    .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f0f0f0; }
    .info-label { color: #666; font-size: 13px; }
    .info-value { color: #111; font-size: 13px; font-weight: 500; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <div class="logo">${APP_NAME}</div>
      </div>
      ${content}
    </div>
    <div class="footer">
      <p>This is an automated message from ${APP_NAME}.</p>
      <p>If you have any questions, please contact your HR department.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Replace template variables in a string
 * Supports {{variableName}} syntax
 */
export function replaceVariables(
  template: string,
  variables: TemplateVariables
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const value = variables[key];
    if (value === undefined || value === null) {
      return "";
    }
    return String(value);
  });
}

/**
 * Parse variables from a template string
 * Returns array of variable names found
 */
export function parseVariables(template: string): string[] {
  const matches = template.match(/\{\{(\w+)\}\}/g) || [];
  return [...new Set(matches.map((m) => m.replace(/[{}]/g, "")))];
}

/**
 * Validate template syntax
 */
export function validateTemplate(template: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check for unclosed brackets
  const openBrackets = (template.match(/\{\{/g) || []).length;
  const closeBrackets = (template.match(/\}\}/g) || []).length;
  if (openBrackets !== closeBrackets) {
    errors.push("Mismatched template brackets: {{ and }} count differs");
  }

  // Check for empty variable names
  if (/\{\{\s*\}\}/.test(template)) {
    errors.push("Empty variable name found: {{}}");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get template by notification type
 */
export async function getTemplate(
  type: NotificationType
): Promise<EmailTemplate | null> {
  try {
    const template = await prisma.emailTemplate.findFirst({
      where: {
        type,
        isActive: true,
      },
    });

    if (!template) {
      logger.warn("No active template found for notification type", { type });
    }

    return template;
  } catch (error) {
    logger.error("Failed to fetch email template", { error, type });
    return null;
  }
}

/**
 * Get template by ID
 */
export async function getTemplateById(
  id: string
): Promise<EmailTemplate | null> {
  try {
    return await prisma.emailTemplate.findUnique({
      where: { id },
    });
  } catch (error) {
    logger.error("Failed to fetch email template by ID", { error, id });
    return null;
  }
}

/**
 * Render a template with variables
 */
export function renderTemplate(
  template: EmailTemplate,
  variables: Partial<TemplateVariables>
): RenderedEmail {
  const fullVariables: TemplateVariables = {
    appName: APP_NAME,
    appUrl: APP_URL,
    currentYear: new Date().getFullYear(),
    recipientName: "",
    recipientEmail: "",
    ...variables,
  };

  const subject = replaceVariables(template.subject, fullVariables);
  const htmlContent = replaceVariables(template.htmlBody, fullVariables);
  const html = baseTemplate(htmlContent);

  return {
    subject,
    html,
  };
}

/**
 * Build default template variables from context
 */
export function buildTemplateVariables(
  recipientName: string,
  recipientEmail: string,
  contextVariables: Record<string, string | number | boolean | null | undefined>
): TemplateVariables {
  return {
    appName: APP_NAME,
    appUrl: APP_URL,
    currentYear: new Date().getFullYear(),
    recipientName,
    recipientEmail,
    ...contextVariables,
  };
}

/**
 * Default templates for each notification type
 * Used when no custom template exists in database
 */
export const DEFAULT_TEMPLATES: Record<
  NotificationType,
  { subject: string; htmlBody: string; variables: Record<string, string> }
> = {
  LEAVE_REQUEST_SUBMITTED: {
    subject: "Leave Request Submitted - {{leaveType}}",
    htmlBody: `
      <h2 class="title">Leave Request Submitted</h2>
      <p class="subtitle">Your leave request has been submitted and is pending approval.</p>
      <div class="content">
        <div class="info-row"><span class="info-label">Leave Type</span><span class="info-value">{{leaveType}}</span></div>
        <div class="info-row"><span class="info-label">Duration</span><span class="info-value">{{startDate}} - {{endDate}} ({{days}} day(s))</span></div>
        <div class="info-row"><span class="info-label">Reason</span><span class="info-value">{{reason}}</span></div>
        <div style="margin-top: 16px;"><span class="badge badge-pending">Pending Approval</span></div>
      </div>
      <a href="{{appUrl}}/dashboard/leaves" class="button">View My Leaves</a>
    `,
    variables: {
      leaveType: "Type of leave",
      startDate: "Start date",
      endDate: "End date",
      days: "Number of days",
      reason: "Reason for leave",
    },
  },
  LEAVE_REQUEST_APPROVED: {
    subject: "Leave Request Approved - {{leaveType}}",
    htmlBody: `
      <h2 class="title">Leave Request Approved</h2>
      <p class="subtitle">Your leave request has been approved by {{approverName}}.</p>
      <div class="content">
        <div class="info-row"><span class="info-label">Leave Type</span><span class="info-value">{{leaveType}}</span></div>
        <div class="info-row"><span class="info-label">Duration</span><span class="info-value">{{startDate}} - {{endDate}} ({{days}} day(s))</span></div>
        <div style="margin-top: 16px;"><span class="badge badge-approved">Approved</span></div>
      </div>
      <a href="{{appUrl}}/dashboard/leaves" class="button">View My Leaves</a>
    `,
    variables: {
      leaveType: "Type of leave",
      startDate: "Start date",
      endDate: "End date",
      days: "Number of days",
      approverName: "Name of approver",
    },
  },
  LEAVE_REQUEST_REJECTED: {
    subject: "Leave Request Rejected - {{leaveType}}",
    htmlBody: `
      <h2 class="title">Leave Request Rejected</h2>
      <p class="subtitle">Your leave request has been rejected by {{approverName}}.</p>
      <div class="content">
        <div class="info-row"><span class="info-label">Leave Type</span><span class="info-value">{{leaveType}}</span></div>
        <div class="info-row"><span class="info-label">Duration</span><span class="info-value">{{startDate}} - {{endDate}} ({{days}} day(s))</span></div>
        <div class="info-row"><span class="info-label">Reason for Rejection</span><span class="info-value">{{rejectionReason}}</span></div>
        <div style="margin-top: 16px;"><span class="badge badge-rejected">Rejected</span></div>
      </div>
      <a href="{{appUrl}}/dashboard/leaves" class="button">View My Leaves</a>
    `,
    variables: {
      leaveType: "Type of leave",
      startDate: "Start date",
      endDate: "End date",
      days: "Number of days",
      approverName: "Name of approver",
      rejectionReason: "Reason for rejection",
    },
  },
  LEAVE_REQUEST_CANCELLED: {
    subject: "Leave Request Cancelled - {{leaveType}}",
    htmlBody: `
      <h2 class="title">Leave Request Cancelled</h2>
      <p class="subtitle">A leave request has been cancelled.</p>
      <div class="content">
        <div class="info-row"><span class="info-label">Employee</span><span class="info-value">{{employeeName}}</span></div>
        <div class="info-row"><span class="info-label">Leave Type</span><span class="info-value">{{leaveType}}</span></div>
        <div class="info-row"><span class="info-label">Duration</span><span class="info-value">{{startDate}} - {{endDate}}</span></div>
      </div>
    `,
    variables: {
      employeeName: "Employee name",
      leaveType: "Type of leave",
      startDate: "Start date",
      endDate: "End date",
    },
  },
  LEAVE_PENDING_APPROVAL: {
    subject: "New Leave Request from {{employeeName}}",
    htmlBody: `
      <h2 class="title">New Leave Request</h2>
      <p class="subtitle">{{employeeName}} has submitted a leave request requiring your approval.</p>
      <div class="content">
        <div class="info-row"><span class="info-label">Employee</span><span class="info-value">{{employeeName}}</span></div>
        <div class="info-row"><span class="info-label">Leave Type</span><span class="info-value">{{leaveType}}</span></div>
        <div class="info-row"><span class="info-label">Duration</span><span class="info-value">{{startDate}} - {{endDate}} ({{days}} day(s))</span></div>
        <div class="info-row"><span class="info-label">Reason</span><span class="info-value">{{reason}}</span></div>
      </div>
      <a href="{{appUrl}}/dashboard/leaves/requests" class="button">Review Requests</a>
    `,
    variables: {
      employeeName: "Employee name",
      leaveType: "Type of leave",
      startDate: "Start date",
      endDate: "End date",
      days: "Number of days",
      reason: "Reason for leave",
    },
  },
  REQUEST_SUBMITTED: {
    subject: "Request Submitted - {{subject}}",
    htmlBody: `
      <h2 class="title">Request Submitted</h2>
      <p class="subtitle">Your {{requestType}} request has been submitted.</p>
      <div class="content">
        <div class="info-row"><span class="info-label">Type</span><span class="info-value">{{requestType}}</span></div>
        <div class="info-row"><span class="info-label">Subject</span><span class="info-value">{{subject}}</span></div>
        <div style="margin-top: 16px;"><span class="badge badge-pending">Pending</span></div>
      </div>
      <a href="{{appUrl}}/dashboard/requests" class="button">View My Requests</a>
    `,
    variables: {
      requestType: "Type of request",
      subject: "Request subject",
    },
  },
  REQUEST_APPROVED: {
    subject: "Request Approved - {{subject}}",
    htmlBody: `
      <h2 class="title">Request Approved</h2>
      <p class="subtitle">Your {{requestType}} request has been approved.</p>
      <div class="content">
        <div class="info-row"><span class="info-label">Subject</span><span class="info-value">{{subject}}</span></div>
        <div class="info-row"><span class="info-label">Handled by</span><span class="info-value">{{approverName}}</span></div>
        <div class="info-row"><span class="info-label">Response</span><span class="info-value">{{response}}</span></div>
        <div style="margin-top: 16px;"><span class="badge badge-approved">Approved</span></div>
      </div>
      <a href="{{appUrl}}/dashboard/requests" class="button">View My Requests</a>
    `,
    variables: {
      requestType: "Type of request",
      subject: "Request subject",
      approverName: "Name of approver",
      response: "Approver response",
    },
  },
  REQUEST_REJECTED: {
    subject: "Request Rejected - {{subject}}",
    htmlBody: `
      <h2 class="title">Request Rejected</h2>
      <p class="subtitle">Your {{requestType}} request has been rejected.</p>
      <div class="content">
        <div class="info-row"><span class="info-label">Subject</span><span class="info-value">{{subject}}</span></div>
        <div class="info-row"><span class="info-label">Handled by</span><span class="info-value">{{approverName}}</span></div>
        <div class="info-row"><span class="info-label">Response</span><span class="info-value">{{response}}</span></div>
        <div style="margin-top: 16px;"><span class="badge badge-rejected">Rejected</span></div>
      </div>
      <a href="{{appUrl}}/dashboard/requests" class="button">View My Requests</a>
    `,
    variables: {
      requestType: "Type of request",
      subject: "Request subject",
      approverName: "Name of approver",
      response: "Rejection reason",
    },
  },
  ANNOUNCEMENT_PUBLISHED: {
    subject: "{{typeLabel}}: {{title}}",
    htmlBody: `
      <h2 class="title">{{typeLabel}} Announcement</h2>
      <p class="subtitle">A new announcement has been posted.</p>
      <div class="content">
        <h3 style="font-size: 16px; margin-bottom: 12px;">{{title}}</h3>
        <p style="color: #666; margin-bottom: 16px;">{{preview}}</p>
        <p style="font-size: 12px; color: #999;">Posted by {{publishedBy}}</p>
      </div>
      <a href="{{appUrl}}/dashboard/announcements" class="button">Read Full Announcement</a>
    `,
    variables: {
      typeLabel: "Announcement type label",
      title: "Announcement title",
      preview: "Content preview",
      publishedBy: "Publisher name",
    },
  },
  BIRTHDAY_REMINDER: {
    subject: "Birthday Today: {{birthdayPerson}}",
    htmlBody: `
      <h2 class="title">Birthday Reminder</h2>
      <p class="subtitle">Don't forget to wish your colleague!</p>
      <div class="content" style="text-align: center; padding: 20px 0;">
        <p style="font-size: 18px; margin-bottom: 8px;"><strong>{{birthdayPerson}}</strong></p>
        <p style="color: #666;">{{department}}</p>
        <p style="margin-top: 16px;">is celebrating their birthday today!</p>
      </div>
      <a href="{{appUrl}}/dashboard" class="button">View Dashboard</a>
    `,
    variables: {
      birthdayPerson: "Name of birthday person",
      department: "Department name",
    },
  },
  WORK_ANNIVERSARY: {
    subject: "Work Anniversary: {{employeeName}} - {{years}} Year(s)",
    htmlBody: `
      <h2 class="title">Work Anniversary</h2>
      <p class="subtitle">Congratulations on your work anniversary!</p>
      <div class="content" style="text-align: center; padding: 20px 0;">
        <p style="font-size: 18px; margin-bottom: 8px;"><strong>{{employeeName}}</strong></p>
        <p style="color: #666;">{{department}}</p>
        <p style="margin-top: 16px;">is celebrating <strong>{{years}} year(s)</strong> with us!</p>
      </div>
    `,
    variables: {
      employeeName: "Employee name",
      department: "Department name",
      years: "Number of years",
    },
  },
  ASSET_ASSIGNED: {
    subject: "Asset Assigned - {{assetName}}",
    htmlBody: `
      <h2 class="title">Asset Assigned</h2>
      <p class="subtitle">An asset has been assigned to you.</p>
      <div class="content">
        <div class="info-row"><span class="info-label">Asset</span><span class="info-value">{{assetName}}</span></div>
        <div class="info-row"><span class="info-label">Asset Tag</span><span class="info-value">{{assetTag}}</span></div>
        <div class="info-row"><span class="info-label">Category</span><span class="info-value">{{category}}</span></div>
        <div class="info-row"><span class="info-label">Assigned By</span><span class="info-value">{{assignedBy}}</span></div>
      </div>
      <a href="{{appUrl}}/dashboard/assets" class="button">View My Assets</a>
    `,
    variables: {
      assetName: "Asset name",
      assetTag: "Asset tag",
      category: "Asset category",
      assignedBy: "Assigned by",
    },
  },
  ASSET_RETURNED: {
    subject: "Asset Returned - {{assetName}}",
    htmlBody: `
      <h2 class="title">Asset Returned</h2>
      <p class="subtitle">An asset has been returned.</p>
      <div class="content">
        <div class="info-row"><span class="info-label">Asset</span><span class="info-value">{{assetName}}</span></div>
        <div class="info-row"><span class="info-label">Asset Tag</span><span class="info-value">{{assetTag}}</span></div>
        <div class="info-row"><span class="info-label">Returned By</span><span class="info-value">{{returnedBy}}</span></div>
        <div class="info-row"><span class="info-label">Condition</span><span class="info-value">{{condition}}</span></div>
      </div>
    `,
    variables: {
      assetName: "Asset name",
      assetTag: "Asset tag",
      returnedBy: "Returned by",
      condition: "Asset condition",
    },
  },
  WELCOME_EMAIL: {
    subject: "Welcome to {{appName}}!",
    htmlBody: `
      <h2 class="title">Welcome to {{appName}}!</h2>
      <p class="subtitle">Your account has been created.</p>
      <div class="content">
        <p>Hello {{employeeName}},</p>
        <p>Welcome to the team! Your account has been set up and you can now access the HR portal.</p>
        <div class="info-row"><span class="info-label">Email</span><span class="info-value">{{email}}</span></div>
        <div class="info-row"><span class="info-label">Employee ID</span><span class="info-value">{{employeeId}}</span></div>
      </div>
      <a href="{{appUrl}}/login" class="button">Login to Portal</a>
    `,
    variables: {
      employeeName: "Employee name",
      email: "Employee email",
      employeeId: "Employee ID",
    },
  },
  PASSWORD_RESET: {
    subject: "Password Reset Request - {{appName}}",
    htmlBody: `
      <h2 class="title">Password Reset Request</h2>
      <p class="subtitle">You requested to reset your password.</p>
      <div class="content">
        <p>Click the button below to reset your password. This link will expire in 1 hour.</p>
        <p style="font-size: 12px; color: #999;">If you didn't request this, please ignore this email.</p>
      </div>
      <a href="{{resetLink}}" class="button">Reset Password</a>
    `,
    variables: {
      resetLink: "Password reset link",
    },
  },
  APPRECIATION: {
    subject: "You received an appreciation from {{senderName}}!",
    htmlBody: `
      <h2 class="title">You've Been Appreciated!</h2>
      <p class="subtitle">{{senderName}} has sent you an appreciation.</p>
      <div class="content" style="text-align: center; padding: 20px 0;">
        <p style="font-size: 16px; font-style: italic;">"{{message}}"</p>
        <p style="margin-top: 16px; color: #666;">- {{senderName}}</p>
      </div>
      <a href="{{appUrl}}/dashboard" class="button">View Dashboard</a>
    `,
    variables: {
      senderName: "Sender name",
      message: "Appreciation message",
    },
  },
  CUSTOM: {
    subject: "{{subject}}",
    htmlBody: `
      <h2 class="title">{{title}}</h2>
      <div class="content">
        {{content}}
      </div>
    `,
    variables: {
      subject: "Email subject",
      title: "Email title",
      content: "Email content",
    },
  },
};

/**
 * Get default template for a notification type
 */
export function getDefaultTemplate(type: NotificationType): {
  subject: string;
  htmlBody: string;
  variables: Record<string, string>;
} {
  return DEFAULT_TEMPLATES[type] || DEFAULT_TEMPLATES.CUSTOM;
}
