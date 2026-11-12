import { configureStore } from '@reduxjs/toolkit';
import { api } from '@/features/api/api';
import { toastReducer } from '@/features/ui/toastSlice';

// A new store per request/tab: user data must never leak between visitors on the server.
export const makeStore = () =>
  configureStore({
    reducer: { [api.reducerPath]: api.reducer, toasts: toastReducer },
    middleware: (gdm) => gdm().concat(api.middleware),
  });

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];
