import { useState, useRef, useEffect } from "react";
import { MoreVertical, Pencil, Trash2, Download, Edit3 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";

interface DocMenuProps {
  onRename: () => void;
  onDelete: () => void;
  onDownload: () => void;
  onEdit?: () => void;
}

const DocMenu = ({ onRename, onDelete, onDownload, onEdit }: DocMenuProps) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { t } = useLanguage();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const items = [
    { label: t("common.rename"), icon: Pencil, action: onRename },
    ...(onEdit ? [{ label: t("common.edit"), icon: Edit3, action: onEdit }] : []),
    { label: t("common.download"), icon: Download, action: onDownload },
    { label: t("common.delete"), icon: Trash2, action: onDelete, destructive: true },
  ];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="p-2 rounded-lg hover:bg-secondary transition-colors"
      >
        <MoreVertical size={16} className="text-muted-foreground" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -5 }}
            className="absolute right-0 top-full mt-1 z-30 glass-card overflow-hidden min-w-[160px] shadow-lg"
          >
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  onClick={(e) => { e.stopPropagation(); item.action(); setOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors hover:bg-secondary/50 ${
                    (item as any).destructive ? "text-destructive" : "text-foreground"
                  }`}
                >
                  <Icon size={14} />
                  {item.label}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DocMenu;
