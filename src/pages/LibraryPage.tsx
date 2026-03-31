import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Trash2, Pencil, FileText, BookOpen, GraduationCap, BookMarked, Check, X } from "lucide-react";
import StatusBar from "@/components/StatusBar";

interface Document {
  id: string;
  title: string;
  format: string;
  level: string;
  pages: number;
  createdAt: Date;
}

const formatIcons: Record<string, typeof FileText> = {
  article: FileText,
  support: BookMarked,
  cours: GraduationCap,
  livre: BookOpen,
};

const formatColors: Record<string, string> = {
  article: "bg-primary/10 text-primary",
  support: "bg-accent/15 text-accent-foreground",
  cours: "bg-primary/10 text-primary",
  livre: "bg-accent/15 text-accent-foreground",
};

// Mock data for demo
const mockDocs: Document[] = [
  { id: "1", title: "La photosynthèse expliquée", format: "cours", level: "Lycée", pages: 45, createdAt: new Date(2025, 2, 28) },
  { id: "2", title: "Introduction à l'algèbre linéaire", format: "livre", level: "Licence", pages: 180, createdAt: new Date(2025, 2, 25) },
  { id: "3", title: "Les bases du machine learning", format: "article", level: "Ingénieur", pages: 18, createdAt: new Date(2025, 2, 20) },
];

const LibraryPage = () => {
  const [docs, setDocs] = useState<Document[]>(mockDocs);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const filteredDocs = docs.filter(d =>
    d.title.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = (id: string) => {
    setDocs(docs.filter(d => d.id !== id));
  };

  const handleRename = (id: string) => {
    setDocs(docs.map(d => d.id === id ? { ...d, title: editTitle } : d));
    setEditingId(null);
  };

  const startEdit = (doc: Document) => {
    setEditingId(doc.id);
    setEditTitle(doc.title);
  };

  return (
    <div className="mobile-container">
      <StatusBar title="Bibliothèque" />
      <div className="page-content space-y-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="pt-2"
        >
          <div className="relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un document..."
              className="input-field w-full pl-10"
            />
          </div>
        </motion.div>

        <p className="text-xs text-muted-foreground font-medium">
          {filteredDocs.length} document{filteredDocs.length > 1 ? "s" : ""}
        </p>

        <div className="space-y-3">
          <AnimatePresence>
            {filteredDocs.map((doc, i) => {
              const Icon = formatIcons[doc.format] || FileText;
              return (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ delay: i * 0.05 }}
                  className="glass-card p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className={`rounded-xl p-2.5 ${formatColors[doc.format] || "bg-secondary"}`}>
                      <Icon size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      {editingId === doc.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="input-field flex-1 h-8 text-sm"
                            autoFocus
                          />
                          <button onClick={() => handleRename(doc.id)} className="text-primary">
                            <Check size={16} />
                          </button>
                          <button onClick={() => setEditingId(null)} className="text-muted-foreground">
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <p className="text-sm font-semibold truncate">{doc.title}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="chip chip-inactive text-[10px] py-0.5 px-2">{doc.format}</span>
                        <span className="text-[10px] text-muted-foreground">{doc.level}</span>
                        <span className="text-[10px] text-muted-foreground">·</span>
                        <span className="text-[10px] text-muted-foreground">{doc.pages} pages</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => startEdit(doc)}
                        className="p-2 rounded-lg hover:bg-secondary transition-colors"
                      >
                        <Pencil size={14} className="text-muted-foreground" />
                      </button>
                      <button
                        onClick={() => handleDelete(doc.id)}
                        className="p-2 rounded-lg hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 size={14} className="text-destructive" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {filteredDocs.length === 0 && (
            <div className="text-center py-12">
              <BookOpen size={40} className="mx-auto text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground mt-3">Aucun document trouvé</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LibraryPage;
