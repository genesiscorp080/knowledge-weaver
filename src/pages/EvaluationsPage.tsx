import { useState } from "react";
import { motion } from "framer-motion";
import { ClipboardCheck, Star, Trophy, Lock, ChevronDown, Loader2, Download, FileText } from "lucide-react";
import StatusBar from "@/components/StatusBar";
import { useLanguage } from "@/contexts/LanguageContext";
import { useDocuments, Evaluation } from "@/contexts/DocumentContext";
import { callAI, buildEvaluationSystemPrompt, generatePDF } from "@/lib/ai";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

const EvaluationsPage = () => {
  const { t, language } = useLanguage();
  const { documents, evaluations, addEvaluation } = useDocuments();
  const [selectedDocId, setSelectedDocId] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectOpen, setSelectOpen] = useState(false);
  const [viewingEval, setViewingEval] = useState<Evaluation | null>(null);

  const selectedDoc = documents.find(d => d.id === selectedDocId);
  const completedEvals = evaluations.filter(e => e.completed);
  const avgScore = completedEvals.length > 0
    ? Math.round(completedEvals.reduce((s, e) => s + ((e.score || 0) / e.totalQuestions) * 100, 0) / completedEvals.length)
    : 0;

  const handleGenerate = async () => {
    if (!selectedDoc) return;
    setIsGenerating(true);

    try {
      const systemPrompt = buildEvaluationSystemPrompt(selectedDoc.content, selectedDoc.depth, language);
      const content = await callAI({
        action: "generate_evaluation",
        messages: [{ role: "user", content: `Generate a comprehensive evaluation for the document: "${selectedDoc.title}"` }],
        systemPrompt,
      });

      const eval_: Evaluation = {
        id: crypto.randomUUID(),
        documentId: selectedDoc.id,
        documentTitle: selectedDoc.title,
        content,
        depth: selectedDoc.depth,
        format: selectedDoc.format,
        completed: false,
        score: null,
        totalQuestions: 20,
        createdAt: new Date(),
      };

      addEvaluation(eval_);
      setViewingEval(eval_);
      toast.success(language === "fr" ? "Évaluation générée !" : "Evaluation generated!");
    } catch (error) {
      console.error(error);
      toast.error(t("common.error"));
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="mobile-container">
      <StatusBar title={t("eval.title")} />
      <div className="page-content space-y-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="pt-2">
          <h2 className="font-display text-2xl font-bold">{t("eval.title")}</h2>
          <p className="text-sm text-muted-foreground mt-1">{t("eval.subtitle")}</p>
        </motion.div>

        {evaluations.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="glass-card p-5 flex items-center gap-4">
            <div className="bg-accent/15 rounded-xl p-3"><Trophy size={24} className="text-accent-foreground" /></div>
            <div>
              <p className="font-display text-xl font-bold">{t("eval.avgScore")}</p>
              <p className="text-2xl font-bold text-primary">{avgScore}%</p>
            </div>
          </motion.div>
        )}

        {/* Generate new evaluation */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="glass-card p-4 space-y-3">
          <h3 className="text-sm font-semibold">{t("eval.generate")}</h3>
          <div className="relative">
            <button onClick={() => setSelectOpen(!selectOpen)} className="input-field w-full flex items-center justify-between">
              <span className={selectedDocId ? "text-foreground" : "text-muted-foreground/60"}>
                {selectedDoc ? selectedDoc.title : t("eval.selectDoc")}
              </span>
              <ChevronDown size={16} className={`text-muted-foreground transition-transform ${selectOpen ? "rotate-180" : ""}`} />
            </button>
            {selectOpen && (
              <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="absolute z-20 top-full mt-1 w-full glass-card overflow-hidden max-h-48 overflow-y-auto">
                {documents.map((doc) => (
                  <button key={doc.id} onClick={() => { setSelectedDocId(doc.id); setSelectOpen(false); }}
                    className={`w-full text-left px-4 py-3 text-sm font-medium transition-colors flex items-center gap-2 ${selectedDocId === doc.id ? "bg-primary/10 text-primary" : "text-foreground hover:bg-secondary/50"}`}>
                    <FileText size={14} className="shrink-0" />
                    <span className="truncate">{doc.title}</span>
                  </button>
                ))}
                {documents.length === 0 && (
                  <p className="px-4 py-3 text-sm text-muted-foreground">{t("library.noDocuments")}</p>
                )}
              </motion.div>
            )}
          </div>
          <button onClick={handleGenerate} disabled={!selectedDocId || isGenerating}
            className={`btn-primary w-full flex items-center justify-center gap-2 ${!selectedDocId || isGenerating ? "opacity-40 cursor-not-allowed" : ""}`}>
            {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <ClipboardCheck size={16} />}
            {isGenerating ? t("eval.generating") : t("eval.generate")}
          </button>
        </motion.div>

        {/* Evaluations list */}
        <div className="space-y-3">
          {evaluations.map((eval_, i) => (
            <motion.div key={eval_.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.05 }}
              className="glass-card p-4 flex items-center gap-3 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setViewingEval(eval_)}>
              <div className={`rounded-xl p-2.5 ${eval_.completed ? "bg-primary/10" : "bg-accent/15"}`}>
                {eval_.completed ? <Star size={18} className="text-primary" /> : <ClipboardCheck size={18} className="text-accent-foreground" />}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold truncate">{eval_.documentTitle}</p>
                <p className="text-[11px] text-muted-foreground">
                  {eval_.totalQuestions} {t("eval.questions")}
                  {eval_.completed && eval_.score !== null && ` · ${t("eval.score")}: ${eval_.score}/${eval_.totalQuestions}`}
                </p>
              </div>
            </motion.div>
          ))}

          {evaluations.length === 0 && (
            <div className="text-center py-8">
              <ClipboardCheck size={32} className="mx-auto text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground mt-2">{t("eval.noEvals")}</p>
              <p className="text-xs text-muted-foreground/70 mt-1">{t("eval.noEvalsDesc")}</p>
            </div>
          )}
        </div>

        {/* View evaluation */}
        {viewingEval && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm">
            <div className="max-w-md mx-auto h-full flex flex-col">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <h3 className="font-display font-semibold text-sm truncate flex-1">{viewingEval.documentTitle}</h3>
                <div className="flex items-center gap-2">
                  <button onClick={() => generatePDF(`Évaluation - ${viewingEval.documentTitle}`, viewingEval.content)}
                    className="btn-secondary flex items-center gap-1 text-xs">
                    <Download size={12} /> PDF
                  </button>
                  <button onClick={() => setViewingEval(null)} className="text-muted-foreground text-sm font-medium">✕</button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-5 py-4">
                <div className="prose prose-sm max-w-none text-foreground prose-headings:font-display prose-headings:text-foreground prose-p:text-muted-foreground">
                  <ReactMarkdown>{viewingEval.content}</ReactMarkdown>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default EvaluationsPage;
