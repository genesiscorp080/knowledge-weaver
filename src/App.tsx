import { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { DocumentProvider } from "@/contexts/DocumentContext";
import BottomNav from "@/components/BottomNav";
import SplashScreen from "@/components/SplashScreen";
import HomePage from "./pages/HomePage";
import LibraryPage from "./pages/LibraryPage";
import LearningPage from "./pages/LearningPage";
import EvaluationsPage from "./pages/EvaluationsPage";
import SettingsPage from "./pages/SettingsPage";
import DocumentViewerPage from "./pages/DocumentViewerPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

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
            <DocumentProvider>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                <SplashScreen show={showSplash} />
                <BrowserRouter>
                  <div className="max-w-md mx-auto relative bg-background min-h-screen">
                    <Routes>
                      <Route path="/" element={<HomePage />} />
                      <Route path="/library" element={<LibraryPage />} />
                      <Route path="/learning" element={<LearningPage />} />
                      <Route path="/evaluations" element={<EvaluationsPage />} />
                      <Route path="/settings" element={<SettingsPage />} />
                      <Route path="/document/:id" element={<DocumentViewerPage />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                    <BottomNav />
                  </div>
                </BrowserRouter>
              </TooltipProvider>
            </DocumentProvider>
          </NotificationProvider>
        </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
