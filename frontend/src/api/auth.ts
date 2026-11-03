import { apiRequest } from "./client";
import type { AuthResponse, UserProfile } from "./types";

export function registerUser(payload: {
  full_name: string;
  email: string;
  password: string;
}) {
  return apiRequest<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function loginUser(payload: { email: string; password: string }) {
  return apiRequest<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function fetchCurrentUser(token: string) {
  return apiRequest<UserProfile>("/auth/me", {
    token,
  });
}

