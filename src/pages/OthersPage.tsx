import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileText, Send, Loader2, X, MessageCircle } from "lucide-react";
import StatusBar from "@/components/StatusBar";
import DocMenu from "@/components/DocMenu";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useDocuments, ImportedDocument, ChatMessage } from "@/contexts/DocumentContext";
import { callAI, buildImportedDocChatPrompt, checkContentAppropriate } from "@/lib/ai";
import { extractPdfText } from "@/lib/pdfUtils";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import pdfIcon from "@/assets/icone_pdf.png";

const ImportsPage = () => {
  const { t, language } = useLanguage();
  const { canAskQuestion, recordQuestion } = useAuth();
  const { importedDocuments, addImportedDocument, deleteImportedDocument, addImportedChatMessage } = useDocuments();
  const [isImporting, setIsImporting] = useState(false);
  const [importStep, setImportStep] = useState("");
  const [importProgress, setImportProgress] = useState(0);
  const [selectedDoc, setSelectedDoc] = useState<ImportedDocument | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const isFr = language === "fr";

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedDoc?.chatHistory]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      toast.error(isFr ? "Seuls les fichiers PDF sont autorisés" : "Only PDF files are allowed");
      return;
    }

    setIsImporting(true);
    setImportProgress(0);

    try {
      setImportStep(isFr ? "Importation du fichier..." : "Importing file...");
      setImportProgress(20);
      await new Promise(r => setTimeout(r, 500));

      setImportStep(isFr ? "Vérification de la lisibilité..." : "Verifying readability...");
      setImportProgress(40);
      const { text, pageCount } = await extractPdfText(file);

      if (!text || text.trim().length < 100) {
        toast.error(isFr ? "Le contenu du PDF n'est pas lisible" : "PDF content is not readable");
        setIsImporting(false);
        return;
      }

      setImportProgress(60);
      setImportStep(isFr ? "Analyse du contenu et vérification du thème..." : "Analyzing content and verifying theme...");
      setImportProgress(75);
      const { ok, theme } = await checkContentAppropriate(text, language);

      if (!ok) {
        toast.error(isFr
          ? "Ce document contient du contenu inapproprié et ne peut pas être importé."
          : "This document contains inappropriate content and cannot be imported.");
        setIsImporting(false);
        return;
      }

      setImportProgress(90);
      setImportStep(isFr ? "Finalisation..." : "Finalizing...");

      const doc: ImportedDocument = {
        id: crypto.randomUUID(),
        title: file.name.replace(/\.pdf$/i, ""),
        fileName: file.name,
        content: text,
        pageCount,
        theme,
        createdAt: new Date(),
        chatHistory: [],
      };

      addImportedDocument(doc);
      setImportProgress(100);
      toast.success(isFr ? "Document importé avec succès !" : "Document imported successfully!");
    } catch (err) {
      console.error("Import error:", err);
      toast.error(isFr ? "Erreur lors de l'importation" : "Import error");
    } finally {
      setIsImporting(false);
      setImportStep("");
      setImportProgress(0);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || isSending || !selectedDoc) return;

    if (!canAskQuestion()) {
      toast.error(t("limits.questionLimit"));
      return;
    }

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: chatInput,
      timestamp: new Date(),
      documentId: selectedDoc.id,
      documentTitle: selectedDoc.title,
    };

    addImportedChatMessage(selectedDoc.id, userMsg);
    setSelectedDoc(prev => prev ? { ...prev, chatHistory: [...prev.chatHistory, userMsg] } : null);
    setChatInput("");
    setIsSending(true);

    try {
      await recordQuestion();
      const systemPrompt = buildImportedDocChatPrompt(selectedDoc.content, language);
      const messages = [
        ...selectedDoc.chatHistory.map(m => ({ role: m.role, content: m.content })),
        { role: "user", content: chatInput },
      ];

      const response = await callAI({ action: "chat_imported", messages, systemPrompt });

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: response,
        timestamp: new Date(),
        documentId: selectedDoc.id,
        documentTitle: selectedDoc.title,
      };

      addImportedChatMessage(selectedDoc.id, assistantMsg);
      setSelectedDoc(prev => prev ? { ...prev, chatHistory: [...prev.chatHistory, assistantMsg] } : null);
    } catch (err) {
      console.error(err);
      toast.error(t("common.error"));
    } finally {
      setIsSending(false);
    }
  };

  // Import overlay
  if (isImporting) {
    return (
      <div className="mobile-container">
        <StatusBar title={isFr ? "Imports" : "Imports"} />
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-md">
          <div className="flex flex-col items-center gap-6 px-8">
            <div className="relative w-28 h-28">
              <motion.div className="absolute inset-0 rounded-full border-4 border-primary/20"
                animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.1, 0.3] }}
                transition={{ duration: 2, repeat: Infinity }} />
              <motion.svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100"
                animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }}>
                <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--primary))"
                  strokeWidth="3" strokeDasharray="80 180" strokeLinecap="round" />
              </motion.svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold text-primary font-display">{Math.round(importProgress)}%</span>
              </div>
            </div>
            <div className="w-64 h-2 bg-secondary rounded-full overflow-hidden">
              <motion.div className="h-full bg-primary rounded-full" animate={{ width: `${importProgress}%` }} />
            </div>
            <p className="text-sm font-medium text-muted-foreground text-center">{importStep}</p>
          </div>
        </div>
      </div>
    );
  }

  // Chat view
  if (selectedDoc) {
    return (
      <div className="mobile-container">
        <div className="fixed top-0 left-0 right-0 z-50">
          <div className="max-w-md mx-auto bg-background/90 backdrop-blur-2xl border-b border-border/50">
            <div className="flex items-center gap-3 px-4 py-3">
              <button onClick={() => setSelectedDoc(null)} className="p-1">
                <X size={20} className="text-foreground" />
              </button>
              <h1 className="font-display text-sm font-semibold truncate flex-1">{selectedDoc.title}</h1>
            </div>
          </div>
        </div>

        <div className="pt-16 pb-24 px-5 space-y-3">
          <div className="glass-card p-3 text-center">
            <p className="text-xs text-muted-foreground">
              {isFr ? `Thème : ${selectedDoc.theme} · ${selectedDoc.pageCount} pages` : `Theme: ${selectedDoc.theme} · ${selectedDoc.pageCount} pages`}
            </p>
          </div>

          {selectedDoc.chatHistory.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${msg.role === "user" ? "bg-primary text-primary-foreground rounded-br-sm" : "glass-card rounded-bl-sm"}`}>
                {msg.role === "assistant" ? (
                  <div className="prose prose-sm max-w-none text-foreground">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-sm">{msg.content}</p>
                )}
              </div>
            </div>
          ))}

          {isSending && (
            <div className="flex justify-start">
              <div className="glass-card rounded-2xl rounded-bl-sm px-4 py-3">
                <Loader2 size={16} className="animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <div className="fixed bottom-0 left-0 right-0 z-50">
          <div className="max-w-md mx-auto bg-card/95 backdrop-blur-2xl border-t border-border/50 px-4 py-3 pb-6">
            <div className="flex items-center gap-2">
              <input value={chatInput} onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
                placeholder={isFr ? "Posez une question sur ce document..." : "Ask a question about this document..."}
                className="input-field flex-1 h-10 text-sm" />
              <button onClick={handleSendMessage} disabled={!chatInput.trim() || isSending}
                className={`bg-primary text-primary-foreground rounded-xl p-2.5 transition-opacity ${!chatInput.trim() || isSending ? "opacity-40" : ""}`}>
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mobile-container">
      <StatusBar title={isFr ? "Imports" : "Imports"} />
      <div className="page-content space-y-5">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="pt-2">
          <h2 className="font-display text-2xl font-bold">{isFr ? "Documents importés" : "Imported Documents"}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {isFr ? "Importez vos PDF et posez des questions à l'IA" : "Import your PDFs and ask AI questions"}
          </p>
        </motion.div>

        {/* Upload button */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <input ref={fileRef} type="file" accept=".pdf,application/pdf" onChange={handleFileUpload} className="hidden" />
          <button onClick={() => fileRef.current?.click()}
            className="w-full glass-card p-6 flex flex-col items-center gap-3 hover:shadow-md transition-shadow border-2 border-dashed border-primary/30">
            <div className="bg-primary/10 rounded-xl p-3">
              <Upload size={24} className="text-primary" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold">{isFr ? "Importer un PDF" : "Import a PDF"}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {isFr ? "Seuls les fichiers PDF sont autorisés" : "Only PDF files are allowed"}
              </p>
            </div>
          </button>
        </motion.div>

        {/* Imported documents list */}
        <div className="space-y-3">
          <AnimatePresence>
            {importedDocuments.map((doc, i) => (
              <motion.div key={doc.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }} transition={{ delay: i * 0.05 }}
                className="glass-card p-4 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedDoc(doc)}>
                <div className="flex items-start gap-3">
                  <img src={pdfIcon} alt="PDF" className="w-10 h-10 object-contain shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{doc.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="chip chip-inactive text-[10px] py-0.5 px-2">{doc.theme}</span>
                      <span className="text-[10px] text-muted-foreground">{doc.pageCount} pages</span>
                      <span className="text-[10px] text-muted-foreground">·</span>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(doc.createdAt).toLocaleDateString(isFr ? "fr-FR" : "en-US")}
                      </span>
                    </div>
                    {doc.chatHistory.length > 0 && (
                      <div className="flex items-center gap-1 mt-1">
                        <MessageCircle size={10} className="text-primary" />
                        <span className="text-[10px] text-primary">{doc.chatHistory.length} messages</span>
                      </div>
                    )}
                  </div>
                  <div onClick={(e) => e.stopPropagation()}>
                    <DocMenu
                      onDelete={() => deleteImportedDocument(doc.id)}
                      onRename={() => {}}
                      onDownload={() => {}}
                    />
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {importedDocuments.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                <FileText size={28} className="text-muted-foreground/40" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">
                {isFr ? "Aucun document importé" : "No imported documents"}
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                {isFr ? "Importez un PDF pour commencer" : "Import a PDF to get started"}
              </p>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImportsPage;
