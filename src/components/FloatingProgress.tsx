import { motion, AnimatePresence } from "framer-motion";
import { useGeneration } from "@/contexts/GenerationContext";
import { Loader2 } from "lucide-react";

const FloatingProgress = () => {
  const { jobs, hasActiveGenerations, setShowOverlay, setOverlayJobId } = useGeneration();

  const activeOrQueued = jobs.filter(j => ["generating", "queued"].includes(j.status));
  if (activeOrQueued.length === 0) return null;

  const primaryJob = activeOrQueued.find(j => j.status === "generating") || activeOrQueued[0];
  const progress = primaryJob.progress;

  const handleClick = () => {
    setOverlayJobId(primaryJob.id);
    setShowOverlay(true);
  };

  return (
    <AnimatePresence>
      {hasActiveGenerations && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          onClick={handleClick}
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
