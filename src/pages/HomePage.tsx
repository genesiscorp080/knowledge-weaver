import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, ChevronDown, FileText, BookOpen, GraduationCap, BookMarked, Plus, Minus } from "lucide-react";
import StatusBar from "@/components/StatusBar";

const levels = [
  { value: "primaire", label: "Primaire" },
  { value: "college", label: "Collège" },
  { value: "lycee", label: "Lycée" },
  { value: "licence", label: "Licence" },
  { value: "ingenieur", label: "Ingénieur" },
  { value: "docteur", label: "Docteur" },
  { value: "expert", label: "Expert" },
];

const formats = [
  { value: "article", label: "Article", icon: FileText, desc: "< 25 pages · Style soutenu", maxPages: 25, minPages: 5 },
  { value: "support", label: "Support", icon: BookMarked, desc: "< 100 pages · Didactique", maxPages: 100, minPages: 10 },
  { value: "cours", label: "Cours", icon: GraduationCap, desc: "< 100 pages · Exemples & illustrations", maxPages: 100, minPages: 15 },
  { value: "livre", label: "Livre", icon: BookOpen, desc: "> 100 pages · Narratif & soutenu", maxPages: 500, minPages: 100 },
];

const depths = [
  { value: "bas", label: "Bas", desc: "Comprendre le concept" },
  { value: "intermediaire", label: "Intermédiaire", desc: "Concept + liens connexes" },
  { value: "avance", label: "Avancé", desc: "Maîtrise complète" },
  { value: "expert", label: "Expert", desc: "Tout savoir sur tout" },
];

// Depth restrictions: some depths block certain formats
const depthFormatRestrictions: Record<string, string[]> = {
  bas: ["article", "support"],
  intermediaire: ["article", "support", "cours"],
  avance: ["support", "cours", "livre"],
  expert: ["cours", "livre"],
};

const HomePage = () => {
  const [topic, setTopic] = useState("");
  const [level, setLevel] = useState("");
  const [format, setFormat] = useState("");
  const [depth, setDepth] = useState("intermediaire");
  const [customPages, setCustomPages] = useState<number | null>(null);
  const [showPageInput, setShowPageInput] = useState(false);
  const [tableOfContents, setTableOfContents] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [levelOpen, setLevelOpen] = useState(false);

  const allowedFormats = depthFormatRestrictions[depth] || formats.map(f => f.value);
  const selectedFormat = formats.find(f => f.value === format);

  // Reset format if not allowed
  const handleDepthChange = (newDepth: string) => {
    setDepth(newDepth);
    const newAllowed = depthFormatRestrictions[newDepth] || [];
    if (!newAllowed.includes(format)) {
      setFormat("");
    }
  };

  const handleGenerate = () => {
    if (!topic || !level || !format) return;
    // TODO: integrate with AI
    console.log({ topic, level, format, depth, customPages, tableOfContents });
  };

  const isValid = topic.trim() && level && format;

  return (
    <div className="mobile-container">
      <StatusBar title="ScribeAI" />
      <div className="page-content space-y-5">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="pt-2"
        >
          <h2 className="font-display text-2xl font-bold text-foreground">
            Créer un document
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Décrivez votre sujet et laissez l'IA rédiger pour vous
          </p>
        </motion.div>

        {/* Topic Input */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
            Sujet / Question
          </label>
          <textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Ex: Les mécanismes de la photosynthèse..."
            className="input-field w-full min-h-[100px] py-3 resize-none"
          />
        </motion.div>

        {/* Level Selector */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
            Niveau
          </label>
          <div className="relative">
            <button
              onClick={() => setLevelOpen(!levelOpen)}
              className="input-field w-full flex items-center justify-between"
            >
              <span className={level ? "text-foreground" : "text-muted-foreground/60"}>
                {level ? levels.find(l => l.value === level)?.label : "Choisir un niveau"}
              </span>
              <ChevronDown size={16} className={`text-muted-foreground transition-transform ${levelOpen ? "rotate-180" : ""}`} />
            </button>
            {levelOpen && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute z-20 top-full mt-1 w-full glass-card overflow-hidden"
              >
                {levels.map((l) => (
                  <button
                    key={l.value}
                    onClick={() => { setLevel(l.value); setLevelOpen(false); }}
                    className={`w-full text-left px-4 py-3 text-sm font-medium transition-colors ${
                      level === l.value
                        ? "bg-primary/10 text-primary"
                        : "text-foreground hover:bg-secondary/50"
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Depth */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
            Profondeur
          </label>
          <div className="flex flex-wrap gap-2">
            {depths.map((d) => (
              <button
                key={d.value}
                onClick={() => handleDepthChange(d.value)}
                className={`chip ${depth === d.value ? "chip-active" : "chip-inactive"}`}
              >
                {d.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">
            {depths.find(d => d.value === depth)?.desc}
          </p>
        </motion.div>

        {/* Format */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
            Format
          </label>
          <div className="grid grid-cols-2 gap-2">
            {formats.map((f) => {
              const Icon = f.icon;
              const isAllowed = allowedFormats.includes(f.value);
              return (
                <button
                  key={f.value}
                  onClick={() => isAllowed && setFormat(f.value)}
                  disabled={!isAllowed}
                  className={`glass-card p-3 text-left transition-all duration-200 ${
                    format === f.value
                      ? "ring-2 ring-primary bg-primary/5 border-primary/20"
                      : isAllowed
                        ? "hover:bg-secondary/30"
                        : "opacity-30 cursor-not-allowed"
                  }`}
                >
                  <Icon size={18} className={format === f.value ? "text-primary" : "text-muted-foreground"} />
                  <p className="text-sm font-semibold mt-1.5">{f.label}</p>
                  <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{f.desc}</p>
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Page count */}
        {selectedFormat && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <button
              onClick={() => setShowPageInput(!showPageInput)}
              className="text-xs font-semibold text-primary flex items-center gap-1"
            >
              {showPageInput ? <Minus size={12} /> : <Plus size={12} />}
              Préciser le nombre de pages
            </button>
            {showPageInput && (
              <div className="mt-2 flex items-center gap-3">
                <input
                  type="number"
                  min={selectedFormat.minPages}
                  max={selectedFormat.maxPages}
                  value={customPages || ""}
                  onChange={(e) => setCustomPages(Number(e.target.value))}
                  placeholder={`${selectedFormat.minPages}–${selectedFormat.maxPages}`}
                  className="input-field w-32 text-center"
                />
                <span className="text-xs text-muted-foreground">
                  pages ({selectedFormat.minPages}–{selectedFormat.maxPages})
                </span>
              </div>
            )}
          </motion.div>
        )}

        {/* Advanced: Table of Contents */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-xs font-semibold text-primary flex items-center gap-1"
          >
            {showAdvanced ? <Minus size={12} /> : <Plus size={12} />}
            Options avancées
          </button>
          {showAdvanced && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mt-3"
            >
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                Table des matières / Points de focalisation (optionnel)
              </label>
              <textarea
                value={tableOfContents}
                onChange={(e) => setTableOfContents(e.target.value)}
                placeholder="1. Introduction&#10;2. Concepts fondamentaux&#10;3. Applications pratiques..."
                className="input-field w-full min-h-[100px] py-3 resize-none"
              />
            </motion.div>
          )}
        </motion.div>

        {/* Generate Button */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="pb-4"
        >
          <button
            onClick={handleGenerate}
            disabled={!isValid}
            className={`btn-primary w-full flex items-center justify-center gap-2 ${
              !isValid ? "opacity-40 cursor-not-allowed" : ""
            }`}
          >
            <Sparkles size={18} />
            Générer le document
          </button>
        </motion.div>
      </div>
    </div>
  );
};

export default HomePage;
