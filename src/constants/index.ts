// Application constants

export const APP_NAME = "TheSystem";

export const ROUTES = {
  HOME: "/",
  ABOUT: "/about",
} as const;

export const API_ENDPOINTS = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api",
} as const;
