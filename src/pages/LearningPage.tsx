import { motion } from "framer-motion";
import { TrendingUp, Clock, Target, BookOpen, MessageCircle } from "lucide-react";
import StatusBar from "@/components/StatusBar";
import { useLanguage } from "@/contexts/LanguageContext";
import { useDocuments } from "@/contexts/DocumentContext";

const LearningPage = () => {
  const { t } = useLanguage();
  const { documents, getAllChats } = useDocuments();
  const chats = getAllChats();

  const totalPages = documents.reduce((sum, d) => sum + d.pages, 0);
  const topics = [...new Set(documents.map(d => d.topic))];

  const stats = [
    { label: t("learning.docsCreated"), value: String(documents.length), icon: BookOpen, color: "bg-primary/10 text-primary" },
    { label: t("learning.pagesGenerated"), value: String(totalPages), icon: Target, color: "bg-accent/15 text-accent-foreground" },
    { label: t("learning.timeSaved"), value: `~${Math.round(documents.length * 2.8)}h`, icon: Clock, color: "bg-primary/10 text-primary" },
    { label: t("learning.topicsExplored"), value: String(topics.length), icon: TrendingUp, color: "bg-accent/15 text-accent-foreground" },
  ];

  return (
    <div className="mobile-container">
      <StatusBar title={t("learning.title")} />
      <div className="page-content space-y-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="pt-2">
          <h2 className="font-display text-2xl font-bold">{t("learning.subtitle")}</h2>
          <p className="text-sm text-muted-foreground mt-1">{t("learning.subtitleDesc")}</p>
        </motion.div>

        <div className="grid grid-cols-2 gap-3">
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="glass-card p-4 hover:shadow-md transition-shadow">
                <div className={`rounded-xl p-2 w-fit ${stat.color}`}><Icon size={16} /></div>
                <p className="font-display text-2xl font-bold mt-2">{stat.value}</p>
                <p className="text-[11px] text-muted-foreground font-medium">{stat.label}</p>
              </motion.div>
            );
          })}
        </div>

        {topics.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <h3 className="section-title mb-3">{t("learning.recentTopics")}</h3>
            <div className="flex flex-wrap gap-2">
              {topics.slice(0, 8).map((topic) => (
                <span key={topic} className="chip chip-inactive">{topic.length > 25 ? topic.slice(0, 22) + "..." : topic}</span>
              ))}
            </div>
          </motion.div>
        )}

        {/* Chat History */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <h3 className="section-title mb-3">{t("learning.chatHistory")}</h3>
          {chats.length > 0 ? (
            <div className="space-y-2">
              {chats.slice(0, 10).map((chat) => (
                <div key={chat.id} className="glass-card p-3 flex items-start gap-3">
                  <div className={`rounded-lg p-1.5 shrink-0 ${chat.role === "user" ? "bg-primary/10" : "bg-accent/15"}`}>
                    <MessageCircle size={14} className={chat.role === "user" ? "text-primary" : "text-accent-foreground"} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground font-medium">{chat.documentTitle}</p>
                    <p className="text-sm truncate mt-0.5">{chat.content}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="glass-card p-6 text-center">
              <MessageCircle size={24} className="mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-xs text-muted-foreground">{t("learning.noChats")}</p>
              <p className="text-[10px] text-muted-foreground/70 mt-1">{t("learning.noChatsDesc")}</p>
            </div>
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-5">
          <h3 className="section-title mb-2">{t("learning.tipTitle")}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{t("learning.tipContent")}</p>
        </motion.div>
      </div>
    </div>
  );
};

export default LearningPage;
