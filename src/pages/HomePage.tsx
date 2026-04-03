import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Sparkles, ChevronDown, FileText, BookOpen, GraduationCap, BookMarked, Plus, Minus, Download, Upload, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import StatusBar from "@/components/StatusBar";
import GenerationOverlay from "@/components/GenerationOverlay";
import { useLanguage } from "@/contexts/LanguageContext";
import { useDocuments, GeneratedDocument } from "@/contexts/DocumentContext";
import { useAuth } from "@/contexts/AuthContext";
import { generateDocumentChunked, generatePDF } from "@/lib/ai";
import { extractPdfText, estimatePageCount } from "@/lib/pdfUtils";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

const levels = [
  { value: "primaire", labelKey: "level.primaire" },
  { value: "college", labelKey: "level.college" },
  { value: "lycee", labelKey: "level.lycee" },
  { value: "licence", labelKey: "level.licence" },
  { value: "ingenieur", labelKey: "level.ingenieur" },
  { value: "docteur", labelKey: "level.docteur" },
  { value: "expert", labelKey: "level.expert" },
];

const formats = [
  { value: "article", labelKey: "format.article", icon: FileText, descKey: "format.article.desc", maxPages: 25, minPages: 5 },
  { value: "support", labelKey: "format.support", icon: BookMarked, descKey: "format.support.desc", maxPages: 100, minPages: 10 },
  { value: "cours", labelKey: "format.cours", icon: GraduationCap, descKey: "format.cours.desc", maxPages: 100, minPages: 15 },
  { value: "livre", labelKey: "format.livre", icon: BookOpen, descKey: "format.livre.desc", maxPages: 500, minPages: 100 },
];

const depths = [
  { value: "bas", labelKey: "depth.bas", descKey: "depth.bas.desc" },
  { value: "intermediaire", labelKey: "depth.intermediaire", descKey: "depth.intermediaire.desc" },
  { value: "avance", labelKey: "depth.avance", descKey: "depth.avance.desc" },
  { value: "expert", labelKey: "depth.expert", descKey: "depth.expert.desc" },
];

const depthFormatRestrictions: Record<string, string[]> = {
  bas: ["article", "support"],
  intermediaire: ["article", "support", "cours"],
  avance: ["support", "cours", "livre"],
  expert: ["cours", "livre"],
};

const HomePage = () => {
  const { t, language } = useLanguage();
  const { addDocument } = useDocuments();
  const { canGenerate, recordGeneration } = useAuth();
  const navigate = useNavigate();
  const [topic, setTopic] = useState("");
  const [level, setLevel] = useState("");
  const [format, setFormat] = useState("");
  const [depth, setDepth] = useState("intermediaire");
  const [customPages, setCustomPages] = useState<number | null>(null);
  const [showPageInput, setShowPageInput] = useState(false);
  const [tableOfContents, setTableOfContents] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [levelOpen, setLevelOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStep, setGenerationStep] = useState("");
  const [pagesGenerated, setPagesGenerated] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [estimatedTimeLeft, setEstimatedTimeLeft] = useState("");
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);
  const [generatedTitle, setGeneratedTitle] = useState("");
  const [referenceFiles, setReferenceFiles] = useState<{ name: string; content: string }[]>([]);
  const refFileRef = useRef<HTMLInputElement>(null);
  const generationStartRef = useRef<number>(0);
  const isFr = language === "fr";

  const allowedFormats = depthFormatRestrictions[depth] || formats.map(f => f.value);
  const selectedFormat = formats.find(f => f.value === format);

  const handleDepthChange = (newDepth: string) => {
    setDepth(newDepth);
    const newAllowed = depthFormatRestrictions[newDepth] || [];
    if (!newAllowed.includes(format)) setFormat("");
  };

  const handleAddReference = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (let i = 0; i < files.length; i++) {
      if (referenceFiles.length >= 5) {
        toast.error(isFr ? "Maximum 5 documents de référence" : "Maximum 5 reference documents");
        break;
      }
      const file = files[i];
      if (file.type !== "application/pdf") {
        toast.error(isFr ? "Seuls les PDF sont autorisés" : "Only PDFs allowed");
        continue;
      }
      try {
        const { text } = await extractPdfText(file);
        setReferenceFiles(prev => [...prev, { name: file.name, content: text }]);
      } catch {
        toast.error(`${isFr ? "Erreur lecture" : "Read error"}: ${file.name}`);
      }
    }
    if (refFileRef.current) refFileRef.current.value = "";
  };

  const handleGenerate = async () => {
    if (!topic || !level || !format) return;

    if (!canGenerate()) {
      toast.error(t("limits.genLimit"));
      navigate("/vip");
      return;
    }

    setIsGenerating(true);
    setGeneratedContent(null);
    setGenerationProgress(0);
    setPagesGenerated(0);
    const targetPages = customPages || 15;
    setTotalPages(targetPages);
    generationStartRef.current = Date.now();

    try {
      const refContent = referenceFiles.length > 0
        ? referenceFiles.map(f => `--- ${f.name} ---\n${f.content.slice(0, 5000)}`).join("\n\n")
        : undefined;

      const { toc, content } = await generateDocumentChunked(
        topic, level, format, depth, customPages, language, tableOfContents,
        (progress: number, step: string) => {
          setGenerationProgress(Math.min(98, progress));
          setGenerationStep(step);
          
          // Estimate pages generated
          const estPages = Math.round((progress / 100) * targetPages);
          setPagesGenerated(estPages);
          
          // Estimate time remaining
          const elapsed = (Date.now() - generationStartRef.current) / 1000;
          if (progress > 5) {
            const totalEst = (elapsed / progress) * 100;
            const remaining = Math.max(0, totalEst - elapsed);
            if (remaining > 60) {
              setEstimatedTimeLeft(`~${Math.round(remaining / 60)} min`);
            } else {
              setEstimatedTimeLeft(`~${Math.round(remaining)}s`);
            }
          }
        },
        refContent
      );

      const fullContent = `# ${topic}\n\n## ${isFr ? "Table des matières" : "Table of Contents"}\n\n${toc}\n\n---\n\n${content}`;
      const title = topic.length > 60 ? topic.slice(0, 57) + "..." : topic;
      const realPages = estimatePageCount(fullContent);

      const doc: GeneratedDocument = {
        id: crypto.randomUUID(),
        title,
        topic,
        format,
        level,
        depth,
        pages: realPages,
        content: fullContent,
        tableOfContents: toc,
        createdAt: new Date(),
        chatHistory: [],
      };

      addDocument(doc);
      await recordGeneration();
      setGenerationProgress(100);
      setPagesGenerated(realPages);
      setGeneratedContent(fullContent);
      setGeneratedTitle(title);
      toast.success(isFr ? "Document généré avec succès !" : "Document generated successfully!");
    } catch (error) {
      console.error("Generation error:", error);
      toast.error(t("common.error"));
    } finally {
      setIsGenerating(false);
      setGenerationStep("");
      setGenerationProgress(0);
      setEstimatedTimeLeft("");
    }
  };

  const isValid = topic.trim() && level && format;

  return (
    <div className="mobile-container">
      <StatusBar title="Prisca" />
      <GenerationOverlay
        show={isGenerating}
        progress={generationProgress}
        step={generationStep}
        pagesGenerated={pagesGenerated}
        totalPages={totalPages}
        estimatedTimeLeft={estimatedTimeLeft}
      />
      <div className="page-content space-y-5">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="pt-2">
          <h2 className="font-display text-2xl font-bold text-foreground">{t("home.title")}</h2>
          <p className="text-sm text-muted-foreground mt-1">{t("home.subtitle")}</p>
        </motion.div>

        {/* Topic */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">{t("home.topic")}</label>
          <textarea value={topic} onChange={(e) => setTopic(e.target.value)} placeholder={t("home.topicPlaceholder")} className="input-field w-full min-h-[100px] py-3 resize-none" />
        </motion.div>

        {/* Level */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">{t("home.level")}</label>
          <div className="relative">
            <button onClick={() => setLevelOpen(!levelOpen)} className="input-field w-full flex items-center justify-between">
              <span className={level ? "text-foreground" : "text-muted-foreground/60"}>
                {level ? t(`level.${level}`) : t("home.levelPlaceholder")}
              </span>
              <ChevronDown size={16} className={`text-muted-foreground transition-transform ${levelOpen ? "rotate-180" : ""}`} />
            </button>
            {levelOpen && (
              <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="absolute z-20 top-full mt-1 w-full glass-card overflow-hidden">
                {levels.map((l) => (
                  <button key={l.value} onClick={() => { setLevel(l.value); setLevelOpen(false); }}
                    className={`w-full text-left px-4 py-3 text-sm font-medium transition-colors ${level === l.value ? "bg-primary/10 text-primary" : "text-foreground hover:bg-secondary/50"}`}>
                    {t(l.labelKey)}
                  </button>
                ))}
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Depth */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">{t("home.depth")}</label>
          <div className="flex flex-wrap gap-2">
            {depths.map((d) => (
              <button key={d.value} onClick={() => handleDepthChange(d.value)} className={`chip ${depth === d.value ? "chip-active" : "chip-inactive"}`}>
                {t(d.labelKey)}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">{t(depths.find(d => d.value === depth)?.descKey || "")}</p>
        </motion.div>

        {/* Format */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">{t("home.format")}</label>
          <div className="grid grid-cols-2 gap-2">
            {formats.map((f) => {
              const Icon = f.icon;
              const isAllowed = allowedFormats.includes(f.value);
              return (
                <button key={f.value} onClick={() => isAllowed && setFormat(f.value)} disabled={!isAllowed}
                  className={`glass-card p-3 text-left transition-all duration-200 ${format === f.value ? "ring-2 ring-primary bg-primary/5 border-primary/20" : isAllowed ? "hover:bg-secondary/30" : "opacity-30 cursor-not-allowed"}`}>
                  <Icon size={18} className={format === f.value ? "text-primary" : "text-muted-foreground"} />
                  <p className="text-sm font-semibold mt-1.5">{t(f.labelKey)}</p>
                  <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{t(f.descKey)}</p>
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Page count */}
        {selectedFormat && (
          <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}>
            <button onClick={() => setShowPageInput(!showPageInput)} className="text-xs font-semibold text-primary flex items-center gap-1">
              {showPageInput ? <Minus size={12} /> : <Plus size={12} />} {t("home.specifyPages")}
            </button>
            {showPageInput && (
              <div className="mt-2 flex items-center gap-3">
                <input type="number" min={selectedFormat.minPages} max={selectedFormat.maxPages} value={customPages || ""} onChange={(e) => setCustomPages(Number(e.target.value))} placeholder={`${selectedFormat.minPages}–${selectedFormat.maxPages}`} className="input-field w-32 text-center" />
                <span className="text-xs text-muted-foreground">{t("home.pages")} ({selectedFormat.minPages}–{selectedFormat.maxPages})</span>
              </div>
            )}
          </motion.div>
        )}

        {/* Reference PDFs */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}>
          <input ref={refFileRef} type="file" accept=".pdf" multiple onChange={handleAddReference} className="hidden" />
          <button onClick={() => refFileRef.current?.click()} className="text-xs font-semibold text-primary flex items-center gap-1">
            <Upload size={12} /> {isFr ? "Ajouter des documents de référence (1-5 PDF)" : "Add reference documents (1-5 PDFs)"}
          </button>
          {referenceFiles.length > 0 && (
            <div className="mt-2 space-y-1.5">
              {referenceFiles.map((f, i) => (
                <div key={i} className="flex items-center gap-2 bg-secondary/60 rounded-lg px-3 py-2">
                  <FileText size={12} className="text-primary shrink-0" />
                  <span className="text-xs truncate flex-1">{f.name}</span>
                  <button onClick={() => setReferenceFiles(prev => prev.filter((_, idx) => idx !== i))}>
                    <X size={12} className="text-muted-foreground" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Advanced */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <button onClick={() => setShowAdvanced(!showAdvanced)} className="text-xs font-semibold text-primary flex items-center gap-1">
            {showAdvanced ? <Minus size={12} /> : <Plus size={12} />} {t("home.advancedOptions")}
          </button>
          {showAdvanced && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-3">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">{t("home.tocLabel")}</label>
              <textarea value={tableOfContents} onChange={(e) => setTableOfContents(e.target.value)} placeholder={t("home.tocPlaceholder")} className="input-field w-full min-h-[100px] py-3 resize-none" />
            </motion.div>
          )}
        </motion.div>

        {/* Generate */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="pb-4">
          <button onClick={handleGenerate} disabled={!isValid || isGenerating}
            className={`btn-primary w-full flex items-center justify-center gap-2 ${!isValid || isGenerating ? "opacity-40 cursor-not-allowed" : ""}`}>
            <Sparkles size={18} />
            {t("home.generate")}
          </button>
        </motion.div>

        {/* Generated content preview */}
        {generatedContent && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="section-title">{generatedTitle}</h3>
              <button onClick={() => generatePDF(generatedTitle, generatedContent)} className="btn-secondary flex items-center gap-2">
                <Download size={14} /> PDF
              </button>
            </div>
            <div className="prose prose-sm max-w-none text-foreground prose-headings:font-display prose-headings:text-foreground prose-p:text-muted-foreground max-h-[300px] overflow-y-auto">
              <ReactMarkdown>{generatedContent.slice(0, 2000)}</ReactMarkdown>
              {generatedContent.length > 2000 && (
                <p className="text-xs text-muted-foreground italic mt-2">
                  {isFr ? "... Voir le document complet dans la bibliothèque" : "... See full document in library"}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default HomePage;
