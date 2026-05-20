"use client";

import * as React from "react";

type SidebarContextValue = {
  collapsed: boolean;
  toggle: () => void;
};

const SidebarContext = React.createContext<SidebarContextValue>({
  collapsed: false,
  toggle: () => {},
});

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = React.useState(false);

  React.useEffect(() => {
    const mql = window.matchMedia("(max-width: 767px)");
    setCollapsed(mql.matches);
    const handler = (e: MediaQueryListEvent) => setCollapsed(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  const toggle = React.useCallback(() => setCollapsed((c) => !c), []);

  return (
    <SidebarContext.Provider value={{ collapsed, toggle }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  return React.useContext(SidebarContext);
}
