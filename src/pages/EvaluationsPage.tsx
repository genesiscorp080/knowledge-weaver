import { motion } from "framer-motion";
import { ClipboardCheck, Star, Trophy, Lock } from "lucide-react";
import StatusBar from "@/components/StatusBar";

const quizzes = [
  { title: "La photosynthèse", questions: 10, completed: true, score: 8 },
  { title: "Algèbre linéaire – Bases", questions: 15, completed: true, score: 12 },
  { title: "Machine Learning 101", questions: 20, completed: false, score: null },
];

const EvaluationsPage = () => {
  return (
    <div className="mobile-container">
      <StatusBar title="Évaluations" />
      <div className="page-content space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="pt-2"
        >
          <h2 className="font-display text-2xl font-bold">Évaluations</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Testez vos connaissances sur les documents générés
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-5 flex items-center gap-4"
        >
          <div className="bg-accent/15 rounded-xl p-3">
            <Trophy size={24} className="text-accent-foreground" />
          </div>
          <div>
            <p className="font-display text-xl font-bold">Score moyen</p>
            <p className="text-2xl font-bold text-primary">76%</p>
          </div>
        </motion.div>

        <div className="space-y-3">
          {quizzes.map((quiz, i) => (
            <motion.div
              key={quiz.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.05 }}
              className="glass-card p-4 flex items-center gap-3"
            >
              <div className={`rounded-xl p-2.5 ${quiz.completed ? "bg-primary/10" : "bg-secondary"}`}>
                {quiz.completed ? (
                  <Star size={18} className="text-primary" />
                ) : (
                  <Lock size={18} className="text-muted-foreground" />
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">{quiz.title}</p>
                <p className="text-[11px] text-muted-foreground">
                  {quiz.questions} questions
                  {quiz.completed && quiz.score !== null && ` · Score: ${quiz.score}/${quiz.questions}`}
                </p>
              </div>
              <button
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg ${
                  quiz.completed
                    ? "bg-secondary text-secondary-foreground"
                    : "bg-primary text-primary-foreground"
                }`}
              >
                {quiz.completed ? "Refaire" : "Commencer"}
              </button>
            </motion.div>
          ))}
        </div>

        <div className="text-center py-6">
          <ClipboardCheck size={32} className="mx-auto text-muted-foreground/30" />
          <p className="text-xs text-muted-foreground mt-2">
            Les évaluations sont générées automatiquement à partir de vos documents
          </p>
        </div>
      </div>
    </div>
  );
};

export default EvaluationsPage;
