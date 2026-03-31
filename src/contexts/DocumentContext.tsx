import { createContext, useContext, useState, ReactNode, useCallback } from "react";

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
  depth: string;
  format: string;
  completed: boolean;
  score: number | null;
  totalQuestions: number;
  createdAt: Date;
}

interface DocumentContextType {
  documents: GeneratedDocument[];
  addDocument: (doc: GeneratedDocument) => void;
  deleteDocument: (id: string) => void;
  renameDocument: (id: string, newTitle: string) => void;
  getDocument: (id: string) => GeneratedDocument | undefined;
  addChatMessage: (docId: string, message: ChatMessage) => void;
  getAllChats: () => ChatMessage[];
  evaluations: Evaluation[];
  addEvaluation: (eval_: Evaluation) => void;
}

const DocumentContext = createContext<DocumentContextType | undefined>(undefined);

const DOCS_KEY = "scribeai-documents";
const EVALS_KEY = "scribeai-evaluations";

const loadDocs = (): GeneratedDocument[] => {
  try {
    const saved = localStorage.getItem(DOCS_KEY);
    if (!saved) return [];
    return JSON.parse(saved).map((d: any) => ({
      ...d,
      createdAt: new Date(d.createdAt),
      chatHistory: (d.chatHistory || []).map((c: any) => ({
        ...c,
        timestamp: new Date(c.timestamp),
      })),
    }));
  } catch {
    return [];
  }
};

const loadEvals = (): Evaluation[] => {
  try {
    const saved = localStorage.getItem(EVALS_KEY);
    if (!saved) return [];
    return JSON.parse(saved).map((e: any) => ({
      ...e,
      createdAt: new Date(e.createdAt),
    }));
  } catch {
    return [];
  }
};

export const DocumentProvider = ({ children }: { children: ReactNode }) => {
  const [documents, setDocuments] = useState<GeneratedDocument[]>(loadDocs);
  const [evaluations, setEvaluations] = useState<Evaluation[]>(loadEvals);

  const saveDocs = (docs: GeneratedDocument[]) => {
    setDocuments(docs);
    localStorage.setItem(DOCS_KEY, JSON.stringify(docs));
  };

  const saveEvals = (evals: Evaluation[]) => {
    setEvaluations(evals);
    localStorage.setItem(EVALS_KEY, JSON.stringify(evals));
  };

  const addDocument = useCallback((doc: GeneratedDocument) => {
    setDocuments((prev) => {
      const next = [doc, ...prev];
      localStorage.setItem(DOCS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const deleteDocument = useCallback((id: string) => {
    setDocuments((prev) => {
      const next = prev.filter((d) => d.id !== id);
      localStorage.setItem(DOCS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const renameDocument = useCallback((id: string, newTitle: string) => {
    setDocuments((prev) => {
      const next = prev.map((d) => (d.id === id ? { ...d, title: newTitle } : d));
      localStorage.setItem(DOCS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const getDocument = useCallback(
    (id: string) => documents.find((d) => d.id === id),
    [documents]
  );

  const addChatMessage = useCallback((docId: string, message: ChatMessage) => {
    setDocuments((prev) => {
      const next = prev.map((d) =>
        d.id === docId ? { ...d, chatHistory: [...d.chatHistory, message] } : d
      );
      localStorage.setItem(DOCS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const getAllChats = useCallback(() => {
    return documents
      .flatMap((d) => d.chatHistory)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [documents]);

  const addEvaluation = useCallback((eval_: Evaluation) => {
    setEvaluations((prev) => {
      const next = [eval_, ...prev];
      localStorage.setItem(EVALS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return (
    <DocumentContext.Provider
      value={{
        documents,
        addDocument,
        deleteDocument,
        renameDocument,
        getDocument,
        addChatMessage,
        getAllChats,
        evaluations,
        addEvaluation,
      }}
    >
      {children}
    </DocumentContext.Provider>
  );
};

export const useDocuments = () => {
  const ctx = useContext(DocumentContext);
  if (!ctx) throw new Error("useDocuments must be used within DocumentProvider");
  return ctx;
};
