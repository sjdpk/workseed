// Common types used across the application

// Generic API response wrapper
export interface ApiResponse<T> {
  data?: T;
  success: boolean;
  message?: string;
  error?: string;
}

// Successful API response type
export interface SuccessApiResponse<T> {
  success: true;
  data: T;
}

// Error API response type
export interface ErrorApiResponse {
  success: false;
  error: string;
  details?: unknown;
}

// Pagination metadata
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Paginated response wrapper
export interface PaginatedResponse<T> {
  success: true;
  data: {
    items: T[];
    pagination: PaginationMeta;
  };
}

// Organization-level permission settings
export interface OrganizationPermissions {
  showOwnAssetsToEmployee?: boolean;
  employeesCanViewTeamLeaves?: boolean;
  employeesCanViewDepartmentLeaves?: boolean;
  teamLeadCanApproveLeaves?: boolean;
  managerCanApproveLeaves?: boolean;
  hrCanApproveLeaves?: boolean;
  roleAccess?: Record<string, string[]>;
  theme?: {
    accentColor?: "gray" | "blue" | "green" | "purple" | "orange" | "red";
    darkMode?: "system" | "light" | "dark";
  };
}

// Leave policy settings
export interface LeavePolicy {
  maxConsecutiveDays?: number;
  minDaysNotice?: number;
  allowHalfDay?: boolean;
  allowBackdatedRequests?: boolean;
  backdatedDaysLimit?: number;
}

// Typed settings interface for organization
export interface OrganizationSettings {
  id: string;
  name: string;
  logoUrl?: string | null;
  fiscalYearStart: number;
  workingDaysPerWeek: number;
  permissions?: OrganizationPermissions;
  defaultLeaveAllocation?: Record<string, unknown>;
  leavePolicy?: LeavePolicy;
  createdAt: Date;
  updatedAt: Date;
}

export type Role = "ADMIN" | "HR" | "MANAGER" | "TEAM_LEAD" | "EMPLOYEE";
export type UserStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";
export type Gender = "MALE" | "FEMALE" | "OTHER";
export type MaritalStatus = "SINGLE" | "MARRIED" | "DIVORCED" | "WIDOWED";
export type EmploymentType = "FULL_TIME" | "PART_TIME" | "CONTRACT" | "INTERN";
export type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
export type DocumentType =
  | "ID_PROOF"
  | "ADDRESS_PROOF"
  | "EDUCATION"
  | "EXPERIENCE"
  | "CONTRACT"
  | "OTHER";

export interface Branch {
  id: string;
  name: string;
  code: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  phone?: string;
  email?: string;
  isActive: boolean;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  description?: string;
  branchId?: string;
  branch?: Branch;
  headId?: string;
  isActive: boolean;
}

export interface Team {
  id: string;
  name: string;
  code: string;
  description?: string;
  departmentId: string;
  department?: Department;
  leadId?: string;
  isActive: boolean;
}

export interface User {
  id: string;
  employeeId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: Role;
  status: UserStatus;
  dateOfBirth?: string;
  gender?: Gender;
  maritalStatus?: MaritalStatus;
  nationality?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  emergencyContact?: string;
  emergencyContactPhone?: string;
  employmentType: EmploymentType;
  joiningDate?: string;
  designation?: string;
  branchId?: string;
  branch?: Branch;
  departmentId?: string;
  department?: Department;
  teamId?: string;
  team?: Team;
  managerId?: string;
  manager?: { id: string; firstName: string; lastName: string };
}

export interface LeaveType {
  id: string;
  name: string;
  code: string;
  description?: string;
  defaultDays: number;
  maxDays?: number;
  carryForward: boolean;
  maxCarryForward?: number;
  isPaid: boolean;
  isActive: boolean;
  requiresApproval: boolean;
  minDaysNotice: number;
  color?: string;
}

export interface LeaveAllocation {
  id: string;
  userId: string;
  leaveTypeId: string;
  leaveType?: LeaveType;
  year: number;
  allocated: number;
  used: number;
  carriedOver: number;
  adjusted: number;
  balance?: number;
  notes?: string;
}

export interface LeaveRequest {
  id: string;
  userId: string;
  user?: User;
  leaveTypeId: string;
  leaveType?: LeaveType;
  startDate: string;
  endDate: string;
  days: number;
  isHalfDay: boolean;
  halfDayType?: string;
  reason?: string;
  status: LeaveStatus;
  approverId?: string;
  approver?: User;
  approvedAt?: string;
  rejectionReason?: string;
  createdAt: string;
}

export interface SessionUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  status: UserStatus;
  employeeId: string;
  teamId?: string | null;
  departmentId?: string | null;
  branch?: {
    id: string;
    name: string;
  } | null;
  team?: {
    id: string;
    name: string;
  } | null;
  department?: {
    id: string;
    name: string;
  } | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}
