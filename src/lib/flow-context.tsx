import React, { createContext, useContext, useEffect, useState } from "react";

export type FlowType = "eco" | "con" | "ALL";

interface FlowContextType {
  activeFlow: FlowType;
  setActiveFlow: (flow: FlowType) => void;
}

const FlowContext = createContext<FlowContextType | undefined>(undefined);

export function FlowProvider({ children }: { children: React.ReactNode }) {
  const [activeFlow, setActiveFlow] = useState<FlowType>("ALL");
  const [mounted, setMounted] = useState(false);

  // Initial load from localStorage
  useEffect(() => {
    const savedFlow = localStorage.getItem("arautos_flow") as FlowType | null;
    if (savedFlow && ["eco", "con", "ALL"].includes(savedFlow)) {
      setActiveFlow(savedFlow);
    }
    setMounted(true);
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    if (mounted) {
      localStorage.setItem("arautos_flow", activeFlow);
    }
  }, [activeFlow, mounted]);

  // Don't render until mounted to avoid hydration mismatches
  if (!mounted) return null;

  return (
    <FlowContext.Provider value={{ activeFlow, setActiveFlow }}>
      {children}
    </FlowContext.Provider>
  );
}

export function useFlow() {
  const context = useContext(FlowContext);
  if (context === undefined) {
    throw new Error("useFlow must be used within a FlowProvider");
  }
  return context;
}
