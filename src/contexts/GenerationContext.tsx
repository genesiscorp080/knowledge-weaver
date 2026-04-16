import { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useDocuments } from "@/contexts/DocumentContext";
import { generateDocumentChunked, estimatePageCount } from "@/lib/ai";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { toast } from "sonner";

export interface GenerationJob {
  id: string;
  topic: string;
  level: string;
  format: string;
  depth: string;
  targetPages: number;
  tableOfContents: string;
  referenceContent?: string;
  status: "queued" | "generating" | "paused" | "completed" | "failed";
  progress: number;
  currentStep: string;
  pagesGenerated: number;
  partialContent: string;
  partialToc: string;
  startTime: number;
  estimatedTimeLeft: string;
  sectionsCompleted: number;
  totalSections: number;
}

interface GenerationContextType {
  jobs: GenerationJob[];
  activeJobs: GenerationJob[];
  queuedJobs: GenerationJob[];
  addJob: (job: Omit<GenerationJob, "id" | "status" | "progress" | "currentStep" | "pagesGenerated" | "partialContent" | "partialToc" | "startTime" | "estimatedTimeLeft" | "sectionsCompleted" | "totalSections">) => string | null;
  cancelJob: (id: string) => void;
  continueJob: (id: string) => void;
  abandonJob: (id: string) => void;
  pausedJobs: GenerationJob[];
  showOverlay: boolean;
  setShowOverlay: (v: boolean) => void;
  overlayJobId: string | null;
  setOverlayJobId: (id: string | null) => void;
  hasActiveGenerations: boolean;
}

const GenerationContext = createContext<GenerationContextType | undefined>(undefined);

const MAX_CONCURRENT = 3;
const MAX_QUEUE = 2;

export const GenerationProvider = ({ children }: { children: ReactNode }) => {
  const [jobs, setJobs] = useState<GenerationJob[]>([]);
  const [showOverlay, setShowOverlay] = useState(false);
  const [overlayJobId, setOverlayJobId] = useState<string | null>(null);
  const { user, profile, recordGeneration, getMaxConcurrent, canGenerate } = useAuth();
  const { addDocument } = useDocuments();
  const { language } = useLanguage();
  const { sendNotification } = useNotifications();
  const processingRef = useRef<Set<string>>(new Set());
  const onlineRef = useRef(navigator.onLine);

  const activeJobs = jobs.filter(j => j.status === "generating");
  const queuedJobs = jobs.filter(j => j.status === "queued");
  const pausedJobs = jobs.filter(j => j.status === "paused");
  const hasActiveGenerations = activeJobs.length > 0 || queuedJobs.length > 0;

  // Listen for online/offline
  useEffect(() => {
    const handleOnline = () => {
      onlineRef.current = true;
      if (pausedJobs.length > 0) {
        toast.info(language === "fr"
          ? "Connexion rétablie. Voulez-vous reprendre les générations en pause ?"
          : "Connection restored. Resume paused generations?");
      }
    };
    const handleOffline = () => {
      onlineRef.current = false;
      // Pause all active jobs
      setJobs(prev => prev.map(j =>
        j.status === "generating" ? { ...j, status: "paused" as const, currentStep: language === "fr" ? "En pause (hors ligne)" : "Paused (offline)" } : j
      ));
    };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [pausedJobs.length, language]);

  const processJob = useCallback(async (job: GenerationJob) => {
    if (processingRef.current.has(job.id)) return;
    processingRef.current.add(job.id);

    const isFr = language === "fr";

    setJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: "generating" as const, startTime: Date.now() } : j));

    try {
      const { toc, content } = await generateDocumentChunked(
        job.topic, job.level, job.format, job.depth,
        job.targetPages, language, job.tableOfContents,
        (progress: number, step: string) => {
          if (!onlineRef.current) throw new Error("OFFLINE");
          
          const estPages = Math.round((progress / 100) * job.targetPages);
          setJobs(prev => prev.map(j => {
            if (j.id !== job.id) return j;
            const elapsed = (Date.now() - j.startTime) / 1000;
            let eta = "";
            if (progress > 5) {
              const totalEst = (elapsed / progress) * 100;
              const remaining = Math.max(0, totalEst - elapsed);
              eta = remaining > 60 ? `~${Math.round(remaining / 60)} min` : `~${Math.round(remaining)}s`;
            }
            return { ...j, progress: Math.min(98, progress), currentStep: step, pagesGenerated: estPages, estimatedTimeLeft: eta };
          }));
        },
        job.referenceContent
      );

      const fullContent = `# ${job.topic}\n\n## ${isFr ? "Table des matières" : "Table of Contents"}\n\n${toc}\n\n---\n\n${content}`;
      const title = job.topic.length > 60 ? job.topic.slice(0, 57) + "..." : job.topic;
      const realPages = estimatePageCount(fullContent);

      const doc = {
        id: crypto.randomUUID(),
        title,
        topic: job.topic,
        format: job.format,
        level: job.level,
        depth: job.depth,
        pages: realPages,
        content: fullContent,
        tableOfContents: toc,
        createdAt: new Date(),
        chatHistory: [],
      };

      await addDocument(doc);
      await recordGeneration();

      setJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: "completed" as const, progress: 100, pagesGenerated: realPages } : j));

      sendNotification(
        isFr ? "Document généré !" : "Document generated!",
        `${title} (${realPages} pages)`
      );

      toast.success(isFr ? `"${title}" généré avec succès !` : `"${title}" generated successfully!`);

      // Remove completed job after a delay
      setTimeout(() => {
        setJobs(prev => prev.filter(j => j.id !== job.id));
      }, 5000);

    } catch (err: any) {
      if (err.message === "OFFLINE") {
        setJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: "paused" as const, currentStep: isFr ? "En pause (hors ligne)" : "Paused (offline)" } : j));
      } else {
        console.error("Generation failed:", err);
        setJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: "failed" as const, currentStep: err.message } : j));
        toast.error(isFr ? "Échec de la génération" : "Generation failed");
        setTimeout(() => {
          setJobs(prev => prev.filter(j => j.id !== job.id));
        }, 10000);
      }
    } finally {
      processingRef.current.delete(job.id);
    }
  }, [language, addDocument, recordGeneration, sendNotification]);

  // Auto-process queued jobs when slots open
  useEffect(() => {
    const maxConcurrent = getMaxConcurrent();
    const currentActive = jobs.filter(j => j.status === "generating").length;
    const queued = jobs.filter(j => j.status === "queued");

    if (currentActive < maxConcurrent && queued.length > 0 && onlineRef.current) {
      const nextJob = queued[0];
      // Don't start encyclopedia if there's already an active generation
      if (nextJob.format === "encyclopedie" && currentActive > 0) return;
      if (nextJob.format !== "encyclopedie" || currentActive === 0) {
        processJob(nextJob);
      }
    }
  }, [jobs, processJob, getMaxConcurrent]);

  const addJob = useCallback((jobInput: Omit<GenerationJob, "id" | "status" | "progress" | "currentStep" | "pagesGenerated" | "partialContent" | "partialToc" | "startTime" | "estimatedTimeLeft" | "sectionsCompleted" | "totalSections">) => {
    if (!canGenerate()) return null;

    const totalActive = jobs.filter(j => ["generating", "queued"].includes(j.status)).length;
    const maxConcurrent = getMaxConcurrent();
    
    if (totalActive >= maxConcurrent + MAX_QUEUE) {
      toast.error(language === "fr" ? "File d'attente pleine" : "Queue is full");
      return null;
    }

    // Encyclopedia can't be simultaneous
    if (jobInput.format === "encyclopedie") {
      const hasActive = jobs.some(j => j.status === "generating");
      if (hasActive) {
        // Queue it
      }
    }

    const newJob: GenerationJob = {
      ...jobInput,
      id: crypto.randomUUID(),
      status: "queued",
      progress: 0,
      currentStep: language === "fr" ? "En attente..." : "Waiting...",
      pagesGenerated: 0,
      partialContent: "",
      partialToc: "",
      startTime: Date.now(),
      estimatedTimeLeft: "",
      sectionsCompleted: 0,
      totalSections: 0,
    };

    setJobs(prev => [...prev, newJob]);
    return newJob.id;
  }, [jobs, canGenerate, getMaxConcurrent, language]);

  const cancelJob = useCallback((id: string) => {
    setJobs(prev => prev.filter(j => j.id !== id));
  }, []);

  const continueJob = useCallback((id: string) => {
    setJobs(prev => prev.map(j => j.id === id ? { ...j, status: "queued" as const } : j));
  }, []);

  const abandonJob = useCallback((id: string) => {
    setJobs(prev => prev.filter(j => j.id !== id));
  }, []);

  return (
    <GenerationContext.Provider value={{
      jobs, activeJobs, queuedJobs, addJob, cancelJob, continueJob, abandonJob, pausedJobs,
      showOverlay, setShowOverlay, overlayJobId, setOverlayJobId, hasActiveGenerations,
    }}>
      {children}
    </GenerationContext.Provider>
  );
};

export const useGeneration = () => {
  const ctx = useContext(GenerationContext);
  if (!ctx) throw new Error("useGeneration must be used within GenerationProvider");
  return ctx;
};
