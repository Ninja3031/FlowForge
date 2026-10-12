import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { store } from "@/store";
import { sessionCleared, sessionStarted } from "@/store/authSlice";
import type { SessionResponse } from "./types";

// Requests go to /api on this same site. next.config.ts forwards them to the real API.
const baseURL = "/api";

export const api = axios.create({ baseURL });

// Attach the access token to every request
api.interceptors.request.use((config) => {
  const token = store.getState().auth.accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// If many requests fail at once, they all wait for the same single refresh call
let refreshPromise: Promise<string | null> | null = null;

export function refreshSession(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = axios
      .post<SessionResponse>(`${baseURL}/auth/refresh`)
      .then((res) => {
        store.dispatch(sessionStarted(res.data));
        return res.data.accessToken;
      })
      .catch(() => {
        store.dispatch(sessionCleared());
        return null;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

// When the access token expires (401), get a new one and retry the request once
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    const isAuthCall = original?.url?.startsWith("/auth/");

    if (error.response?.status === 401 && original && !original._retry && !isAuthCall) {
      original._retry = true;
      const token = await refreshSession();
      if (token) {
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      }
    }
    return Promise.reject(error);
  },
);