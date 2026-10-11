import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./authSlice";
import toastReducer from "./toastSlice";

// Redux holds only state that many screens share: who is logged in, and toast messages.
// Page data (projects, tasks) stays in local component state.
export const store = configureStore({
  reducer: {
    auth: authReducer,
    toasts: toastReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;