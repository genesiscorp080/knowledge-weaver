import { useLocation, useNavigate } from "react-router-dom";
import { Home, Library, GraduationCap, FolderUp, ClipboardCheck, Settings } from "lucide-react";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const tabs = [
    { path: "/", icon: Home, labelKey: "nav.home" },
    { path: "/library", icon: Library, labelKey: "nav.library" },
    { path: "/learning", icon: GraduationCap, labelKey: "nav.learning" },
    { path: "/others", icon: FolderUp, labelKey: "nav.others" },
    { path: "/evaluations", icon: ClipboardCheck, labelKey: "nav.evaluations" },
    { path: "/settings", icon: Settings, labelKey: "nav.settings" },
  ];

  if (location.pathname.startsWith("/document/") || location.pathname === "/profile") return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50">
      <div className="max-w-md mx-auto bg-card/90 backdrop-blur-2xl border-t border-border/50">
        <div className="flex items-center justify-around px-1 pb-5 pt-2">
          {tabs.map((tab) => {
            const isActive = location.pathname === tab.path;
            const Icon = tab.icon;
            return (
              <button key={tab.path} onClick={() => navigate(tab.path)}
                className="relative flex flex-col items-center gap-0.5 py-1 px-2 transition-colors duration-200">
                <div className="relative">
                  {isActive && (
                    <motion.div layoutId="nav-indicator" className="absolute -inset-1.5 rounded-xl bg-primary/10"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }} />
                  )}
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8}
                    className={`relative z-10 transition-colors duration-200 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                </div>
                <span className={`text-[9px] font-semibold transition-colors duration-200 ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                  {t(tab.labelKey)}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default BottomNav;
