import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { FileText, Clock, Layers } from "lucide-react";

interface GenerationOverlayProps {
  show: boolean;
  progress: number;
  step: string;
  pagesGenerated?: number;
  totalPages?: number;
  estimatedTimeLeft?: string;
}

const GenerationOverlay = ({ show, progress, step, pagesGenerated = 0, totalPages = 0, estimatedTimeLeft }: GenerationOverlayProps) => {
  const { language } = useLanguage();
  const isFr = language === "fr";

  if (!show) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] flex items-center justify-center"
    >
      <div className="absolute inset-0 bg-background/85 backdrop-blur-lg" />
      <div className="relative z-10 flex flex-col items-center gap-5 px-8 max-w-sm">
        {/* Animated book/document */}
        <div className="relative w-36 h-36">
          {/* Orbiting particles */}
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 rounded-full bg-primary/50"
              style={{ top: "50%", left: "50%", marginTop: -4, marginLeft: -4 }}
              animate={{
                x: [0, Math.cos(i * (Math.PI / 4)) * 60, 0],
                y: [0, Math.sin(i * (Math.PI / 4)) * 60, 0],
                opacity: [0.2, 0.8, 0.2],
                scale: [0.5, 1.2, 0.5],
              }}
              transition={{ duration: 3, repeat: Infinity, delay: i * 0.35, ease: "easeInOut" }}
            />
          ))}
          
          {/* Center icon pulse */}
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <div className="w-20 h-20 rounded-2xl bg-primary/15 flex items-center justify-center">
              <motion.div
                animate={{ rotateY: [0, 180, 360] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              >
                <FileText size={32} className="text-primary" />
              </motion.div>
            </div>
          </motion.div>

          {/* Progress ring */}
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="54" fill="none" stroke="hsl(var(--secondary))" strokeWidth="4" />
            <motion.circle
              cx="60" cy="60" r="54" fill="none" stroke="hsl(var(--primary))"
              strokeWidth="4" strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 54}`}
              animate={{ strokeDashoffset: 2 * Math.PI * 54 * (1 - progress / 100) }}
              transition={{ duration: 0.5 }}
            />
          </svg>
        </div>

        {/* Percentage */}
        <motion.p
          key={Math.round(progress)}
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          className="text-3xl font-bold text-primary font-display"
        >
          {Math.round(progress)}%
        </motion.p>

        {/* Step text */}
        <motion.p
          key={step}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm font-medium text-foreground text-center max-w-[300px] leading-relaxed"
        >
          {step}
        </motion.p>

        {/* Stats row */}
        {(pagesGenerated > 0 || estimatedTimeLeft) && (
          <div className="flex items-center gap-4">
            {pagesGenerated > 0 && (
              <div className="flex items-center gap-1.5 bg-secondary/80 px-3 py-1.5 rounded-full">
                <Layers size={12} className="text-primary" />
                <span className="text-xs font-semibold">
                  {pagesGenerated}{totalPages > 0 ? `/${totalPages}` : ""} {isFr ? "pages" : "pages"}
                </span>
              </div>
            )}
            {estimatedTimeLeft && (
              <div className="flex items-center gap-1.5 bg-secondary/80 px-3 py-1.5 rounded-full">
                <Clock size={12} className="text-accent-foreground" />
                <span className="text-xs font-semibold">{estimatedTimeLeft}</span>
              </div>
            )}
          </div>
        )}

        {/* Animated typing dots */}
        <div className="flex gap-1.5 mt-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <motion.div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-primary/60"
              animate={{
                y: [0, -6, 0],
                opacity: [0.4, 1, 0.4],
              }}
              transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default GenerationOverlay;
