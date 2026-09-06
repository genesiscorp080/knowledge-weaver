import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, ArrowRight, Layers } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useGeneration } from "@/contexts/GenerationContext";
import type { EnhanceMode } from "@/lib/ai";

export interface EnhanceTarget {
  id: string;
  title: string;
  topic: string;
  level: string;
  format: string;
  depth: string;
  content: string;
  tableOfContents: string;
}

interface EnhanceDialogProps {
  open: boolean;
  onClose: () => void;
  doc: EnhanceTarget | null;
}

const EnhanceDialog = ({ open, onClose, doc }: EnhanceDialogProps) => {
  const { language } = useLanguage();
  const { addEnhanceJob } = useGeneration();
  const isFr = language === "fr";

  const [mode, setMode] = useState<EnhanceMode>("both");
  const [extraPages, setExtraPages] = useState(20);
  const [intensity, setIntensity] = useState(2);
  const [instructions, setInstructions] = useState("");

  const modes: { value: EnhanceMode; label: string; desc: string; icon: typeof Sparkles }[] = [
    { value: "continue", label: isFr ? "Continuer" : "Continue", desc: isFr ? "Ajouter de nouvelles pages à la suite" : "Add new pages at the end", icon: ArrowRight },
    { value: "improve", label: isFr ? "Améliorer" : "Improve", desc: isFr ? "Approfondir et enrichir l'existant" : "Deepen and enrich existing text", icon: Sparkles },
    { value: "both", label: isFr ? "Les deux" : "Both", desc: isFr ? "Améliorer puis continuer" : "Improve then continue", icon: Layers },
  ];

  const intensities = [
    { value: 1, label: isFr ? "Légère" : "Light" },
    { value: 2, label: isFr ? "Moyenne" : "Medium" },
    { value: 3, label: isFr ? "Forte" : "Strong" },
  ];

  const handleSubmit = () => {
    if (!doc) return;
    const id = addEnhanceJob({
      sourceDocId: doc.id,
      sourceTitle: doc.title,
      sourceContent: doc.content,
      sourceToc: doc.tableOfContents || "",
      topic: doc.topic || doc.title,
      level: doc.level,
      format: doc.format,
      depth: doc.depth,
      enhanceMode: mode,
      extraPages: mode === "improve" ? 0 : Math.max(1, extraPages),
      intensity,
      description: instructions.trim() || undefined,
    });
    if (id) onClose();
  };

  return (
    <AnimatePresence>
      {open && doc && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] bg-background/70 backdrop-blur-sm flex items-end sm:items-center justify-center"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="glass-card w-full max-w-md m-0 sm:m-4 rounded-t-3xl sm:rounded-3xl p-5 space-y-4 max-h-[88vh] overflow-y-auto"
          >
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <h2 className="font-display text-base font-semibold">
                  {isFr ? "Renforcer / Continuer" : "Reinforce / Continue"}
                </h2>
                <p className="text-xs text-muted-foreground truncate mt-0.5">{doc.title}</p>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
                <X size={16} className="text-muted-foreground" />
              </button>
            </div>

            {/* Mode */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">{isFr ? "Que faire ?" : "What to do?"}</p>
              <div className="space-y-2">
                {modes.map((m) => {
                  const Icon = m.icon;
                  const active = mode === m.value;
                  return (
                    <button key={m.value} onClick={() => setMode(m.value)}
                      className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left border transition-colors ${
                        active ? "border-primary bg-primary/10" : "border-border/60 hover:bg-secondary/50"
                      }`}>
                      <Icon size={16} className={active ? "text-primary" : "text-muted-foreground"} />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">{m.label}</p>
                        <p className="text-[11px] text-muted-foreground">{m.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Extra pages */}
            {mode !== "improve" && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">
                  {isFr ? "Pages à ajouter" : "Pages to add"}
                </p>
                <input
                  type="number" min={1} max={2000} value={extraPages}
                  onChange={(e) => setExtraPages(Math.max(1, Math.min(2000, Number(e.target.value) || 1)))}
                  className="input-field w-full h-10 text-sm"
                />
              </div>
            )}

            {/* Intensity */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">
                {isFr ? "Intensité du renforcement" : "Reinforcement intensity"}
              </p>
              <div className="flex gap-2">
                {intensities.map((i) => (
                  <button key={i.value} onClick={() => setIntensity(i.value)}
                    className={`chip flex-1 text-xs ${intensity === i.value ? "chip-active" : "chip-inactive"}`}>
                    {i.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Free instructions */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">
                {isFr ? "Consignes (facultatif)" : "Instructions (optional)"}
              </p>
              <textarea
                value={instructions} onChange={(e) => setInstructions(e.target.value)}
                rows={3}
                placeholder={isFr ? "Ex : approfondir les exemples chiffrés et ajouter des études de cas récentes." : "E.g. deepen quantitative examples and add recent case studies."}
                className="input-field w-full text-sm py-2 resize-none"
              />
            </div>

            <button onClick={handleSubmit}
              className="w-full bg-primary text-primary-foreground rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-2">
              <Sparkles size={16} />
              {isFr ? "Lancer en arrière-plan" : "Start in background"}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default EnhanceDialog;
