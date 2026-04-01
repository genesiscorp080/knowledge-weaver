import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";

interface GenerationOverlayProps {
  show: boolean;
  progress: number;
  step: string;
}

const GenerationOverlay = ({ show, progress, step }: GenerationOverlayProps) => {
  const { t } = useLanguage();

  if (!show) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
    >
      <div className="absolute inset-0 bg-background/80 backdrop-blur-md" />
      <div className="relative z-10 flex flex-col items-center gap-6 px-8">
        {/* Animated rings */}
        <div className="relative w-32 h-32">
          <motion.div
            className="absolute inset-0 rounded-full border-4 border-primary/20"
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.1, 0.3] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute inset-2 rounded-full border-4 border-primary/30"
            animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.15, 0.4] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
          />
          <motion.div
            className="absolute inset-4 rounded-full border-4 border-primary/40"
            animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.2, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
          />
          {/* Spinning arc */}
          <motion.svg
            className="absolute inset-0 w-full h-full"
            viewBox="0 0 100 100"
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          >
            <circle
              cx="50" cy="50" r="42"
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="3"
              strokeDasharray="80 180"
              strokeLinecap="round"
            />
          </motion.svg>
          {/* Percentage */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-bold text-primary font-display">
              {Math.round(progress)}%
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-64">
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>

        {/* Step text */}
        <motion.p
          key={step}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm font-medium text-muted-foreground text-center max-w-[280px]"
        >
          {step}
        </motion.p>

        {/* Floating dots animation */}
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full bg-primary/60"
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default GenerationOverlay;
