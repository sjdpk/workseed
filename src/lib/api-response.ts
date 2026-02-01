// Standardized API response utilities
// Provides consistent response patterns across all API endpoints

import { NextResponse } from "next/server";
import { z } from "zod";

// Success response structure
export interface SuccessResponse<T> {
  success: true;
  data: T;
}

// Error response structure
export interface ErrorResponse {
  success: false;
  error: string;
  details?: unknown;
}

// Union type for API responses
export type ApiResponseType<T> = SuccessResponse<T> | ErrorResponse;

// Create a success response with optional status code
export function successResponse<T>(
  data: T,
  status: number = 200
): NextResponse<SuccessResponse<T>> {
  return NextResponse.json({ success: true, data }, { status });
}

// Create an error response with message and status code
export function errorResponse(message: string, status: number): NextResponse<ErrorResponse> {
  return NextResponse.json({ success: false, error: message }, { status });
}

// Create a validation error response from ZodError
export function validationErrorResponse(zodError: z.ZodError): NextResponse<ErrorResponse> {
  // Extract first error message for user-friendly display
  const firstIssue = zodError.issues[0];
  const message = firstIssue?.message || "Validation failed";

  return NextResponse.json(
    {
      success: false,
      error: message,
      details: zodError.issues,
    },
    { status: 400 }
  );
}

// Common error responses for reuse
export const unauthorizedResponse = (): NextResponse<ErrorResponse> => {
  return errorResponse("Unauthorized", 401);
};

export const forbiddenResponse = (): NextResponse<ErrorResponse> => {
  return errorResponse("Forbidden", 403);
};

export const notFoundResponse = (entity: string = "Resource"): NextResponse<ErrorResponse> => {
  return errorResponse(`${entity} not found`, 404);
};

export const internalErrorResponse = (
  message: string = "Internal server error"
): NextResponse<ErrorResponse> => {
  return errorResponse(message, 500);
};
