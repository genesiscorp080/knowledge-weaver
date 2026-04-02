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
  addDocument: (doc: GeneratedDocument) => void;
  deleteDocument: (id: string) => void;
  renameDocument: (id: string, newTitle: string) => void;
  getDocument: (id: string) => GeneratedDocument | undefined;
  addChatMessage: (docId: string, message: ChatMessage) => void;
  getAllChats: () => ChatMessage[];
  evaluations: Evaluation[];
  addEvaluation: (eval_: Evaluation) => void;
  deleteEvaluation: (id: string) => void;
  importedDocuments: ImportedDocument[];
  addImportedDocument: (doc: ImportedDocument) => void;
  deleteImportedDocument: (id: string) => void;
  getImportedDocument: (id: string) => ImportedDocument | undefined;
  addImportedChatMessage: (docId: string, message: ChatMessage) => void;
  getAllDocumentsForEval: () => { id: string; title: string; content: string; depth: string; format: string }[];
}

const DocumentContext = createContext<DocumentContextType | undefined>(undefined);

const DOCS_KEY = "scribeai-documents";
const EVALS_KEY = "scribeai-evaluations";
const IMPORTED_KEY = "scribeai-imported";

const loadDocs = (): GeneratedDocument[] => {
  try {
    const saved = localStorage.getItem(DOCS_KEY);
    if (!saved) return [];
    return JSON.parse(saved).map((d: any) => ({
      ...d,
      createdAt: new Date(d.createdAt),
      chatHistory: (d.chatHistory || []).map((c: any) => ({ ...c, timestamp: new Date(c.timestamp) })),
    }));
  } catch { return []; }
};

const loadEvals = (): Evaluation[] => {
  try {
    const saved = localStorage.getItem(EVALS_KEY);
    if (!saved) return [];
    return JSON.parse(saved).map((e: any) => ({ ...e, createdAt: new Date(e.createdAt), answersContent: e.answersContent || "" }));
  } catch { return []; }
};

const loadImported = (): ImportedDocument[] => {
  try {
    const saved = localStorage.getItem(IMPORTED_KEY);
    if (!saved) return [];
    return JSON.parse(saved).map((d: any) => ({
      ...d,
      createdAt: new Date(d.createdAt),
      chatHistory: (d.chatHistory || []).map((c: any) => ({ ...c, timestamp: new Date(c.timestamp) })),
    }));
  } catch { return []; }
};

export const DocumentProvider = ({ children }: { children: ReactNode }) => {
  const [documents, setDocuments] = useState<GeneratedDocument[]>(loadDocs);
  const [evaluations, setEvaluations] = useState<Evaluation[]>(loadEvals);
  const [importedDocuments, setImportedDocuments] = useState<ImportedDocument[]>(loadImported);

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
      const next = prev.map((d) => d.id === docId ? { ...d, chatHistory: [...d.chatHistory, message] } : d);
      localStorage.setItem(DOCS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const getAllChats = useCallback(() => {
    const genChats = documents.flatMap((d) => d.chatHistory);
    const impChats = importedDocuments.flatMap((d) => d.chatHistory);
    return [...genChats, ...impChats].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [documents, importedDocuments]);

  const addEvaluation = useCallback((eval_: Evaluation) => {
    setEvaluations((prev) => {
      const next = [eval_, ...prev];
      localStorage.setItem(EVALS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const deleteEvaluation = useCallback((id: string) => {
    setEvaluations((prev) => {
      const next = prev.filter((e) => e.id !== id);
      localStorage.setItem(EVALS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const addImportedDocument = useCallback((doc: ImportedDocument) => {
    setImportedDocuments((prev) => {
      const next = [doc, ...prev];
      localStorage.setItem(IMPORTED_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const deleteImportedDocument = useCallback((id: string) => {
    setImportedDocuments((prev) => {
      const next = prev.filter((d) => d.id !== id);
      localStorage.setItem(IMPORTED_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const getImportedDocument = useCallback(
    (id: string) => importedDocuments.find((d) => d.id === id),
    [importedDocuments]
  );

  const addImportedChatMessage = useCallback((docId: string, message: ChatMessage) => {
    setImportedDocuments((prev) => {
      const next = prev.map((d) => d.id === docId ? { ...d, chatHistory: [...d.chatHistory, message] } : d);
      localStorage.setItem(IMPORTED_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

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
      getImportedDocument, addImportedChatMessage, getAllDocumentsForEval,
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
