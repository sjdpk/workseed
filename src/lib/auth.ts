// Authentication and authorization utilities
// Handles password hashing, JWT token management, and user session retrieval

import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies, headers } from "next/headers";
import { prisma } from "./prisma";

// JWT signing secret - should be set in environment variables
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "your-secret-key");

// Hash a plain text password using bcrypt with 12 rounds
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

// Compare a plain text password against a hashed password
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// Create a JWT token with user payload, expires in 24 hours
export async function createToken(payload: {
  userId: string;
  email: string;
  role: string;
}): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(JWT_SECRET);
}

// Verify and decode a JWT token, returns null if invalid or expired
export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as { userId: string; email: string; role: string };
  } catch {
    return null;
  }
}

// Retrieve the current authenticated user from the session cookie or Authorization header
// Returns null if no valid session exists
export async function getCurrentUser() {
  const cookieStore = await cookies();
  let token = cookieStore.get("auth-token")?.value;

  // Also check Authorization header
  if (!token) {
    const authHeader = (await headers()).get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    }
  }

  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload) return null;

  // Fetch user with related organization data
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      status: true,
      employeeId: true,
      teamId: true,
      departmentId: true,
      branch: {
        select: {
          id: true,
          name: true,
        },
      },
      team: {
        select: {
          id: true,
          name: true,
        },
      },
      department: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return user;
}

// Role hierarchy helper - checks if user is ADMIN
export function isAdmin(role: string): boolean {
  return role === "ADMIN";
}

// Role hierarchy helper - checks if user is HR or ADMIN
export function isHROrAbove(role: string): boolean {
  return ["ADMIN", "HR"].includes(role);
}

// Role hierarchy helper - checks if user is TEAM_LEAD or higher
export function isManagerOrAbove(role: string): boolean {
  return ["ADMIN", "HR", "MANAGER", "TEAM_LEAD"].includes(role);
}
