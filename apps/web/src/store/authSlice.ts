import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { SessionResponse, User } from "@/lib/types";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  // "loading" = we are checking the refresh cookie on first page load
  status: "loading" | "authenticated" | "guest";
}

const initialState: AuthState = { user: null, accessToken: null, status: "loading" };

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    sessionStarted(state, action: PayloadAction<SessionResponse>) {
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.status = "authenticated";
    },
    sessionCleared(state) {
      state.user = null;
      state.accessToken = null;
      state.status = "guest";
    },
  },
});

export const { sessionStarted, sessionCleared } = authSlice.actions;
export default authSlice.reducer;