import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Download, MessageCircle, FileText, Send, Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useDocuments, ChatMessage } from "@/contexts/DocumentContext";
import { useAuth } from "@/contexts/AuthContext";
import { callAI, buildChatSystemPrompt, buildImportedDocChatPrompt, generatePDF } from "@/lib/ai";
import { toast } from "sonner";
import PdfViewer from "@/components/PdfViewer";

const DocumentViewerPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { getDocument, getImportedDocument, addChatMessage, addImportedChatMessage } = useDocuments();
  const { canAskQuestion, recordQuestion } = useAuth();
  
  const doc = getDocument(id || "");
  const isImported = !!getImportedDocument(id || "");
  
  const [activeTab, setActiveTab] = useState<"content" | "chat">("content");
  const [chatInput, setChatInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [highlights, setHighlights] = useState<{ id: string; text: string; pageIndex: number; color: string }[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [doc?.chatHistory]);

  // Load highlights from localStorage (could be DB later)
  useEffect(() => {
    if (id) {
      const saved = localStorage.getItem(`highlights-${id}`);
      if (saved) setHighlights(JSON.parse(saved));
    }
  }, [id]);

  const saveHighlights = (h: typeof highlights) => {
    setHighlights(h);
    if (id) localStorage.setItem(`highlights-${id}`, JSON.stringify(h));
  };

  if (!doc) {
    return (
      <div className="mobile-container flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Document not found</p>
      </div>
    );
  }

  const handleSendMessage = async () => {
    if (!chatInput.trim() || isSending) return;
    if (!canAskQuestion()) {
      toast.error(t("limits.questionLimit"));
      return;
    }

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: chatInput,
      timestamp: new Date(),
      documentId: doc.id,
      documentTitle: doc.title,
    };

    if (isImported) {
      addImportedChatMessage(doc.id, userMsg);
    } else {
      addChatMessage(doc.id, userMsg);
    }
    setChatInput("");
    setIsSending(true);

    try {
      await recordQuestion();
      const systemPrompt = isImported
        ? buildImportedDocChatPrompt(doc.content, language)
        : buildChatSystemPrompt(doc.content, language);
      const messages = [
        ...doc.chatHistory.map(m => ({ role: m.role, content: m.content })),
        { role: "user", content: chatInput },
      ];

      const response = await callAI({ action: "chat", messages, systemPrompt });

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: response,
        timestamp: new Date(),
        documentId: doc.id,
        documentTitle: doc.title,
      };

      if (isImported) {
        addImportedChatMessage(doc.id, assistantMsg);
      } else {
        addChatMessage(doc.id, assistantMsg);
      }
    } catch (error) {
      console.error(error);
      toast.error(t("common.error"));
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="mobile-container flex flex-col h-screen">
      {/* Header */}
      <div className="bg-background/90 backdrop-blur-2xl border-b border-border/50 shrink-0">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)} className="p-1">
            <ArrowLeft size={20} className="text-foreground" />
          </button>
          <h1 className="font-display text-sm font-semibold truncate flex-1">{doc.title}</h1>
          <button onClick={() => generatePDF(doc.title, doc.content)} className="p-2 rounded-lg hover:bg-secondary transition-colors">
            <Download size={18} className="text-primary" />
          </button>
        </div>
        <div className="flex border-t border-border/30">
          <button onClick={() => setActiveTab("content")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-colors ${activeTab === "content" ? "text-primary border-b-2 border-primary" : "text-muted-foreground"}`}>
            <FileText size={14} /> {t("viewer.content")}
          </button>
          <button onClick={() => setActiveTab("chat")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-colors ${activeTab === "chat" ? "text-primary border-b-2 border-primary" : "text-muted-foreground"}`}>
            <MessageCircle size={14} /> {t("viewer.chat")}
            {doc.chatHistory.length > 0 && (
              <span className="bg-primary text-primary-foreground text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                {doc.chatHistory.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "content" ? (
          <PdfViewer
            content={doc.content}
            title={doc.title}
            highlights={highlights}
            onAddHighlight={(h) => saveHighlights([...highlights, { ...h, id: crypto.randomUUID() }])}
            onRemoveHighlight={(hId) => saveHighlights(highlights.filter(h => h.id !== hId))}
          />
        ) : (
          <div className="h-full flex flex-col">
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {doc.chatHistory.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${msg.role === "user" ? "bg-primary text-primary-foreground rounded-br-sm" : "glass-card rounded-bl-sm"}`}>
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
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
            <div className="bg-card/95 backdrop-blur-2xl border-t border-border/50 px-4 py-3 pb-6 shrink-0">
              <div className="flex items-center gap-2">
                <input value={chatInput} onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
                  placeholder={t("viewer.askQuestion")} className="input-field flex-1 h-10 text-sm" />
                <button onClick={handleSendMessage} disabled={!chatInput.trim() || isSending}
                  className={`bg-primary text-primary-foreground rounded-xl p-2.5 transition-opacity ${!chatInput.trim() || isSending ? "opacity-40" : ""}`}>
                  <Send size={16} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentViewerPage;
