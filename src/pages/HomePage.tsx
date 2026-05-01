import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Sparkles, ChevronDown, FileText, BookOpen, GraduationCap, BookMarked, Plus, Minus, Upload, X, Library, ListPlus, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import StatusBar from "@/components/StatusBar";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useGeneration } from "@/contexts/GenerationContext";
import { extractPdfText } from "@/lib/pdfUtils";
import { toast } from "sonner";
import type { RequiredTheme } from "@/lib/ai";

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
  { value: "encyclopedie", labelKey: "format.encyclopedie", icon: Library, descKey: "format.encyclopedie.desc", maxPages: 1500, minPages: 200 },
];

// Per-format page caps (max) — newly raised limits
const formatPageCaps: Record<string, { min: number; max: number }> = {
  article: { min: 5, max: 50 },
  support: { min: 10, max: 150 },
  cours: { min: 15, max: 150 },
  livre: { min: 100, max: 800 },
  encyclopedie: { min: 200, max: 12000 },
};

// Per-format reference PDF caps
const formatRefCaps: Record<string, number> = {
  article: 5,
  support: 5,
  cours: 5,
  livre: 7,
  encyclopedie: 20,
};

// Per-format required-themes caps
const formatThemeCaps: Record<string, { themes: number; subthemes: number; allowToc: boolean }> = {
  cours: { themes: 10, subthemes: 0, allowToc: false },
  livre: { themes: 20, subthemes: 10, allowToc: true },
  encyclopedie: { themes: 100, subthemes: 10, allowToc: true },
};

const depths = [
  { value: "bas", labelKey: "depth.bas", descKey: "depth.bas.desc" },
  { value: "intermediaire", labelKey: "depth.intermediaire", descKey: "depth.intermediaire.desc" },
  { value: "avance", labelKey: "depth.avance", descKey: "depth.avance.desc" },
  { value: "expert", labelKey: "depth.expert", descKey: "depth.expert.desc" },
];

const depthFormatRestrictions: Record<string, string[]> = {
  bas: ["article", "support"],
  intermediaire: ["article", "support", "cours"],
  avance: ["support", "cours", "livre", "encyclopedie"],
  expert: ["cours", "livre", "encyclopedie"],
};

const HomePage = () => {
  const { t, language } = useLanguage();
  const { canGenerate, canAccessEncyclopedia } = useAuth();
  const { addJob, hasActiveGenerations } = useGeneration();
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
  const [referenceFiles, setReferenceFiles] = useState<{ name: string; content: string }[]>([]);
  const [requiredThemes, setRequiredThemes] = useState<RequiredTheme[]>([]);
  const refFileRef = useRef<HTMLInputElement>(null);
  const isFr = language === "fr";

  const allowedFormats = depthFormatRestrictions[depth] || formats.map(f => f.value);
  const selectedFormat = formats.find(f => f.value === format);
  const pageCap = format ? formatPageCaps[format] : null;
  const refCap = format ? (formatRefCaps[format] ?? 5) : 5;
  const themeCfg = format ? formatThemeCaps[format] : undefined;

  const handleDepthChange = (newDepth: string) => {
    setDepth(newDepth);
    const newAllowed = depthFormatRestrictions[newDepth] || [];
    if (!newAllowed.includes(format)) setFormat("");
  };

  const handleAddReference = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (let i = 0; i < files.length; i++) {
      if (referenceFiles.length >= refCap) {
        toast.error(isFr ? `Maximum ${refCap} documents de référence` : `Maximum ${refCap} reference documents`);
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

  const addTheme = () => {
    if (!themeCfg) return;
    if (requiredThemes.length >= themeCfg.themes) {
      toast.error(isFr ? `Maximum ${themeCfg.themes} thèmes` : `Maximum ${themeCfg.themes} themes`);
      return;
    }
    setRequiredThemes(prev => [...prev, { name: "", subthemes: [], toc: "" }]);
  };
  const updateTheme = (idx: number, patch: Partial<RequiredTheme>) => {
    setRequiredThemes(prev => prev.map((t, i) => i === idx ? { ...t, ...patch } : t));
  };
  const removeTheme = (idx: number) => {
    setRequiredThemes(prev => prev.filter((_, i) => i !== idx));
  };
  const addSubtheme = (idx: number) => {
    if (!themeCfg) return;
    setRequiredThemes(prev => prev.map((t, i) => {
      if (i !== idx) return t;
      if ((t.subthemes?.length || 0) >= themeCfg.subthemes) {
        toast.error(isFr ? `Maximum ${themeCfg.subthemes} sous-thèmes` : `Maximum ${themeCfg.subthemes} sub-themes`);
        return t;
      }
      return { ...t, subthemes: [...(t.subthemes || []), ""] };
    }));
  };
  const updateSubtheme = (idx: number, sIdx: number, value: string) => {
    setRequiredThemes(prev => prev.map((t, i) => i === idx ? {
      ...t, subthemes: (t.subthemes || []).map((s, j) => j === sIdx ? value : s),
    } : t));
  };
  const removeSubtheme = (idx: number, sIdx: number) => {
    setRequiredThemes(prev => prev.map((t, i) => i === idx ? {
      ...t, subthemes: (t.subthemes || []).filter((_, j) => j !== sIdx),
    } : t));
  };

  const handleGenerate = async () => {
    if (!topic || !level || !format) return;

    if (!canGenerate()) {
      toast.error(t("limits.genLimit"));
      navigate("/vip");
      return;
    }

    if (format === "encyclopedie" && !canAccessEncyclopedia()) {
      toast.error(isFr ? "Le format Encyclopédie nécessite un abonnement Évolution ou VIP" : "Encyclopedia format requires Evolution or VIP subscription");
      navigate("/vip");
      return;
    }

    const refContent = referenceFiles.length > 0
      ? referenceFiles.map(f => `--- ${f.name} ---\n${f.content.slice(0, 5000)}`).join("\n\n")
      : undefined;

    // Clean required themes — drop empties
    const cleanedThemes: RequiredTheme[] | undefined = themeCfg
      ? requiredThemes
          .map(t => ({
            name: t.name.trim(),
            subthemes: (t.subthemes || []).map(s => s.trim()).filter(Boolean),
            toc: (t.toc || "").trim(),
          }))
          .filter(t => t.name.length > 0)
      : undefined;

    const jobId = await addJob({
      topic, level, format, depth,
      targetPages: customPages || 15,
      tableOfContents,
      referenceContent: refContent,
      requiredThemes: cleanedThemes && cleanedThemes.length > 0 ? cleanedThemes : undefined,
    });

    if (jobId) {
      toast.success(isFr ? "Vérification du sujet en cours..." : "Checking topic...");
      setTopic("");
      setRequiredThemes([]);
    }
  };

  const isValid = topic.trim() && level && format;

  return (
    <div className="mobile-container">
      <StatusBar title="Prisca" />
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
              const needsSubscription = f.value === "encyclopedie" && !canAccessEncyclopedia();
              return (
                <button key={f.value} onClick={() => isAllowed && setFormat(f.value)} disabled={!isAllowed}
                  className={`glass-card p-3 text-left transition-all duration-200 ${format === f.value ? "ring-2 ring-primary bg-primary/5 border-primary/20" : isAllowed ? "hover:bg-secondary/30" : "opacity-30 cursor-not-allowed"}`}>
                  <Icon size={18} className={format === f.value ? "text-primary" : "text-muted-foreground"} />
                  <p className="text-sm font-semibold mt-1.5">{t(f.labelKey)}</p>
                  <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{t(f.descKey)}</p>
                  {needsSubscription && <p className="text-[9px] text-accent-foreground mt-1">⚡ Évolution+</p>}
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
                <input type="number" min={pageCap?.min} max={pageCap?.max} value={customPages || ""} onChange={(e) => setCustomPages(Number(e.target.value))} placeholder={`${pageCap?.min}–${pageCap?.max}`} className="input-field w-32 text-center" />
                <span className="text-xs text-muted-foreground">{t("home.pages")} ({pageCap?.min}–{pageCap?.max})</span>
              </div>
            )}
          </motion.div>
        )}

        {/* Reference PDFs */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}>
          <input ref={refFileRef} type="file" accept=".pdf" multiple onChange={handleAddReference} className="hidden" />
          <button onClick={() => refFileRef.current?.click()} className="text-xs font-semibold text-primary flex items-center gap-1">
            <Upload size={12} /> {isFr ? `Ajouter des documents de référence (1-${refCap} PDF)` : `Add reference documents (1-${refCap} PDFs)`}
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
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-3 space-y-5 overflow-hidden">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">{t("home.tocLabel")}</label>
              <textarea value={tableOfContents} onChange={(e) => setTableOfContents(e.target.value)} placeholder={t("home.tocPlaceholder")} className="input-field w-full min-h-[100px] py-3 resize-none" />

              {themeCfg && (
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
                    {isFr ? "Thèmes obligatoires" : "Required themes"}
                  </label>
                  <p className="text-[11px] text-muted-foreground mb-2 leading-snug">
                    {isFr
                      ? `Citez les thèmes qui DOIVENT impérativement apparaître et être développés dans le document (ce ne sont PAS les thèmes principaux du document, mais des passages obligatoires). Maximum ${themeCfg.themes} thèmes${themeCfg.subthemes ? `, ${themeCfg.subthemes} sous-thèmes par thème` : ""}.`
                      : `List themes that MUST appear and be developed in the document (these are NOT the document's main subject, but mandatory inclusions). Max ${themeCfg.themes} themes${themeCfg.subthemes ? `, ${themeCfg.subthemes} sub-themes per theme` : ""}.`}
                  </p>
                  <div className="space-y-3">
                    {requiredThemes.map((theme, idx) => (
                      <div key={idx} className="glass-card p-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-primary shrink-0">#{idx + 1}</span>
                          <input
                            value={theme.name}
                            onChange={(e) => updateTheme(idx, { name: e.target.value })}
                            placeholder={isFr ? "Nom du thème obligatoire" : "Required theme name"}
                            className="input-field flex-1 text-sm py-2"
                          />
                          <button onClick={() => removeTheme(idx)} className="text-muted-foreground hover:text-destructive">
                            <Trash2 size={14} />
                          </button>
                        </div>
                        {themeCfg.subthemes > 0 && (
                          <div className="pl-4 space-y-1.5">
                            {(theme.subthemes || []).map((sub, sIdx) => (
                              <div key={sIdx} className="flex items-center gap-2">
                                <span className="text-[10px] text-muted-foreground shrink-0">{idx + 1}.{sIdx + 1}</span>
                                <input
                                  value={sub}
                                  onChange={(e) => updateSubtheme(idx, sIdx, e.target.value)}
                                  placeholder={isFr ? "Sous-thème" : "Sub-theme"}
                                  className="input-field flex-1 text-xs py-1.5"
                                />
                                <button onClick={() => removeSubtheme(idx, sIdx)} className="text-muted-foreground hover:text-destructive">
                                  <X size={12} />
                                </button>
                              </div>
                            ))}
                            {(theme.subthemes?.length || 0) < themeCfg.subthemes && (
                              <button onClick={() => addSubtheme(idx)} className="text-[11px] text-primary flex items-center gap-1">
                                <Plus size={10} /> {isFr ? "Ajouter un sous-thème" : "Add sub-theme"}
                              </button>
                            )}
                          </div>
                        )}
                        {themeCfg.allowToc && (
                          <textarea
                            value={theme.toc || ""}
                            onChange={(e) => updateTheme(idx, { toc: e.target.value })}
                            placeholder={isFr ? "Table des matières pour ce thème (optionnel)" : "Table of contents for this theme (optional)"}
                            className="input-field w-full text-xs py-2 min-h-[60px] resize-none"
                          />
                        )}
                      </div>
                    ))}
                    {requiredThemes.length < themeCfg.themes && (
                      <button onClick={addTheme} className="w-full glass-card p-2 flex items-center justify-center gap-1.5 text-xs font-semibold text-primary hover:bg-primary/5">
                        <ListPlus size={14} /> {isFr ? "Ajouter un thème obligatoire" : "Add required theme"}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </motion.div>

        {/* Generate */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="pb-4">
          <button onClick={handleGenerate} disabled={!isValid}
            className={`btn-primary w-full flex items-center justify-center gap-2 ${!isValid ? "opacity-40 cursor-not-allowed" : ""}`}>
            <Sparkles size={18} />
            {t("home.generate")}
          </button>
        </motion.div>
      </div>
    </div>
  );
};

export default HomePage;
