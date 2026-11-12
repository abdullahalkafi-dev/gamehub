import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface Toast {
  id: number;
  kind: 'success' | 'error' | 'info';
  text: string;
}
let nextId = 1;

const slice = createSlice({
  name: 'toasts',
  initialState: [] as Toast[],
  reducers: {
    pushToast: {
      reducer: (s, a: PayloadAction<Toast>) => void s.push(a.payload),
      prepare: (kind: Toast['kind'], text: string) => ({ payload: { id: nextId++, kind, text } }),
    },
    dismissToast: (s, a: PayloadAction<number>) => s.filter((t) => t.id !== a.payload),
  },
});

export const { pushToast, dismissToast } = slice.actions;
export const toastReducer = slice.reducer;
