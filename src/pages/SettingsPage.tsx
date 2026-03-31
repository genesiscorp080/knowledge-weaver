import { motion } from "framer-motion";
import { User, Moon, Sun, Globe, Bell, BellOff, HelpCircle, LogOut, ChevronRight } from "lucide-react";
import StatusBar from "@/components/StatusBar";
import { useThemeContext } from "@/contexts/ThemeContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { Switch } from "@/components/ui/switch";

const SettingsPage = () => {
  const { theme, toggleTheme } = useThemeContext();
  const { language, setLanguage, t } = useLanguage();
  const { notificationsEnabled, setNotificationsEnabled } = useNotifications();

  const settingsGroups = [
    {
      title: t("settings.general"),
      items: [
        {
          icon: User,
          label: t("settings.profile"),
          desc: t("settings.profileDesc"),
          action: undefined,
        },
        {
          icon: Globe,
          label: t("settings.language"),
          desc: language === "fr" ? t("settings.languageFr") : t("settings.languageEn"),
          action: () => setLanguage(language === "fr" ? "en" : "fr"),
        },
        {
          icon: theme === "dark" ? Sun : Moon,
          label: t("settings.appearance"),
          desc: theme === "dark" ? t("settings.dark") : t("settings.light"),
          action: toggleTheme,
        },
      ],
    },
    {
      title: t("settings.notifications"),
      items: [
        {
          icon: notificationsEnabled ? Bell : BellOff,
          label: t("settings.notificationsLabel"),
          desc: notificationsEnabled ? t("settings.enabled") : t("settings.disabled"),
          action: () => setNotificationsEnabled(!notificationsEnabled),
          hasSwitch: true,
          switchValue: notificationsEnabled,
        },
      ],
    },
    {
      title: t("settings.help"),
      items: [
        { icon: HelpCircle, label: t("settings.helpFaq"), desc: "", action: undefined },
        { icon: LogOut, label: t("settings.logout"), desc: "", destructive: true, action: undefined },
      ],
    },
  ];

  return (
    <div className="mobile-container">
      <StatusBar title={t("settings.title")} />
      <div className="page-content space-y-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="pt-2 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <User size={24} className="text-primary" />
          </div>
          <div>
            <h2 className="font-display text-lg font-bold">{t("settings.user")}</h2>
            <p className="text-sm text-muted-foreground">{t("settings.defaultLevel")} : Licence</p>
          </div>
        </motion.div>

        {settingsGroups.map((group, gi) => (
          <motion.div key={group.title} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: gi * 0.05 }}>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{group.title}</h3>
            <div className="glass-card overflow-hidden divide-y divide-border/50">
              {group.items.map((item: any) => {
                const Icon = item.icon;
                const isDestructive = item.destructive;
                return (
                  <button key={item.label} onClick={item.action}
                    className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-secondary/30 transition-colors">
                    <Icon size={18} className={isDestructive ? "text-destructive" : "text-muted-foreground"} />
                    <div className="flex-1 text-left">
                      <p className={`text-sm font-medium ${isDestructive ? "text-destructive" : ""}`}>{item.label}</p>
                      {item.desc && <p className="text-[11px] text-muted-foreground">{item.desc}</p>}
                    </div>
                    {item.hasSwitch ? (
                      <Switch checked={item.switchValue} onCheckedChange={item.action} />
                    ) : (
                      <ChevronRight size={14} className="text-muted-foreground/50" />
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        ))}

        <p className="text-center text-[10px] text-muted-foreground py-4">{t("settings.version")}</p>
      </div>
    </div>
  );
};

export default SettingsPage;
