import { motion } from "framer-motion";
import { User, Moon, Globe, Bell, HelpCircle, LogOut, ChevronRight } from "lucide-react";
import StatusBar from "@/components/StatusBar";

const settingsGroups = [
  {
    title: "Général",
    items: [
      { icon: User, label: "Profil", desc: "Nom, niveau par défaut" },
      { icon: Globe, label: "Langue", desc: "Français" },
      { icon: Moon, label: "Apparence", desc: "Clair" },
    ],
  },
  {
    title: "Notifications",
    items: [
      { icon: Bell, label: "Notifications", desc: "Activées" },
    ],
  },
  {
    title: "Aide",
    items: [
      { icon: HelpCircle, label: "Aide & FAQ", desc: "" },
      { icon: LogOut, label: "Déconnexion", desc: "", destructive: true },
    ],
  },
];

const SettingsPage = () => {
  return (
    <div className="mobile-container">
      <StatusBar title="Réglages" />
      <div className="page-content space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="pt-2 flex items-center gap-4"
        >
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <User size={24} className="text-primary" />
          </div>
          <div>
            <h2 className="font-display text-lg font-bold">Utilisateur</h2>
            <p className="text-sm text-muted-foreground">Niveau par défaut : Licence</p>
          </div>
        </motion.div>

        {settingsGroups.map((group, gi) => (
          <motion.div
            key={group.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: gi * 0.05 }}
          >
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              {group.title}
            </h3>
            <div className="glass-card overflow-hidden divide-y divide-border/50">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isDestructive = (item as any).destructive;
                return (
                  <button
                    key={item.label}
                    className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-secondary/30 transition-colors"
                  >
                    <Icon
                      size={18}
                      className={isDestructive ? "text-destructive" : "text-muted-foreground"}
                    />
                    <div className="flex-1 text-left">
                      <p className={`text-sm font-medium ${isDestructive ? "text-destructive" : ""}`}>
                        {item.label}
                      </p>
                      {item.desc && (
                        <p className="text-[11px] text-muted-foreground">{item.desc}</p>
                      )}
                    </div>
                    <ChevronRight size={14} className="text-muted-foreground/50" />
                  </button>
                );
              })}
            </div>
          </motion.div>
        ))}

        <p className="text-center text-[10px] text-muted-foreground py-4">
          ScribeAI v1.0 · Propulsé par l'IA
        </p>
      </div>
    </div>
  );
};

export default SettingsPage;
