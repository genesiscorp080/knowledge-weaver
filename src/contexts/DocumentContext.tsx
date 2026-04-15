import { createContext, useContext, useState, ReactNode, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface GeneratedDocument {
  id: string;
  title: string;
  topic: string;
  format: string;
  level: string;
  depth: string;
  pages: number;
  content: string;
  tableOfContents: string;
  createdAt: Date;
  chatHistory: ChatMessage[];
}

export interface ImportedDocument {
  id: string;
  title: string;
  fileName: string;
  content: string;
  pageCount: number;
  theme: string;
  createdAt: Date;
  chatHistory: ChatMessage[];
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  documentId: string;
  documentTitle: string;
}

export interface Evaluation {
  id: string;
  documentId: string;
  documentTitle: string;
  content: string;
  answersContent: string;
  depth: string;
  format: string;
  completed: boolean;
  score: number | null;
  totalQuestions: number;
  createdAt: Date;
}

interface DocumentContextType {
  documents: GeneratedDocument[];
  addDocument: (doc: GeneratedDocument) => Promise<void>;
  deleteDocument: (id: string) => void;
  renameDocument: (id: string, newTitle: string) => void;
  getDocument: (id: string) => GeneratedDocument | ImportedDocument | undefined;
  addChatMessage: (docId: string, message: ChatMessage) => void;
  getAllChats: () => ChatMessage[];
  evaluations: Evaluation[];
  addEvaluation: (eval_: Evaluation) => Promise<void>;
  deleteEvaluation: (id: string) => void;
  importedDocuments: ImportedDocument[];
  addImportedDocument: (doc: ImportedDocument) => Promise<void>;
  deleteImportedDocument: (id: string) => void;
  getImportedDocument: (id: string) => ImportedDocument | undefined;
  addImportedChatMessage: (docId: string, message: ChatMessage) => void;
  getAllDocumentsForEval: () => { id: string; title: string; content: string; depth: string; format: string }[];
  loading: boolean;
}

const DocumentContext = createContext<DocumentContextType | undefined>(undefined);

export const DocumentProvider = ({ children }: { children: ReactNode }) => {
  const [documents, setDocuments] = useState<GeneratedDocument[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [importedDocuments, setImportedDocuments] = useState<ImportedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  // Load data from DB
  useEffect(() => {
    if (!user) {
      setDocuments([]);
      setEvaluations([]);
      setImportedDocuments([]);
      setLoading(false);
      return;
    }

    const loadData = async () => {
      setLoading(true);
      try {
        // Load documents
        const { data: docs } = await supabase.from("documents").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
        if (docs) {
          // Load chat messages for docs
          const { data: chats } = await supabase.from("chat_messages").select("*").eq("user_id", user.id);
          const chatMap = new Map<string, ChatMessage[]>();
          chats?.forEach(c => {
            if (!chatMap.has(c.document_id)) chatMap.set(c.document_id, []);
            chatMap.get(c.document_id)!.push({
              id: c.id, role: c.role as "user" | "assistant", content: c.content,
              timestamp: new Date(c.created_at!), documentId: c.document_id, documentTitle: c.document_title,
            });
          });

          setDocuments(docs.map(d => ({
            id: d.id, title: d.title, topic: d.topic, format: d.format, level: d.level,
            depth: d.depth, pages: d.pages || 0, content: d.content || "",
            tableOfContents: d.table_of_contents || "", createdAt: new Date(d.created_at!),
            chatHistory: chatMap.get(d.id) || [],
          })));
        }

        // Load imported docs
        const { data: imports } = await supabase.from("imported_documents").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
        if (imports) {
          const { data: chats } = await supabase.from("chat_messages").select("*").eq("user_id", user.id);
          const chatMap = new Map<string, ChatMessage[]>();
          chats?.forEach(c => {
            if (!chatMap.has(c.document_id)) chatMap.set(c.document_id, []);
            chatMap.get(c.document_id)!.push({
              id: c.id, role: c.role as "user" | "assistant", content: c.content,
              timestamp: new Date(c.created_at!), documentId: c.document_id, documentTitle: c.document_title,
            });
          });

          setImportedDocuments(imports.map(d => ({
            id: d.id, title: d.title, fileName: d.file_name, content: d.content || "",
            pageCount: d.page_count || 0, theme: d.theme || "",
            createdAt: new Date(d.created_at!), chatHistory: chatMap.get(d.id) || [],
          })));
        }

        // Load evaluations
        const { data: evals } = await supabase.from("evaluations").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
        if (evals) {
          setEvaluations(evals.map(e => ({
            id: e.id, documentId: e.document_id, documentTitle: e.document_title,
            content: e.content || "", answersContent: e.answers_content || "",
            depth: e.depth || "", format: e.format || "", completed: e.completed || false,
            score: e.score, totalQuestions: e.total_questions || 25,
            createdAt: new Date(e.created_at!),
          })));
        }
      } catch (err) {
        console.error("Error loading data:", err);
      }
      setLoading(false);
    };

    loadData();
  }, [user]);

  const addDocument = useCallback(async (doc: GeneratedDocument) => {
    if (!user) return;
    await supabase.from("documents").insert({
      id: doc.id, user_id: user.id, title: doc.title, topic: doc.topic,
      format: doc.format, level: doc.level, depth: doc.depth, pages: doc.pages,
      content: doc.content, table_of_contents: doc.tableOfContents,
    });
    setDocuments(prev => [doc, ...prev]);
  }, [user]);

  const deleteDocument = useCallback(async (id: string) => {
    if (user) {
      await supabase.from("chat_messages").delete().eq("document_id", id).eq("user_id", user.id);
      await supabase.from("documents").delete().eq("id", id).eq("user_id", user.id);
    }
    setDocuments(prev => prev.filter(d => d.id !== id));
  }, [user]);

  const renameDocument = useCallback(async (id: string, newTitle: string) => {
    if (user) await supabase.from("documents").update({ title: newTitle }).eq("id", id).eq("user_id", user.id);
    setDocuments(prev => prev.map(d => d.id === id ? { ...d, title: newTitle } : d));
  }, [user]);

  const getDocument = useCallback(
    (id: string) => documents.find(d => d.id === id) || importedDocuments.find(d => d.id === id),
    [documents, importedDocuments]
  );

  const getImportedDocument = useCallback(
    (id: string) => importedDocuments.find(d => d.id === id),
    [importedDocuments]
  );

  const addChatMessage = useCallback(async (docId: string, message: ChatMessage) => {
    if (user) {
      await supabase.from("chat_messages").insert({
        id: message.id, user_id: user.id, document_id: docId,
        document_title: message.documentTitle, role: message.role, content: message.content,
      });
    }
    setDocuments(prev => prev.map(d => d.id === docId ? { ...d, chatHistory: [...d.chatHistory, message] } : d));
  }, [user]);

  const addImportedChatMessage = useCallback(async (docId: string, message: ChatMessage) => {
    if (user) {
      await supabase.from("chat_messages").insert({
        id: message.id, user_id: user.id, document_id: docId,
        document_title: message.documentTitle, role: message.role, content: message.content,
      });
    }
    setImportedDocuments(prev => prev.map(d => d.id === docId ? { ...d, chatHistory: [...d.chatHistory, message] } : d));
  }, [user]);

  const getAllChats = useCallback(() => {
    const genChats = documents.flatMap(d => d.chatHistory);
    const impChats = importedDocuments.flatMap(d => d.chatHistory);
    return [...genChats, ...impChats].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [documents, importedDocuments]);

  const addEvaluation = useCallback(async (eval_: Evaluation) => {
    if (user) {
      await supabase.from("evaluations").insert({
        id: eval_.id, user_id: user.id, document_id: eval_.documentId,
        document_title: eval_.documentTitle, content: eval_.content,
        answers_content: eval_.answersContent, depth: eval_.depth,
        format: eval_.format, completed: eval_.completed, score: eval_.score,
        total_questions: eval_.totalQuestions,
      });
    }
    setEvaluations(prev => [eval_, ...prev]);
  }, [user]);

  const deleteEvaluation = useCallback(async (id: string) => {
    if (user) await supabase.from("evaluations").delete().eq("id", id).eq("user_id", user.id);
    setEvaluations(prev => prev.filter(e => e.id !== id));
  }, [user]);

  const addImportedDocument = useCallback(async (doc: ImportedDocument) => {
    if (!user) return;
    await supabase.from("imported_documents").insert({
      id: doc.id, user_id: user.id, title: doc.title, file_name: doc.fileName,
      content: doc.content, page_count: doc.pageCount, theme: doc.theme,
    });
    setImportedDocuments(prev => [doc, ...prev]);
  }, [user]);

  const deleteImportedDocument = useCallback(async (id: string) => {
    if (user) {
      await supabase.from("chat_messages").delete().eq("document_id", id).eq("user_id", user.id);
      await supabase.from("imported_documents").delete().eq("id", id).eq("user_id", user.id);
    }
    setImportedDocuments(prev => prev.filter(d => d.id !== id));
  }, [user]);

  const getAllDocumentsForEval = useCallback(() => {
    const gen = documents.map(d => ({ id: d.id, title: d.title, content: d.content, depth: d.depth, format: d.format }));
    const imp = importedDocuments.map(d => ({ id: d.id, title: d.title, content: d.content, depth: "intermediaire", format: "imported" }));
    return [...gen, ...imp];
  }, [documents, importedDocuments]);

  return (
    <DocumentContext.Provider value={{
      documents, addDocument, deleteDocument, renameDocument, getDocument,
      addChatMessage, getAllChats, evaluations, addEvaluation, deleteEvaluation,
      importedDocuments, addImportedDocument, deleteImportedDocument,
      getImportedDocument, addImportedChatMessage, getAllDocumentsForEval, loading,
    }}>
      {children}
    </DocumentContext.Provider>
  );
};

export const useDocuments = () => {
  const ctx = useContext(DocumentContext);
  if (!ctx) throw new Error("useDocuments must be used within DocumentProvider");
  return ctx;
};
