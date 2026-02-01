// Database
export { prisma } from "./prisma";

// Authentication
export {
  hashPassword,
  verifyPassword,
  createToken,
  verifyToken,
  getCurrentUser,
  isAdmin,
  isHROrAbove,
  isManagerOrAbove,
} from "./auth";

// Permissions
export {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  isRoleHigherOrEqual,
  isRoleHigher,
  getNavigationPermissions,
  PERMISSIONS,
  ROLE_HIERARCHY,
} from "./permissions";
export type { Permission, Role } from "./permissions";

// Audit Logging
export { createAuditLog, getRequestMeta } from "./audit";
export type { AuditAction, AuditEntity } from "./audit";

// Email
export {
  sendEmail,
  sendLeaveRequestSubmitted,
  sendLeaveRequestStatusUpdate,
  sendNewLeaveRequestForApproval,
  sendBirthdayReminder,
  sendAnnouncementAlert,
  sendRequestSubmitted,
  sendRequestStatusUpdate,
} from "./email";

// Logger
export { logger } from "./logger";
export type { LogLevel, LogContext } from "./logger";

// Validation
export { z } from "./validation";
export {
  uuidSchema,
  emailSchema,
  paginationSchema,
  dateStringSchema,
  optionalDateStringSchema,
  nonEmptyStringSchema,
  phoneSchema,
  optionalUrlSchema,
  searchQuerySchema,
  listQuerySchema,
  idParamSchema,
} from "./validation";

// API Response Helpers
export {
  successResponse,
  errorResponse,
  validationErrorResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
  internalErrorResponse,
} from "./api-response";
export type { SuccessResponse, ErrorResponse, ApiResponseType } from "./api-response";
