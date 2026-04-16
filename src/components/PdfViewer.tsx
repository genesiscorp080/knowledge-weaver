import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Search, X, ChevronLeft, ChevronRight, Highlighter, List, ScrollText } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import ReactMarkdown from "react-markdown";

interface Highlight {
  id: string;
  text: string;
  pageIndex: number;
  color: string;
}

interface PdfViewerProps {
  content: string;
  title: string;
  highlights?: Highlight[];
  onAddHighlight?: (highlight: Omit<Highlight, "id">) => void;
  onRemoveHighlight?: (id: string) => void;
}

function splitContentToPages(content: string, linesPerPage = 45): string[] {
  const lines = content.split("\n");
  const pages: string[] = [];
  let current: string[] = [];
  let lineCount = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    const extraLines = trimmed.startsWith("#") ? 3 : trimmed === "" ? 0.5 : Math.max(1, Math.ceil(trimmed.length / 80));
    
    if (lineCount + extraLines > linesPerPage && current.length > 0) {
      pages.push(current.join("\n"));
      current = [line];
      lineCount = extraLines;
    } else {
      current.push(line);
      lineCount += extraLines;
    }
  }
  if (current.length > 0) pages.push(current.join("\n"));
  return pages.length > 0 ? pages : [""];
}

const PdfViewer = ({ content, title, highlights = [], onAddHighlight, onRemoveHighlight }: PdfViewerProps) => {
  const { language } = useLanguage();
  const isFr = language === "fr";
  const [currentPage, setCurrentPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [highlightMode, setHighlightMode] = useState(false);
  const [searchResults, setSearchResults] = useState<number[]>([]);
  const [currentSearchIdx, setCurrentSearchIdx] = useState(0);
  const [viewMode, setViewMode] = useState<"page" | "scroll">("page");
  const contentRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const pages = useMemo(() => splitContentToPages(content), [content]);
  const totalPages = pages.length;

  // Search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const q = searchQuery.toLowerCase();
    const results: number[] = [];
    pages.forEach((page, i) => {
      if (page.toLowerCase().includes(q)) results.push(i);
    });
    setSearchResults(results);
    setCurrentSearchIdx(0);
    if (results.length > 0) setCurrentPage(results[0]);
  }, [searchQuery, pages]);

  const goToNextResult = () => {
    if (searchResults.length === 0) return;
    const next = (currentSearchIdx + 1) % searchResults.length;
    setCurrentSearchIdx(next);
    setCurrentPage(searchResults[next]);
  };

  const goToPrevResult = () => {
    if (searchResults.length === 0) return;
    const prev = (currentSearchIdx - 1 + searchResults.length) % searchResults.length;
    setCurrentSearchIdx(prev);
    setCurrentPage(searchResults[prev]);
  };

  // Text selection for highlighting
  const handleTextSelect = useCallback(() => {
    if (!highlightMode || !onAddHighlight) return;
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;
    const text = selection.toString().trim();
    if (text.length < 2) return;

    onAddHighlight({
      text,
      pageIndex: currentPage,
      color: "yellow",
    });
    selection.removeAllRanges();
  }, [highlightMode, currentPage, onAddHighlight]);

  const pageHighlightsForCurrent = highlights.filter(h => h.pageIndex === currentPage);

  const proseClasses = `prose prose-sm max-w-none text-gray-900 dark:text-foreground 
    prose-headings:font-display prose-headings:text-gray-900 dark:prose-headings:text-foreground
    prose-p:text-gray-700 dark:prose-p:text-muted-foreground
    prose-p:leading-relaxed prose-p:text-justify
    prose-h1:text-center prose-h1:text-xl prose-h1:underline prose-h1:decoration-primary
    prose-h2:text-center prose-h2:text-lg prose-h2:underline prose-h2:decoration-primary/60
    prose-h3:text-base prose-h3:underline prose-h3:decoration-primary/40
    leading-[1.8]`;

  return (
    <div className="flex flex-col h-full bg-muted/30">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 bg-card border-b border-border shrink-0">
        {searchOpen ? (
          <div className="flex items-center gap-2 flex-1">
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isFr ? "Rechercher..." : "Search..."}
              className="input-field h-8 flex-1 text-xs"
              autoFocus
            />
            {searchResults.length > 0 && (
              <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                {currentSearchIdx + 1}/{searchResults.length}
              </span>
            )}
            <button onClick={goToPrevResult} className="p-1"><ChevronLeft size={14} /></button>
            <button onClick={goToNextResult} className="p-1"><ChevronRight size={14} /></button>
            <button onClick={() => { setSearchOpen(false); setSearchQuery(""); }} className="p-1"><X size={14} /></button>
          </div>
        ) : (
          <>
            <button onClick={() => setSearchOpen(true)} className="p-1.5 hover:bg-secondary rounded-lg">
              <Search size={16} className="text-muted-foreground" />
            </button>
            {onAddHighlight && (
              <button
                onClick={() => setHighlightMode(!highlightMode)}
                className={`p-1.5 rounded-lg transition-colors ${highlightMode ? "bg-yellow-200 dark:bg-yellow-800" : "hover:bg-secondary"}`}
              >
                <Highlighter size={16} className={highlightMode ? "text-yellow-800 dark:text-yellow-200" : "text-muted-foreground"} />
              </button>
            )}
            <button
              onClick={() => setViewMode(viewMode === "page" ? "scroll" : "page")}
              className="p-1.5 hover:bg-secondary rounded-lg"
              title={viewMode === "page" ? (isFr ? "Mode défilement" : "Scroll mode") : (isFr ? "Mode page" : "Page mode")}
            >
              {viewMode === "page" ? <ScrollText size={16} className="text-muted-foreground" /> : <List size={16} className="text-muted-foreground" />}
            </button>
            <div className="flex-1" />
            <span className="text-xs text-muted-foreground">
              {viewMode === "page" ? `${currentPage + 1} / ${totalPages}` : `${totalPages} pages`}
            </span>
          </>
        )}
      </div>

      {/* Content area */}
      {viewMode === "page" ? (
        <>
          <div className="flex-1 overflow-y-auto p-4" onMouseUp={handleTextSelect}>
            <div className="max-w-[600px] mx-auto">
              <motion.div
                key={currentPage}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white dark:bg-card shadow-lg rounded-sm min-h-[700px] p-8 relative"
                ref={contentRef}
              >
                {pageHighlightsForCurrent.length > 0 && (
                  <div className="absolute top-2 right-2 flex gap-1">
                    {pageHighlightsForCurrent.map(h => (
                      <button
                        key={h.id}
                        onClick={() => onRemoveHighlight?.(h.id)}
                        className="w-3 h-3 rounded-full bg-yellow-300 border border-yellow-500 hover:bg-red-300 transition-colors"
                        title={isFr ? "Retirer le surlignage" : "Remove highlight"}
                      />
                    ))}
                  </div>
                )}
                <div className={proseClasses}>
                  <ReactMarkdown>{pages[currentPage]}</ReactMarkdown>
                </div>
                <div className="absolute bottom-4 left-0 right-0 text-center">
                  <span className="text-xs text-gray-400">{currentPage + 1}</span>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Page navigation */}
          <div className="flex items-center justify-center gap-4 py-3 bg-card border-t border-border shrink-0">
            <button onClick={() => setCurrentPage(p => Math.max(0, p - 1))} disabled={currentPage === 0} className="p-2 hover:bg-secondary rounded-lg disabled:opacity-30">
              <ChevronLeft size={20} />
            </button>
            <div className="flex items-center gap-2">
              <input type="number" min={1} max={totalPages} value={currentPage + 1}
                onChange={(e) => setCurrentPage(Math.max(0, Math.min(totalPages - 1, Number(e.target.value) - 1)))}
                className="w-12 h-8 text-center text-sm bg-secondary rounded-lg border-0" />
              <span className="text-sm text-muted-foreground">/ {totalPages}</span>
            </div>
            <button onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))} disabled={currentPage >= totalPages - 1} className="p-2 hover:bg-secondary rounded-lg disabled:opacity-30">
              <ChevronRight size={20} />
            </button>
          </div>
        </>
      ) : (
        /* Scroll mode */
        <div className="flex-1 overflow-y-auto p-4" ref={scrollContainerRef} onMouseUp={handleTextSelect}>
          <div className="max-w-[600px] mx-auto space-y-6">
            {pages.map((pageContent, idx) => (
              <div key={idx} className="bg-white dark:bg-card shadow-lg rounded-sm min-h-[500px] p-8 relative">
                <div className={proseClasses}>
                  <ReactMarkdown>{pageContent}</ReactMarkdown>
                </div>
                <div className="mt-6 pt-3 border-t border-gray-200 dark:border-border/30 text-center">
                  <span className="text-xs text-gray-400">{idx + 1} / {totalPages}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PdfViewer;
