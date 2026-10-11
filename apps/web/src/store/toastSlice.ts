import { createSlice, nanoid, type PayloadAction } from "@reduxjs/toolkit";

export interface Toast {
  id: string;
  message: string;
  type: "success" | "error";
}

const toastSlice = createSlice({
  name: "toasts",
  initialState: [] as Toast[],
  reducers: {
    toastAdded: {
      reducer(state, action: PayloadAction<Toast>) {
        state.push(action.payload);
      },
      prepare(message: string, type: Toast["type"] = "success") {
        return { payload: { id: nanoid(), message, type } };
      },
    },
    toastRemoved(state, action: PayloadAction<string>) {
      return state.filter((toast) => toast.id !== action.payload);
    },
  },
});

export const { toastAdded, toastRemoved } = toastSlice.actions;
export default toastSlice.reducer;