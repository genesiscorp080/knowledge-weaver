import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ChevronDown, Mail, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import StatusBar from "@/components/StatusBar";
import { useLanguage } from "@/contexts/LanguageContext";

const HelpFaqPage = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const isFr = language === "fr";
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs = isFr ? [
    { q: "Comment générer un document ?", a: "Allez sur l'accueil, entrez un sujet, choisissez un niveau, une profondeur et un format, puis cliquez sur 'Générer'. Le document sera automatiquement sauvegardé dans votre bibliothèque." },
    { q: "Combien de documents puis-je générer gratuitement ?", a: "En version gratuite, vous pouvez générer 1 document par semaine et poser 5 questions par jour à l'IA. Pour un accès illimité, souscrivez à l'abonnement VIP." },
    { q: "Comment fonctionne l'abonnement VIP ?", a: "L'abonnement VIP vous donne un accès illimité à la génération de documents et aux questions IA. Deux options : 500 FCFA/an ou 2000 FCFA à vie. Le paiement se fait via Orange Money ou Mobile Money." },
    { q: "Comment importer un document PDF ?", a: "Allez dans l'onglet 'Imports', cliquez sur 'Importer un PDF' et sélectionnez votre fichier. L'application vérifiera que le contenu est lisible et conforme à nos conditions." },
    { q: "Puis-je poser des questions sur un document importé ?", a: "Oui ! Ouvrez un document importé et utilisez le chat IA pour poser des questions. L'IA répondra exclusivement en se basant sur le contenu du document." },
    { q: "Comment télécharger un document en PDF ?", a: "Dans la bibliothèque, cliquez sur les trois points du document puis sélectionnez 'Télécharger'. Vous pouvez aussi télécharger depuis le lecteur de document." },
    { q: "Quels types de contenu sont interdits ?", a: "Les contenus à caractère érotique, politique partisan, ou tout contenu contraire aux bonnes mœurs sont automatiquement filtrés et interdits." },
    { q: "Comment changer de langue ?", a: "Allez dans les Réglages et cliquez sur 'Langue' pour basculer entre le français et l'anglais." },
    { q: "Comment générer une évaluation ?", a: "Allez dans l'onglet 'Évaluer', sélectionnez un document, configurez les options (type de questions, nombre, ratio QCM/QRO) puis cliquez sur 'Générer'. Un fichier de réponses sera automatiquement créé." },
    { q: "Mes données sont-elles sécurisées ?", a: "Oui, vos données sont stockées de manière sécurisée. Nous ne partageons aucune donnée personnelle avec des tiers. Consultez notre politique de confidentialité pour plus de détails." },
  ] : [
    { q: "How do I generate a document?", a: "Go to the home page, enter a topic, choose a level, depth, and format, then click 'Generate'. The document will be automatically saved to your library." },
    { q: "How many documents can I generate for free?", a: "With the free version, you can generate 1 document per week and ask 5 questions per day to the AI. For unlimited access, subscribe to the VIP plan." },
    { q: "How does the VIP subscription work?", a: "The VIP subscription gives you unlimited document generation and AI questions. Two options: 500 FCFA/year or 2000 FCFA lifetime. Payment via Orange Money or Mobile Money." },
    { q: "How do I import a PDF document?", a: "Go to the 'Imports' tab, click 'Import a PDF' and select your file. The app will verify that the content is readable and compliant." },
    { q: "Can I ask questions about an imported document?", a: "Yes! Open an imported document and use the AI chat to ask questions. The AI will answer exclusively based on the document content." },
    { q: "How do I download a document as PDF?", a: "In the library, click the three dots on the document then select 'Download'. You can also download from the document viewer." },
    { q: "What types of content are forbidden?", a: "Content of an erotic or partisan political nature, or any content contrary to public morals is automatically filtered and prohibited." },
    { q: "How do I change the language?", a: "Go to Settings and click 'Language' to switch between French and English." },
    { q: "How do I generate an evaluation?", a: "Go to the 'Evaluate' tab, select a document, configure options (question type, count, MCQ/OEQ ratio) then click 'Generate'. An answer key will be automatically created." },
    { q: "Is my data secure?", a: "Yes, your data is stored securely. We do not share any personal data with third parties. See our privacy policy for more details." },
  ];

  return (
    <div className="mobile-container">
      <div className="fixed top-0 left-0 right-0 z-50">
        <div className="max-w-md mx-auto bg-background/90 backdrop-blur-2xl border-b border-border/50">
          <div className="flex items-center gap-3 px-4 py-3">
            <button onClick={() => navigate(-1)} className="p-1"><ArrowLeft size={20} className="text-foreground" /></button>
            <h1 className="font-display text-sm font-semibold">{isFr ? "Aide & FAQ" : "Help & FAQ"}</h1>
          </div>
        </div>
      </div>

      <div className="pt-16 pb-24 px-5 space-y-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="pt-2">
          <h2 className="font-display text-2xl font-bold">{isFr ? "Questions fréquentes" : "Frequently Asked Questions"}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {isFr ? "Trouvez rapidement des réponses à vos questions" : "Quickly find answers to your questions"}
          </p>
        </motion.div>

        <div className="space-y-2">
          {faqs.map((faq, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              className="glass-card overflow-hidden">
              <button onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-left">
                <span className="text-sm font-semibold flex-1">{faq.q}</span>
                <ChevronDown size={16} className={`text-muted-foreground transition-transform shrink-0 ${openIndex === i ? "rotate-180" : ""}`} />
              </button>
              <AnimatePresence>
                {openIndex === i && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <p className="px-4 pb-4 text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>

        {/* Contact */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="glass-card p-5 space-y-3">
          <h3 className="font-display font-semibold">{isFr ? "Besoin d'aide supplémentaire ?" : "Need more help?"}</h3>
          <p className="text-sm text-muted-foreground">
            {isFr ? "Contactez-nous par email pour toute question" : "Contact us by email for any questions"}
          </p>
          <div className="flex items-center gap-2 text-primary">
            <Mail size={16} />
            <a href="mailto:genesiscorp080@gmail.com" className="text-sm font-medium">genesiscorp080@gmail.com</a>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default HelpFaqPage;
