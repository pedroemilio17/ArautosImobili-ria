import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import { FlowProvider } from "@/lib/flow-context";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { AppShell } from "@/components/layout/AppShell";
import OverviewPage from "./pages/Overview";
import LeadsPage from "./pages/Leads";
import PipelinePage from "./pages/Pipeline";
import FollowupsPage from "./pages/Followups";
import AgendaPage from "./pages/Agenda";
import LoginPage from "./pages/Login";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <FlowProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route
                element={
                  <ProtectedRoute>
                    <AppShell />
                  </ProtectedRoute>
                }
              >
                <Route path="/" element={<OverviewPage />} />
                <Route path="/leads" element={<LeadsPage />} />
                <Route path="/pipeline" element={<PipelinePage />} />
                <Route path="/followups" element={<FollowupsPage />} />
                <Route path="/agenda" element={<AgendaPage />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </FlowProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
