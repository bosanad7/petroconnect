"use client";

import { create } from "zustand";

interface AppState {
  locale: "en" | "ar";
  setLocale: (l: "en" | "ar") => void;

  unreadCount: number;
  setUnreadCount: (n: number) => void;
}

export const useAppStore = create<AppState>((set) => ({
  locale: "en",
  setLocale: (locale) => set({ locale }),
  unreadCount: 0,
  setUnreadCount: (unreadCount) => set({ unreadCount }),
}));
