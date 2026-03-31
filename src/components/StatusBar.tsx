import { motion } from "framer-motion";

interface StatusBarProps {
  title?: string;
}

const StatusBar = ({ title }: StatusBarProps) => {
  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-center bg-background/80 backdrop-blur-2xl px-5 pt-3 pb-2">
          {title && (
            <motion.h1
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-display text-base font-semibold text-foreground"
            >
              {title}
            </motion.h1>
          )}
        </div>
      </div>
    </div>
  );
};

export default StatusBar;
