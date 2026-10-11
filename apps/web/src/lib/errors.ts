import { isAxiosError } from "axios";

// Turns any API error into a sentence we can show the user
export function getErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const data = error.response?.data as { error?: string; details?: Record<string, string[]> };
    if (data?.details) {
      const first = Object.entries(data.details)[0];
      if (first) return `${first[0]}: ${first[1][0]}`;
    }
    if (data?.error) return data.error;
    if (!error.response) return "Can't reach the server. Is the API running?";
  }
  return "Something went wrong. Please try again.";
}