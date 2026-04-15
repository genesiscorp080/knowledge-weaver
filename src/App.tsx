import { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { DocumentProvider } from "@/contexts/DocumentContext";
import { GenerationProvider } from "@/contexts/GenerationContext";
import BottomNav from "@/components/BottomNav";
import VipBadge from "@/components/VipBadge";
import FloatingProgress from "@/components/FloatingProgress";
import SplashScreen from "@/components/SplashScreen";
import AuthPage from "./pages/AuthPage";
import HomePage from "./pages/HomePage";
import LibraryPage from "./pages/LibraryPage";
import LearningPage from "./pages/LearningPage";
import ImportsPage from "./pages/OthersPage";
import EvaluationsPage from "./pages/EvaluationsPage";
import SettingsPage from "./pages/SettingsPage";
import ProfilePage from "./pages/ProfilePage";
import DocumentViewerPage from "./pages/DocumentViewerPage";
import HelpFaqPage from "./pages/HelpFaqPage";
import VipPage from "./pages/VipPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoutes = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="mobile-container flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full" />
      </div>
    );
  }

  if (!user) return <AuthPage />;

  return (
    <DocumentProvider>
      <GenerationProvider>
        <VipBadge />
        <FloatingProgress />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/learning" element={<LearningPage />} />
          <Route path="/imports" element={<ImportsPage />} />
          <Route path="/evaluations" element={<EvaluationsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/document/:id" element={<DocumentViewerPage />} />
          <Route path="/help" element={<HelpFaqPage />} />
          <Route path="/vip" element={<VipPage />} />
          <Route path="/others" element={<Navigate to="/imports" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        <BottomNav />
      </GenerationProvider>
    </DocumentProvider>
  );
};

const App = () => {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <LanguageProvider>
          <NotificationProvider>
            <AuthProvider>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                <SplashScreen show={showSplash} />
                {!showSplash && (
                  <BrowserRouter>
                    <div className="max-w-md mx-auto relative bg-background min-h-screen">
                      <ProtectedRoutes />
                    </div>
                  </BrowserRouter>
                )}
              </TooltipProvider>
            </AuthProvider>
          </NotificationProvider>
        </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
