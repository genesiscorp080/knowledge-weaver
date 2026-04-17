import { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useDocuments } from "@/contexts/DocumentContext";
import { generateDocumentChunked, estimatePageCount, checkTopicAppropriate } from "@/lib/ai";
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
  status: "queued" | "moderating" | "generating" | "paused" | "completed" | "failed";
  progress: number;
  currentStep: string;
  pagesGenerated: number;
  partialContent: string;
  partialToc: string;
  startTime: number;
  estimatedTimeLeft: string;
  sectionsCompleted: number;
  totalSections: number;
  // Resume state
  nextSectionIdx: number;
}

interface GenerationContextType {
  jobs: GenerationJob[];
  activeJobs: GenerationJob[];
  queuedJobs: GenerationJob[];
  addJob: (job: Omit<GenerationJob, "id" | "status" | "progress" | "currentStep" | "pagesGenerated" | "partialContent" | "partialToc" | "startTime" | "estimatedTimeLeft" | "sectionsCompleted" | "totalSections" | "nextSectionIdx">) => Promise<string | null>;
  cancelJob: (id: string) => void;
  continueJob: (id: string) => void;
  abandonJob: (id: string) => void;
  pauseJob: (id: string) => void;
  resumeJob: (id: string) => void;
  pausedJobs: GenerationJob[];
  showOverlay: boolean;
  setShowOverlay: (v: boolean) => void;
  overlayJobId: string | null;
  setOverlayJobId: (id: string | null) => void;
  hasActiveGenerations: boolean;
}

const GenerationContext = createContext<GenerationContextType | undefined>(undefined);

const MAX_QUEUE = 5;

export const GenerationProvider = ({ children }: { children: ReactNode }) => {
  const [jobs, setJobs] = useState<GenerationJob[]>([]);
  const [showOverlay, setShowOverlay] = useState(false);
  const [overlayJobId, setOverlayJobId] = useState<string | null>(null);
  const { profile, recordGeneration, getMaxConcurrent, canGenerate } = useAuth();
  const { addDocument } = useDocuments();
  const { language } = useLanguage();
  const { sendNotification } = useNotifications();
  const processingRef = useRef<Set<string>>(new Set());
  const onlineRef = useRef(navigator.onLine);
  // Manual pause requests — checked in the progress callback to halt cleanly
  const pauseRequestedRef = useRef<Set<string>>(new Set());
  // Keep latest resume state per job (toc, content, nextSectionIdx)
  const resumeStateRef = useRef<Map<string, { toc: string; content: string; nextSectionIdx: number }>>(new Map());

  const activeJobs = jobs.filter(j => j.status === "generating");
  const queuedJobs = jobs.filter(j => j.status === "queued" || j.status === "moderating");
  const pausedJobs = jobs.filter(j => j.status === "paused");
  const hasActiveGenerations = activeJobs.length > 0 || queuedJobs.length > 0;

  // Online/offline handlers — pause active jobs when offline
  useEffect(() => {
    const handleOnline = () => {
      onlineRef.current = true;
      // Auto-resume paused-by-offline jobs
      setJobs(prev => prev.map(j =>
        j.status === "paused" && j.currentStep.toLowerCase().includes(language === "fr" ? "hors ligne" : "offline")
          ? { ...j, status: "queued" as const, currentStep: language === "fr" ? "Reprise..." : "Resuming..." }
          : j
      ));
      toast.info(language === "fr" ? "Connexion rétablie" : "Connection restored");
    };
    const handleOffline = () => {
      onlineRef.current = false;
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
  }, [language]);

  const processJob = useCallback(async (job: GenerationJob) => {
    if (processingRef.current.has(job.id)) return;
    processingRef.current.add(job.id);

    const isFr = language === "fr";

    // Mark generating + reset start time only if no resume state exists (for accurate ETA on fresh start)
    const hasResume = resumeStateRef.current.has(job.id);
    setJobs(prev => prev.map(j => j.id === job.id ? {
      ...j,
      status: "generating" as const,
      startTime: hasResume ? j.startTime : Date.now(),
    } : j));

    try {
      const resumeState = resumeStateRef.current.get(job.id);

      const { toc, content } = await generateDocumentChunked(
        job.topic, job.level, job.format, job.depth,
        job.targetPages, language, job.tableOfContents,
        (progress, step, partial) => {
          if (!onlineRef.current) throw new Error("OFFLINE");
          if (pauseRequestedRef.current.has(job.id)) throw new Error("PAUSED_MANUAL");

          // Persist resume state continuously
          if (partial.toc !== undefined || partial.content !== undefined) {
            const prev = resumeStateRef.current.get(job.id) || { toc: "", content: "", nextSectionIdx: 0 };
            resumeStateRef.current.set(job.id, {
              toc: partial.toc ?? prev.toc,
              content: partial.content ?? prev.content,
              nextSectionIdx: partial.sectionIdx ?? prev.nextSectionIdx,
            });
          }

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
            return {
              ...j,
              progress: Math.min(98, progress),
              currentStep: step,
              pagesGenerated: estPages,
              estimatedTimeLeft: eta,
              sectionsCompleted: partial.sectionIdx ?? j.sectionsCompleted,
              totalSections: partial.totalSections ?? j.totalSections,
              partialToc: partial.toc ?? j.partialToc,
              partialContent: partial.content ?? j.partialContent,
            };
          }));
        },
        job.referenceContent,
        resumeState
      );

      // Clear resume state on success
      resumeStateRef.current.delete(job.id);

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

      setTimeout(() => {
        setJobs(prev => prev.filter(j => j.id !== job.id));
      }, 5000);

    } catch (err: any) {
      const msg = err?.message || "";
      // RESUMABLE error from ai.ts carries resume state
      if (err?.resumeState) {
        resumeStateRef.current.set(job.id, err.resumeState);
      }
      if (msg === "OFFLINE" || msg === "RESUMABLE" || /network|fetch/i.test(msg)) {
        setJobs(prev => prev.map(j => j.id === job.id ? {
          ...j,
          status: "paused" as const,
          currentStep: isFr ? "En pause (hors ligne) - reprendra automatiquement" : "Paused (offline) - will resume automatically",
        } : j));
      } else {
        console.error("Generation failed:", err);
        setJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: "failed" as const, currentStep: msg } : j));
        toast.error(isFr ? "Échec de la génération" : "Generation failed");
        setTimeout(() => {
          setJobs(prev => prev.filter(j => j.id !== job.id));
          resumeStateRef.current.delete(job.id);
        }, 10000);
      }
    } finally {
      processingRef.current.delete(job.id);
    }
  }, [language, addDocument, recordGeneration, sendNotification]);

  // Smart scheduler: pick the queued job with the SHORTEST estimated time remaining
  // (smaller targetPages = shorter). Encyclopedias only run alone.
  useEffect(() => {
    const maxConcurrent = getMaxConcurrent();
    const currentActive = jobs.filter(j => j.status === "generating").length;
    const queued = jobs.filter(j => j.status === "queued");
    if (queued.length === 0 || !onlineRef.current) return;
    if (currentActive >= maxConcurrent) return;

    // Sort queue by shortest job first (SJF — Shortest Job First scheduling)
    const sortedQueue = [...queued].sort((a, b) => {
      // Resume jobs (with partial content) bubble up — give them priority to finish
      const aResume = resumeStateRef.current.get(a.id)?.nextSectionIdx || 0;
      const bResume = resumeStateRef.current.get(b.id)?.nextSectionIdx || 0;
      const aRemaining = a.targetPages * (1 - (aResume / Math.max(1, a.totalSections || 5)));
      const bRemaining = b.targetPages * (1 - (bResume / Math.max(1, b.totalSections || 5)));
      return aRemaining - bRemaining;
    });

    for (const nextJob of sortedQueue) {
      if (currentActive >= maxConcurrent) break;
      // Encyclopedia: only run if NO other generation is active AND it's the only thing
      if (nextJob.format === "encyclopedie") {
        if (currentActive > 0) continue; // skip — let smaller jobs run first
        processJob(nextJob);
        return;
      }
      // Skip if there's an encyclopedia currently generating
      const hasActiveEncyclopedia = jobs.some(j => j.status === "generating" && j.format === "encyclopedie");
      if (hasActiveEncyclopedia) continue;
      processJob(nextJob);
      return; // Trigger one at a time; effect will re-run when state updates
    }
  }, [jobs, processJob, getMaxConcurrent]);

  const addJob = useCallback(async (jobInput: Omit<GenerationJob, "id" | "status" | "progress" | "currentStep" | "pagesGenerated" | "partialContent" | "partialToc" | "startTime" | "estimatedTimeLeft" | "sectionsCompleted" | "totalSections" | "nextSectionIdx">) => {
    if (!canGenerate()) return null;

    const totalActive = jobs.filter(j => ["generating", "queued", "moderating", "paused"].includes(j.status)).length;
    const maxConcurrent = getMaxConcurrent();

    if (totalActive >= maxConcurrent + MAX_QUEUE) {
      toast.error(language === "fr" ? "File d'attente pleine" : "Queue is full");
      return null;
    }

    const isFr = language === "fr";
    const newJob: GenerationJob = {
      ...jobInput,
      id: crypto.randomUUID(),
      status: "moderating",
      progress: 0,
      currentStep: isFr ? "Vérification du sujet..." : "Checking topic...",
      pagesGenerated: 0,
      partialContent: "",
      partialToc: "",
      startTime: Date.now(),
      estimatedTimeLeft: "",
      sectionsCompleted: 0,
      totalSections: 0,
      nextSectionIdx: 0,
    };

    setJobs(prev => [...prev, newJob]);

    // Run topic moderation asynchronously (non-blocking for the UI flow)
    (async () => {
      try {
        const check = await checkTopicAppropriate(jobInput.topic, language);
        if (!check.ok) {
          toast.error(check.reason);
          setJobs(prev => prev.filter(j => j.id !== newJob.id));
          return;
        }
        // Approve → enqueue
        setJobs(prev => prev.map(j => j.id === newJob.id ? {
          ...j,
          status: "queued" as const,
          currentStep: isFr ? "En attente..." : "Waiting...",
        } : j));
      } catch {
        // On moderation failure, allow the job
        setJobs(prev => prev.map(j => j.id === newJob.id ? {
          ...j,
          status: "queued" as const,
          currentStep: isFr ? "En attente..." : "Waiting...",
        } : j));
      }
    })();

    return newJob.id;
  }, [jobs, canGenerate, getMaxConcurrent, language]);

  const cancelJob = useCallback((id: string) => {
    resumeStateRef.current.delete(id);
    setJobs(prev => prev.filter(j => j.id !== id));
  }, []);

  const continueJob = useCallback((id: string) => {
    setJobs(prev => prev.map(j => j.id === id ? { ...j, status: "queued" as const } : j));
  }, []);

  const abandonJob = useCallback((id: string) => {
    resumeStateRef.current.delete(id);
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
