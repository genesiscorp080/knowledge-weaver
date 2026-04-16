import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGeneration } from "@/contexts/GenerationContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Loader2, X, ChevronLeft, ChevronRight, FileText, Clock, Layers, Pause, Play, Trash2 } from "lucide-react";

const FloatingProgress = () => {
  const { jobs, hasActiveGenerations, cancelJob, continueJob, abandonJob } = useGeneration();
  const { language } = useLanguage();
  const isFr = language === "fr";
  const [expanded, setExpanded] = useState(false);
  const [viewIndex, setViewIndex] = useState(0);

  const activeOrQueued = jobs.filter(j => ["generating", "queued", "paused"].includes(j.status));
  if (activeOrQueued.length === 0) return null;

  const primaryJob = activeOrQueued.find(j => j.status === "generating") || activeOrQueued[0];
  const progress = primaryJob.progress;

  // Full overlay view
  if (expanded) {
    const currentJob = activeOrQueued[Math.min(viewIndex, activeOrQueued.length - 1)];
    if (!currentJob) { setExpanded(false); return null; }

    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[70] flex items-center justify-center">
        <div className="absolute inset-0 bg-background/85 backdrop-blur-lg" />
        <div className="relative z-10 flex flex-col items-center gap-5 px-8 max-w-sm w-full">
          {/* Close button */}
          <button onClick={() => setExpanded(false)} className="absolute top-0 right-0 p-2 text-muted-foreground hover:text-foreground">
            <X size={20} />
          </button>

          {/* Navigation between jobs */}
          {activeOrQueued.length > 1 && (
            <div className="flex items-center gap-3 mb-2">
              <button onClick={() => setViewIndex(i => Math.max(0, i - 1))} disabled={viewIndex === 0} className="p-1 disabled:opacity-30">
                <ChevronLeft size={16} />
              </button>
              <span className="text-xs text-muted-foreground">{viewIndex + 1} / {activeOrQueued.length}</span>
              <button onClick={() => setViewIndex(i => Math.min(activeOrQueued.length - 1, i + 1))} disabled={viewIndex >= activeOrQueued.length - 1} className="p-1 disabled:opacity-30">
                <ChevronRight size={16} />
              </button>
            </div>
          )}

          {/* Animated icon + progress ring */}
          <div className="relative w-36 h-36">
            {[...Array(8)].map((_, i) => (
              <motion.div key={i} className="absolute w-2 h-2 rounded-full bg-primary/50"
                style={{ top: "50%", left: "50%", marginTop: -4, marginLeft: -4 }}
                animate={{ x: [0, Math.cos(i * (Math.PI / 4)) * 60, 0], y: [0, Math.sin(i * (Math.PI / 4)) * 60, 0], opacity: [0.2, 0.8, 0.2], scale: [0.5, 1.2, 0.5] }}
                transition={{ duration: 3, repeat: Infinity, delay: i * 0.35, ease: "easeInOut" }}
              />
            ))}
            <motion.div className="absolute inset-0 flex items-center justify-center" animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 2, repeat: Infinity }}>
              <div className="w-20 h-20 rounded-2xl bg-primary/15 flex items-center justify-center">
                <motion.div animate={{ rotateY: [0, 180, 360] }} transition={{ duration: 4, repeat: Infinity }}>
                  <FileText size={32} className="text-primary" />
                </motion.div>
              </div>
            </motion.div>
            <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="54" fill="none" stroke="hsl(var(--secondary))" strokeWidth="4" />
              <motion.circle cx="60" cy="60" r="54" fill="none" stroke="hsl(var(--primary))" strokeWidth="4" strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 54}`}
                animate={{ strokeDashoffset: 2 * Math.PI * 54 * (1 - currentJob.progress / 100) }}
                transition={{ duration: 0.5 }}
              />
            </svg>
          </div>

          <motion.p key={Math.round(currentJob.progress)} initial={{ scale: 1.1 }} animate={{ scale: 1 }} className="text-3xl font-bold text-primary font-display">
            {Math.round(currentJob.progress)}%
          </motion.p>

          {/* Topic */}
          <p className="text-sm font-semibold text-foreground text-center truncate max-w-[280px]">{currentJob.topic}</p>

          {/* Step */}
          <motion.p key={currentJob.currentStep} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
            className="text-xs text-muted-foreground text-center max-w-[300px] leading-relaxed">
            {currentJob.currentStep}
          </motion.p>

          {/* Stats */}
          <div className="flex items-center gap-4">
            {currentJob.pagesGenerated > 0 && (
              <div className="flex items-center gap-1.5 bg-secondary/80 px-3 py-1.5 rounded-full">
                <Layers size={12} className="text-primary" />
                <span className="text-xs font-semibold">{currentJob.pagesGenerated}/{currentJob.targetPages} pages</span>
              </div>
            )}
            {currentJob.estimatedTimeLeft && (
              <div className="flex items-center gap-1.5 bg-secondary/80 px-3 py-1.5 rounded-full">
                <Clock size={12} className="text-accent-foreground" />
                <span className="text-xs font-semibold">{currentJob.estimatedTimeLeft}</span>
              </div>
            )}
          </div>

          {/* Status badge */}
          <div className={`px-3 py-1 rounded-full text-xs font-medium ${
            currentJob.status === "generating" ? "bg-primary/10 text-primary" :
            currentJob.status === "queued" ? "bg-secondary text-muted-foreground" :
            currentJob.status === "paused" ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300" :
            "bg-destructive/10 text-destructive"
          }`}>
            {currentJob.status === "generating" ? (isFr ? "En cours" : "Generating") :
             currentJob.status === "queued" ? (isFr ? "En file d'attente" : "Queued") :
             currentJob.status === "paused" ? (isFr ? "En pause" : "Paused") :
             (isFr ? "Échoué" : "Failed")}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 mt-2">
            {currentJob.status === "paused" && (
              <button onClick={() => continueJob(currentJob.id)} className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5">
                <Play size={12} /> {isFr ? "Reprendre" : "Resume"}
              </button>
            )}
            <button onClick={() => { cancelJob(currentJob.id); if (activeOrQueued.length <= 1) setExpanded(false); }}
              className="btn-secondary text-xs px-4 py-2 flex items-center gap-1.5 text-destructive">
              <Trash2 size={12} /> {isFr ? "Annuler" : "Cancel"}
            </button>
          </div>

          {/* Typing dots */}
          {currentJob.status === "generating" && (
            <div className="flex gap-1.5 mt-2">
              {[0, 1, 2, 3, 4].map((i) => (
                <motion.div key={i} className="w-1.5 h-1.5 rounded-full bg-primary/60"
                  animate={{ y: [0, -6, 0], opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
                />
              ))}
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  // Floating badge
  return (
    <AnimatePresence>
      {(hasActiveGenerations || activeOrQueued.length > 0) && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          onClick={() => { setExpanded(true); setViewIndex(0); }}
          className="fixed bottom-24 right-4 z-[60] w-14 h-14 rounded-full bg-card shadow-xl border border-border flex items-center justify-center"
        >
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 56 56">
            <circle cx="28" cy="28" r="24" fill="none" stroke="hsl(var(--secondary))" strokeWidth="3" />
            <motion.circle
              cx="28" cy="28" r="24" fill="none" stroke="hsl(var(--primary))"
              strokeWidth="3" strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 24}`}
              animate={{ strokeDashoffset: 2 * Math.PI * 24 * (1 - progress / 100) }}
              transition={{ duration: 0.3 }}
            />
          </svg>
          <div className="relative z-10 flex flex-col items-center">
            {progress > 0 ? (
              <span className="text-xs font-bold text-primary">{Math.round(progress)}%</span>
            ) : (
              <Loader2 size={16} className="animate-spin text-primary" />
            )}
            {activeOrQueued.length > 1 && (
              <span className="text-[8px] font-bold text-muted-foreground">{activeOrQueued.length}</span>
            )}
          </div>
        </motion.button>
      )}
    </AnimatePresence>
  );
};

export default FloatingProgress;
