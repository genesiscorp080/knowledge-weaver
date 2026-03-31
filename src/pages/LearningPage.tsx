import { motion } from "framer-motion";
import { TrendingUp, Clock, Target, BookOpen } from "lucide-react";
import StatusBar from "@/components/StatusBar";

const stats = [
  { label: "Documents créés", value: "12", icon: BookOpen, color: "bg-primary/10 text-primary" },
  { label: "Pages générées", value: "847", icon: Target, color: "bg-accent/15 text-accent-foreground" },
  { label: "Temps économisé", value: "~34h", icon: Clock, color: "bg-primary/10 text-primary" },
  { label: "Sujets explorés", value: "8", icon: TrendingUp, color: "bg-accent/15 text-accent-foreground" },
];

const recentTopics = [
  "Photosynthèse", "Algèbre linéaire", "Machine Learning",
  "Philosophie grecque", "Thermodynamique",
];

const LearningPage = () => {
  return (
    <div className="mobile-container">
      <StatusBar title="Apprentissage" />
      <div className="page-content space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="pt-2"
        >
          <h2 className="font-display text-2xl font-bold">Votre parcours</h2>
          <p className="text-sm text-muted-foreground mt-1">Suivez votre progression d'apprentissage</p>
        </motion.div>

        <div className="grid grid-cols-2 gap-3">
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass-card p-4"
              >
                <div className={`rounded-xl p-2 w-fit ${stat.color}`}>
                  <Icon size={16} />
                </div>
                <p className="font-display text-2xl font-bold mt-2">{stat.value}</p>
                <p className="text-[11px] text-muted-foreground font-medium">{stat.label}</p>
              </motion.div>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h3 className="section-title mb-3">Sujets récents</h3>
          <div className="flex flex-wrap gap-2">
            {recentTopics.map((topic) => (
              <span key={topic} className="chip chip-inactive">{topic}</span>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="glass-card p-5"
        >
          <h3 className="section-title mb-2">Conseil du jour</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Essayez de générer un document en profondeur "Expert" sur un sujet que vous maîtrisez déjà —
            vous découvrirez des connexions insoupçonnées.
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default LearningPage;
