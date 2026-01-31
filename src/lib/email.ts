import nodemailer from "nodemailer";

// Email configuration from environment variables
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

const FROM_EMAIL = process.env.SMTP_FROM || "noreply@hrm.local";
const APP_NAME = process.env.APP_NAME || "HRM System";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    // Skip if SMTP is not configured
    if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
      console.log("Email not sent - SMTP not configured:", options.subject);
      return false;
    }

    await transporter.sendMail({
      from: `"${APP_NAME}" <${FROM_EMAIL}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });

    console.log("Email sent successfully to:", options.to);
    return true;
  } catch (error) {
    console.error("Email sending failed:", error);
    return false;
  }
}

// Email Templates
function baseTemplate(content: string): string {
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
  `;
}

// Leave Request Submitted
export async function sendLeaveRequestSubmitted(
  to: string,
  data: {
    employeeName: string;
    leaveType: string;
    startDate: string;
    endDate: string;
    days: number;
    reason?: string;
  }
): Promise<boolean> {
  const content = `
    <h2 class="title">Leave Request Submitted</h2>
    <p class="subtitle">Your leave request has been submitted and is pending approval.</p>

    <div class="content">
      <div class="info-row">
        <span class="info-label">Leave Type</span>
        <span class="info-value">${data.leaveType}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Duration</span>
        <span class="info-value">${data.startDate} - ${data.endDate} (${data.days} day${data.days > 1 ? "s" : ""})</span>
      </div>
      ${data.reason ? `
      <div class="info-row">
        <span class="info-label">Reason</span>
        <span class="info-value">${data.reason}</span>
      </div>
      ` : ""}
      <div style="margin-top: 16px;">
        <span class="badge badge-pending">Pending Approval</span>
      </div>
    </div>

    <a href="${APP_URL}/dashboard/leaves" class="button">View My Leaves</a>
  `;

  return sendEmail({
    to,
    subject: `Leave Request Submitted - ${data.leaveType}`,
    html: baseTemplate(content),
  });
}

// Leave Request Status Update
export async function sendLeaveRequestStatusUpdate(
  to: string,
  data: {
    employeeName: string;
    leaveType: string;
    startDate: string;
    endDate: string;
    days: number;
    status: "APPROVED" | "REJECTED";
    approverName: string;
    rejectionReason?: string;
  }
): Promise<boolean> {
  const statusClass = data.status === "APPROVED" ? "badge-approved" : "badge-rejected";
  const statusText = data.status === "APPROVED" ? "Approved" : "Rejected";

  const content = `
    <h2 class="title">Leave Request ${statusText}</h2>
    <p class="subtitle">Your leave request has been ${statusText.toLowerCase()} by ${data.approverName}.</p>

    <div class="content">
      <div class="info-row">
        <span class="info-label">Leave Type</span>
        <span class="info-value">${data.leaveType}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Duration</span>
        <span class="info-value">${data.startDate} - ${data.endDate} (${data.days} day${data.days > 1 ? "s" : ""})</span>
      </div>
      ${data.status === "REJECTED" && data.rejectionReason ? `
      <div class="info-row">
        <span class="info-label">Reason for Rejection</span>
        <span class="info-value">${data.rejectionReason}</span>
      </div>
      ` : ""}
      <div style="margin-top: 16px;">
        <span class="badge ${statusClass}">${statusText}</span>
      </div>
    </div>

    <a href="${APP_URL}/dashboard/leaves" class="button">View My Leaves</a>
  `;

  return sendEmail({
    to,
    subject: `Leave Request ${statusText} - ${data.leaveType}`,
    html: baseTemplate(content),
  });
}

// New Leave Request for Approver
export async function sendNewLeaveRequestForApproval(
  to: string,
  data: {
    employeeName: string;
    leaveType: string;
    startDate: string;
    endDate: string;
    days: number;
    reason?: string;
  }
): Promise<boolean> {
  const content = `
    <h2 class="title">New Leave Request</h2>
    <p class="subtitle">${data.employeeName} has submitted a leave request requiring your approval.</p>

    <div class="content">
      <div class="info-row">
        <span class="info-label">Employee</span>
        <span class="info-value">${data.employeeName}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Leave Type</span>
        <span class="info-value">${data.leaveType}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Duration</span>
        <span class="info-value">${data.startDate} - ${data.endDate} (${data.days} day${data.days > 1 ? "s" : ""})</span>
      </div>
      ${data.reason ? `
      <div class="info-row">
        <span class="info-label">Reason</span>
        <span class="info-value">${data.reason}</span>
      </div>
      ` : ""}
    </div>

    <a href="${APP_URL}/dashboard/leaves/requests" class="button">Review Requests</a>
  `;

  return sendEmail({
    to,
    subject: `New Leave Request from ${data.employeeName}`,
    html: baseTemplate(content),
  });
}

// Birthday Reminder
export async function sendBirthdayReminder(
  to: string,
  data: {
    recipientName: string;
    birthdayPerson: string;
    department: string;
  }
): Promise<boolean> {
  const content = `
    <h2 class="title">Birthday Reminder 🎂</h2>
    <p class="subtitle">Don't forget to wish your colleague!</p>

    <div class="content" style="text-align: center; padding: 20px 0;">
      <p style="font-size: 18px; margin-bottom: 8px;"><strong>${data.birthdayPerson}</strong></p>
      <p style="color: #666;">${data.department}</p>
      <p style="margin-top: 16px;">is celebrating their birthday today!</p>
    </div>

    <a href="${APP_URL}/dashboard" class="button">View Dashboard</a>
  `;

  return sendEmail({
    to,
    subject: `🎂 Birthday Today: ${data.birthdayPerson}`,
    html: baseTemplate(content),
  });
}

// New Announcement Alert
export async function sendAnnouncementAlert(
  to: string,
  data: {
    recipientName: string;
    title: string;
    content: string;
    type: "GENERAL" | "IMPORTANT" | "URGENT";
    publishedBy: string;
  }
): Promise<boolean> {
  const typeLabel = data.type === "URGENT" ? "🚨 Urgent" : data.type === "IMPORTANT" ? "⚠️ Important" : "📢 General";
  const preview = data.content.length > 200 ? data.content.substring(0, 200) + "..." : data.content;

  const emailContent = `
    <h2 class="title">${typeLabel} Announcement</h2>
    <p class="subtitle">A new announcement has been posted.</p>

    <div class="content">
      <h3 style="font-size: 16px; margin-bottom: 12px;">${data.title}</h3>
      <p style="color: #666; margin-bottom: 16px;">${preview}</p>
      <p style="font-size: 12px; color: #999;">Posted by ${data.publishedBy}</p>
    </div>

    <a href="${APP_URL}/dashboard/announcements" class="button">Read Full Announcement</a>
  `;

  return sendEmail({
    to,
    subject: `${typeLabel}: ${data.title}`,
    html: baseTemplate(emailContent),
  });
}

// Self-Service Request Submitted
export async function sendRequestSubmitted(
  to: string,
  data: {
    employeeName: string;
    requestType: string;
    subject: string;
    description: string;
  }
): Promise<boolean> {
  const content = `
    <h2 class="title">Request Submitted</h2>
    <p class="subtitle">Your ${data.requestType.toLowerCase()} request has been submitted.</p>

    <div class="content">
      <div class="info-row">
        <span class="info-label">Type</span>
        <span class="info-value">${data.requestType}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Subject</span>
        <span class="info-value">${data.subject}</span>
      </div>
      <div style="margin-top: 16px;">
        <span class="badge badge-pending">Pending</span>
      </div>
    </div>

    <a href="${APP_URL}/dashboard/requests" class="button">View My Requests</a>
  `;

  return sendEmail({
    to,
    subject: `Request Submitted - ${data.subject}`,
    html: baseTemplate(content),
  });
}

// Self-Service Request Status Update
export async function sendRequestStatusUpdate(
  to: string,
  data: {
    employeeName: string;
    requestType: string;
    subject: string;
    status: "APPROVED" | "REJECTED";
    response?: string;
    approverName: string;
  }
): Promise<boolean> {
  const statusClass = data.status === "APPROVED" ? "badge-approved" : "badge-rejected";
  const statusText = data.status === "APPROVED" ? "Approved" : "Rejected";

  const content = `
    <h2 class="title">Request ${statusText}</h2>
    <p class="subtitle">Your ${data.requestType.toLowerCase()} request has been ${statusText.toLowerCase()}.</p>

    <div class="content">
      <div class="info-row">
        <span class="info-label">Subject</span>
        <span class="info-value">${data.subject}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Handled by</span>
        <span class="info-value">${data.approverName}</span>
      </div>
      ${data.response ? `
      <div class="info-row">
        <span class="info-label">Response</span>
        <span class="info-value">${data.response}</span>
      </div>
      ` : ""}
      <div style="margin-top: 16px;">
        <span class="badge ${statusClass}">${statusText}</span>
      </div>
    </div>

    <a href="${APP_URL}/dashboard/requests" class="button">View My Requests</a>
  `;

  return sendEmail({
    to,
    subject: `Request ${statusText} - ${data.subject}`,
    html: baseTemplate(content),
  });
}
