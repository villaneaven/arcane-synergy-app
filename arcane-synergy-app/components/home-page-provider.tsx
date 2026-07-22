"use client";

import * as React from "react";

export const HOME_PAGE_TYPES = ["analytics", "search"] as const;

export type HomePageType = (typeof HOME_PAGE_TYPES)[number];

export const HOME_PAGE_TYPE_LABELS: Record<HomePageType, string> = {
  analytics: "Analytics",
  search: "Search",
};

const HOME_PAGE_TYPE_STORAGE_KEY = "home-page-type";
const DEFAULT_HOME_PAGE_TYPE: HomePageType = "analytics";

function isHomePageType(value: string | null): value is HomePageType {
  return HOME_PAGE_TYPES.includes(value as HomePageType);
}

type Listener = () => void;
const listeners = new Set<Listener>();

function getSnapshot(): HomePageType {
  const stored = window.localStorage.getItem(HOME_PAGE_TYPE_STORAGE_KEY);
  return isHomePageType(stored) ? stored : DEFAULT_HOME_PAGE_TYPE;
}

function getServerSnapshot(): HomePageType {
  return DEFAULT_HOME_PAGE_TYPE;
}

function subscribe(callback: Listener) {
  listeners.add(callback);
  window.addEventListener("storage", callback);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

function writeHomePageType(type: HomePageType) {
  window.localStorage.setItem(HOME_PAGE_TYPE_STORAGE_KEY, type);
  listeners.forEach((listener) => listener());
}

type HomePageTypeContextValue = {
  homePageType: HomePageType;
  setHomePageType: (type: HomePageType) => void;
};

const HomePageTypeContext =
  React.createContext<HomePageTypeContextValue | null>(null);

export function useHomePageType() {
  const context = React.useContext(HomePageTypeContext);
  if (!context) {
    throw new Error(
      "useHomePageType must be used within a HomePageTypeProvider.",
    );
  }

  return context;
}

export function HomePageTypeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const homePageType = React.useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const setHomePageType = React.useCallback((type: HomePageType) => {
    writeHomePageType(type);
  }, []);

  const contextValue = React.useMemo(
    () => ({ homePageType, setHomePageType }),
    [homePageType, setHomePageType],
  );

  return (
    <HomePageTypeContext.Provider value={contextValue}>
      {children}
    </HomePageTypeContext.Provider>
  );
}
