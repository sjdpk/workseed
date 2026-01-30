// Common types used across the application

export interface ApiResponse<T> {
  data?: T;
  success: boolean;
  message?: string;
  error?: string;
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
  branchId?: string;
  branch?: Branch;
}

export type Role = "ADMIN" | "HR" | "MANAGER" | "TEAM_LEAD" | "EMPLOYEE";
export type UserStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";

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

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface CreateUserInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: Role;
  branchId?: string;
}

export interface SessionUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  status: UserStatus;
  employeeId: string;
  branch?: {
    id: string;
    name: string;
  } | null;
}
