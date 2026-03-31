import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Download, MessageCircle, FileText, Send, Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useDocuments, ChatMessage } from "@/contexts/DocumentContext";
import { callAI, buildChatSystemPrompt, generatePDF } from "@/lib/ai";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

const DocumentViewerPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { getDocument, addChatMessage } = useDocuments();
  const doc = getDocument(id || "");
  const [activeTab, setActiveTab] = useState<"content" | "chat">("content");
  const [chatInput, setChatInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [doc?.chatHistory]);

  if (!doc) {
    return (
      <div className="mobile-container flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Document not found</p>
      </div>
    );
  }

  const handleSendMessage = async () => {
    if (!chatInput.trim() || isSending) return;
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: chatInput,
      timestamp: new Date(),
      documentId: doc.id,
      documentTitle: doc.title,
    };

    addChatMessage(doc.id, userMsg);
    setChatInput("");
    setIsSending(true);

    try {
      const systemPrompt = buildChatSystemPrompt(doc.content, language);
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

      addChatMessage(doc.id, assistantMsg);
    } catch (error) {
      console.error(error);
      toast.error(t("common.error"));
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="mobile-container">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50">
        <div className="max-w-md mx-auto bg-background/90 backdrop-blur-2xl border-b border-border/50">
          <div className="flex items-center gap-3 px-4 py-3">
            <button onClick={() => navigate(-1)} className="p-1">
              <ArrowLeft size={20} className="text-foreground" />
            </button>
            <h1 className="font-display text-sm font-semibold truncate flex-1">{doc.title}</h1>
            <button onClick={() => generatePDF(doc.title, doc.content)} className="p-2 rounded-lg hover:bg-secondary transition-colors">
              <Download size={18} className="text-primary" />
            </button>
          </div>
          {/* Tabs */}
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
      </div>

      {/* Content */}
      <div className="pt-24 pb-20 px-5">
        {activeTab === "content" ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="prose prose-sm max-w-none text-foreground prose-headings:font-display prose-headings:text-foreground prose-p:text-muted-foreground">
            <ReactMarkdown>{doc.content}</ReactMarkdown>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            {doc.chatHistory.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${msg.role === "user" ? "bg-primary text-primary-foreground rounded-br-sm" : "glass-card rounded-bl-sm"}`}>
                  {msg.role === "assistant" ? (
                    <div className="prose prose-sm max-w-none text-foreground prose-headings:text-foreground prose-p:text-foreground">
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
          </motion.div>
        )}
      </div>

      {/* Chat input */}
      {activeTab === "chat" && (
        <div className="fixed bottom-0 left-0 right-0 z-50">
          <div className="max-w-md mx-auto bg-card/95 backdrop-blur-2xl border-t border-border/50 px-4 py-3 pb-6">
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
  );
};

export default DocumentViewerPage;
