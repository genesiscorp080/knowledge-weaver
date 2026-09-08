import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { MoreVertical, Pencil, Trash2, Download, Edit3, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";

interface DocMenuProps {
  onRename: () => void;
  onDelete: () => void;
  onDownload: () => void;
  onEdit?: () => void;
  onEnhance?: () => void;
}

const MENU_WIDTH = 200;

const DocMenu = ({ onRename, onDelete, onDownload, onEdit, onEnhance }: DocMenuProps) => {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top?: number; bottom?: number; left: number }>({ left: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { t, language } = useLanguage();

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (menuRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      setOpen(false);
    };
    const close = () => setOpen(false);
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  // Position the menu in the viewport (portal → never hidden behind sibling cards)
  useLayoutEffect(() => {
    if (open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const left = Math.max(8, Math.min(rect.right - MENU_WIDTH, window.innerWidth - MENU_WIDTH - 8));
      if (spaceBelow < 260) {
        setPos({ bottom: window.innerHeight - rect.top + 4, left });
      } else {
        setPos({ top: rect.bottom + 4, left });
      }
    }
  }, [open]);

  const items = [
    { label: t("common.rename"), icon: Pencil, action: onRename },
    ...(onEnhance ? [{
      label: language === "fr" ? "Renforcer / Continuer" : "Reinforce / Continue",
      icon: Sparkles,
      action: onEnhance,
    }] : []),
    ...(onEdit ? [{ label: t("common.edit"), icon: Edit3, action: onEdit }] : []),
    { label: t("common.download"), icon: Download, action: onDownload },
    { label: t("common.delete"), icon: Trash2, action: onDelete, destructive: true },
  ];

  return (
    <>
      <button
        ref={buttonRef}
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="p-2 rounded-lg hover:bg-secondary transition-colors"
        aria-label="Menu"
      >
        <MoreVertical size={16} className="text-muted-foreground" />
      </button>
      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              ref={menuRef}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              style={{ position: "fixed", top: pos.top, bottom: pos.bottom, left: pos.left, width: MENU_WIDTH }}
              className="z-[200] rounded-xl border border-border bg-card shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {items.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.label}
                    onClick={(e) => { e.stopPropagation(); item.action(); setOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors hover:bg-secondary/60 ${
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
        </AnimatePresence>,
        document.body
      )}
    </>
  );
};

export default DocMenu;
