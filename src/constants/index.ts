// Application constants

export const APP_NAME = "Workseed";

export const ROUTES = {
  HOME: "/",
  ABOUT: "/about",
} as const;

// API base is same-origin — a relative path needs no host or env var.
export const API_ENDPOINTS = {
  BASE_URL: "/api",
} as const;
