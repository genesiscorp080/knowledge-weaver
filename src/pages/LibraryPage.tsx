import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, BookOpen, Check, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import StatusBar from "@/components/StatusBar";
import DocMenu from "@/components/DocMenu";
import { useLanguage } from "@/contexts/LanguageContext";
import { useDocuments } from "@/contexts/DocumentContext";
import { generatePDF } from "@/lib/ai";
import { estimatePageCount } from "@/lib/pdfUtils";
import pdfIcon from "@/assets/icone_pdf.png";

const LibraryPage = () => {
  const { t, language } = useLanguage();
  const { documents, deleteDocument, renameDocument } = useDocuments();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const isFr = language === "fr";

  const filteredDocs = documents.filter(d =>
    d.title.toLowerCase().includes(search.toLowerCase())
  );

  const handleRename = (id: string) => {
    renameDocument(id, editTitle);
    setEditingId(null);
  };

  return (
    <div className="mobile-container">
      <StatusBar title={t("library.title")} />
      <div className="page-content space-y-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="pt-2">
          <div className="relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("library.search")} className="input-field w-full pl-10" />
          </div>
        </motion.div>

        <p className="text-xs text-muted-foreground font-medium">
          {filteredDocs.length} {filteredDocs.length > 1 ? t("library.documentsPlural") : t("library.documents")}
        </p>

        <div className="space-y-3">
          <AnimatePresence>
            {filteredDocs.map((doc, i) => {
              const realPages = estimatePageCount(doc.content);
              return (
                <motion.div key={doc.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -100 }} transition={{ delay: i * 0.05 }}
                  className="glass-card p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/document/${doc.id}`)}>
                  <div className="flex items-start gap-3">
                    <img src={pdfIcon} alt="PDF" className="w-10 h-10 object-contain shrink-0" />
                    <div className="flex-1 min-w-0">
                      {editingId === doc.id ? (
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="input-field flex-1 h-8 text-sm" autoFocus />
                          <button onClick={() => handleRename(doc.id)} className="text-primary"><Check size={16} /></button>
                          <button onClick={() => setEditingId(null)} className="text-muted-foreground"><X size={16} /></button>
                        </div>
                      ) : (
                        <p className="text-sm font-semibold truncate">{doc.title}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="chip chip-inactive text-[10px] py-0.5 px-2">{doc.format}</span>
                        <span className="text-[10px] text-muted-foreground">{t(`level.${doc.level}`)}</span>
                        <span className="text-[10px] text-muted-foreground">·</span>
                        <span className="text-[10px] text-muted-foreground">{realPages} {t("home.pages")}</span>
                        <span className="text-[10px] text-muted-foreground">·</span>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(doc.createdAt).toLocaleDateString(isFr ? "fr-FR" : "en-US")}
                        </span>
                      </div>
                    </div>
                    <div onClick={(e) => e.stopPropagation()}>
                      <DocMenu
                        onRename={() => { setEditingId(doc.id); setEditTitle(doc.title); }}
                        onDelete={() => deleteDocument(doc.id)}
                        onDownload={() => generatePDF(doc.title, doc.content)}
                        onEdit={() => navigate(`/document/${doc.id}`)}
                      />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {filteredDocs.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                <BookOpen size={28} className="text-muted-foreground/40" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">{t("library.noDocuments")}</p>
              <p className="text-xs text-muted-foreground/70 mt-1">{t("library.noDocumentsDesc")}</p>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LibraryPage;
