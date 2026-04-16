import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Moon, Sun, Globe, Bell, BellOff, HelpCircle, LogOut, ChevronRight, FileText, Shield, Crown, X, Lock, Mail, Heart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import StatusBar from "@/components/StatusBar";
import { useThemeContext } from "@/contexts/ThemeContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { useAuth } from "@/contexts/AuthContext";
import { Switch } from "@/components/ui/switch";
import ReactMarkdown from "react-markdown";

const SettingsPage = () => {
  const { theme, toggleTheme } = useThemeContext();
  const { language, setLanguage, t } = useLanguage();
  const { notificationsEnabled, setNotificationsEnabled } = useNotifications();
  const { profile, signOut, isVip } = useAuth();
  const navigate = useNavigate();
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showDonation, setShowDonation] = useState(false);
  const isFr = language === "fr";

  const settingsGroups = [
    {
      title: t("settings.general"),
      items: [
        { icon: User, label: t("settings.profile"), desc: profile?.name || t("settings.profileDesc"), action: () => navigate("/profile") },
        { icon: Globe, label: t("settings.language"), desc: language === "fr" ? t("settings.languageFr") : t("settings.languageEn"), action: () => setLanguage(language === "fr" ? "en" : "fr") },
        { icon: theme === "dark" ? Sun : Moon, label: t("settings.appearance"), desc: theme === "dark" ? t("settings.dark") : t("settings.light"), action: toggleTheme },
      ],
    },
    {
      title: t("settings.account"),
      items: [
        { icon: Mail, label: t("settings.email"), desc: profile?.email || "", action: undefined },
        { icon: Lock, label: t("settings.changePassword"), desc: "", action: undefined },
        { icon: Crown, label: t("settings.vip"), desc: isVip ? "VIP ✓" : t("settings.vipFree"), action: () => navigate("/vip"), highlight: !isVip },
      ],
    },
    {
      title: t("settings.notifications"),
      items: [
        { icon: notificationsEnabled ? Bell : BellOff, label: t("settings.notificationsLabel"), desc: notificationsEnabled ? t("settings.enabled") : t("settings.disabled"), action: () => setNotificationsEnabled(!notificationsEnabled), hasSwitch: true, switchValue: notificationsEnabled },
      ],
    },
    {
      title: t("settings.legal"),
      items: [
        { icon: FileText, label: t("settings.terms"), desc: t("settings.termsDesc"), action: () => setShowTerms(true) },
        { icon: Shield, label: t("settings.privacy"), desc: t("settings.privacyDesc"), action: () => setShowPrivacy(true) },
      ],
    },
    {
      title: isFr ? "Soutenir" : "Support",
      items: [
        { icon: Heart, label: isFr ? "Faire un don" : "Make a donation", desc: isFr ? "Soutenez le développement de Prisca" : "Support Prisca's development", action: () => setShowDonation(true) },
      ],
    },
    {
      title: t("settings.help"),
      items: [
        { icon: HelpCircle, label: t("settings.helpFaq"), desc: "", action: () => navigate("/help") },
        { icon: LogOut, label: t("settings.logout"), desc: "", destructive: true, action: () => signOut() },
      ],
    },
  ];

  const termsContent = isFr ? `# Conditions Générales d'Utilisation

**Application Prisca — Dernière mise à jour : Avril 2026**

---

## Préambule

Les présentes Conditions Générales d'Utilisation (ci-après « CGU ») régissent l'utilisation de l'application Prisca (ci-après « l'Application »), éditée par Genesis. En accédant ou en utilisant l'Application, vous acceptez sans réserve l'intégralité des présentes CGU.

## Article 1 — Définitions

- **Application** : désigne l'application mobile et web Prisca, accessible via navigateur ou téléchargement.
- **Utilisateur** : toute personne physique utilisant l'Application.
- **Contenu Généré** : tout document, évaluation ou texte produit par l'intelligence artificielle intégrée à l'Application.
- **Service** : l'ensemble des fonctionnalités proposées par l'Application.

## Article 2 — Objet

L'Application Prisca a pour objet de fournir un service de génération automatique de documents éducatifs, de supports pédagogiques, d'évaluations et de contenus d'apprentissage à l'aide de technologies d'intelligence artificielle.

## Article 3 — Accès au Service

L'accès à l'Application nécessite la création d'un compte. En version gratuite, l'Utilisateur peut générer 1 document par semaine et poser 5 questions à l'IA par jour. L'abonnement VIP (500 FCFA/an ou 2 000 FCFA à vie) permet un accès illimité.

## Article 4 — Utilisation Acceptable

L'Utilisateur s'engage à :
- Utiliser l'Application conformément à sa destination éducative ;
- Ne pas générer de contenu à caractère illicite, diffamatoire, discriminatoire, pornographique ou incitant à la haine ;
- Ne pas tenter de contourner les filtres de modération de contenu ;
- Ne pas utiliser l'Application à des fins commerciales sans autorisation préalable ;
- Respecter les droits de propriété intellectuelle de tiers.

## Article 5 — Propriété Intellectuelle

### 5.1 Application
L'Application, son code source, son design, ses algorithmes et sa marque sont la propriété exclusive de Genesis. Toute reproduction non autorisée est interdite.

### 5.2 Contenu Généré
Le Contenu Généré par l'IA est mis à disposition de l'Utilisateur pour un usage personnel et éducatif. L'Utilisateur reconnaît que ce contenu est produit par intelligence artificielle et ne constitue en aucun cas un avis professionnel, médical, juridique ou scientifique certifié.

## Article 6 — Limitation de Responsabilité

- L'Application est fournie « en l'état », sans garantie d'exactitude, d'exhaustivité ou de pertinence du Contenu Généré.
- Genesis ne saurait être tenu responsable de l'utilisation faite par l'Utilisateur du Contenu Généré.
- Genesis ne garantit pas la disponibilité continue et ininterrompue du Service.

## Article 7 — Modération du Contenu

L'Application intègre des mécanismes de modération automatique. Les contenus à caractère érotique, politique partisan, ou contraires aux bonnes mœurs sont filtrés et interdits.

## Article 8 — Contact

Pour toute question : **genesiscorp080@gmail.com**

---

*© 2026 Genesis. Tous droits réservés.*`
  : `# Terms of Use

**Prisca Application — Last updated: April 2026**

---

## Preamble

These Terms of Use govern the use of the Prisca application, published by Genesis.

## Article 1 — Definitions

- **Application**: the Prisca mobile and web application.
- **User**: any individual using the Application.
- **Generated Content**: any document or text produced by the AI.

## Article 2 — Purpose

Prisca provides automatic generation of educational documents using AI technologies.

## Article 3 — Access

Access requires account creation. Free users: 1 doc/week, 5 AI questions/day. VIP subscription (500 FCFA/year or 2,000 FCFA lifetime) unlocks unlimited access.

## Article 4 — Acceptable Use

Users agree to use the Application for educational purposes only. Content that is illegal, defamatory, or inappropriate is prohibited.

## Article 5 — Intellectual Property

The Application is the exclusive property of Genesis. Generated content is for personal/educational use only.

## Article 6 — Limitation of Liability

The Application is provided "as is" without warranties.

## Article 7 — Content Moderation

Automatic moderation filters erotic, partisan political, or inappropriate content.

## Article 8 — Contact

**genesiscorp080@gmail.com**

---

*© 2026 Genesis. All rights reserved.*`;

  const privacyContent = isFr ? `# Politique de Confidentialité

**Application Prisca — Dernière mise à jour : Avril 2026**

---

## 1. Introduction

Genesis s'engage à protéger vos données personnelles conformément aux réglementations en vigueur.

## 2. Données Collectées

- Nom, email, genre, tranche d'âge, niveau d'études
- Photo de profil
- Documents générés et historique des conversations
- Données techniques (type d'appareil, préférences)

## 3. Stockage

Vos données sont stockées de manière sécurisée sur nos serveurs. Les requêtes de génération AI ne sont pas conservées.

## 4. Utilisation

Vos données servent uniquement au fonctionnement de l'Application et à la personnalisation de votre expérience.

## 5. Partage

Nous ne vendons ni ne partageons vos données avec des tiers.

## 6. Sécurité

Communications HTTPS, clés API protégées côté serveur, stockage sécurisé.

## 7. Vos Droits

Accès, rectification, suppression et portabilité de vos données via l'Application.

## 8. Contact

**privacy@genesis-apps.com**

---

*© 2026 Genesis. Tous droits réservés.*`
  : `# Privacy Policy

**Prisca Application — Last updated: April 2026**

---

## 1. Introduction

Genesis is committed to protecting your personal data.

## 2. Data Collected

Name, email, gender, age range, education level, profile photo, generated documents, chat history.

## 3. Storage

Data is stored securely on our servers. AI generation requests are not retained.

## 4. Usage

Data is used exclusively for Application functionality and personalization.

## 5. Sharing

We do not sell or share data with third parties.

## 6. Security

HTTPS, server-side API key protection, secure storage.

## 7. Your Rights

Access, rectify, delete, and export your data via the Application.

## 8. Contact

**privacy@genesis-apps.com**

---

*© 2026 Genesis. All rights reserved.*`;

  const renderLegalModal = (show: boolean, content: string, onClose: () => void) => (
    <AnimatePresence>
      {show && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm">
          <div className="max-w-md mx-auto h-full flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex-1" />
              <button onClick={onClose} className="p-2 rounded-lg hover:bg-secondary"><X size={18} className="text-muted-foreground" /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <div className="prose prose-sm max-w-none text-foreground prose-headings:font-display prose-headings:text-foreground prose-p:text-muted-foreground prose-strong:text-foreground prose-li:text-muted-foreground">
                <ReactMarkdown>{content}</ReactMarkdown>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <div className="mobile-container">
      <StatusBar title={t("settings.title")} />
      <div className="page-content space-y-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="pt-2 flex items-center gap-4 cursor-pointer" onClick={() => navigate("/profile")}>
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center overflow-hidden">
            {profile?.photo_url ? (
              <img src={profile.photo_url} alt="Profile" className="w-full h-full object-cover rounded-2xl" />
            ) : (
              <User size={24} className="text-primary" />
            )}
          </div>
          <div>
            <h2 className="font-display text-lg font-bold">{profile?.name || t("settings.user")}</h2>
            <p className="text-sm text-muted-foreground">{profile?.email}</p>
          </div>
          <ChevronRight size={16} className="text-muted-foreground/50 ml-auto" />
        </motion.div>

        {settingsGroups.map((group, gi) => (
          <motion.div key={group.title} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: gi * 0.05 }}>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{group.title}</h3>
            <div className="glass-card overflow-hidden divide-y divide-border/50">
              {group.items.map((item: any) => {
                const Icon = item.icon;
                const isDestructive = item.destructive;
                return (
                  <button key={item.label} onClick={item.action}
                    className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-secondary/30 transition-colors">
                    <Icon size={18} className={isDestructive ? "text-destructive" : item.highlight ? "text-accent-foreground" : "text-muted-foreground"} />
                    <div className="flex-1 text-left">
                      <p className={`text-sm font-medium ${isDestructive ? "text-destructive" : ""}`}>{item.label}</p>
                      {item.desc && <p className="text-[11px] text-muted-foreground">{item.desc}</p>}
                    </div>
                    {item.hasSwitch ? (
                      <Switch checked={item.switchValue} onCheckedChange={item.action} />
                    ) : (
                      <ChevronRight size={14} className="text-muted-foreground/50" />
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        ))}

        <p className="text-center text-[10px] text-muted-foreground py-4">{t("settings.version")}</p>
      </div>

      {renderLegalModal(showTerms, termsContent, () => setShowTerms(false))}
      {renderLegalModal(showPrivacy, privacyContent, () => setShowPrivacy(false))}

      {/* Donation modal */}
      <AnimatePresence>
        {showDonation && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm">
            <div className="max-w-md mx-auto h-full flex flex-col">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <h3 className="font-display font-semibold">{isFr ? "Faire un don" : "Make a donation"}</h3>
                <button onClick={() => setShowDonation(false)} className="p-2 rounded-lg hover:bg-secondary">
                  <X size={18} className="text-muted-foreground" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-5 py-6 space-y-6">
                <div className="text-center space-y-2">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                    <Heart size={28} className="text-primary" />
                  </div>
                  <h3 className="font-display text-lg font-bold">
                    {isFr ? "Soutenez Prisca" : "Support Prisca"}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {isFr
                      ? "Votre don aide à maintenir et améliorer Prisca. Chaque contribution compte !"
                      : "Your donation helps maintain and improve Prisca. Every contribution counts!"}
                  </p>
                </div>

                <div className="space-y-4">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {isFr ? "Méthodes de paiement" : "Payment methods"}
                  </h4>

                  {/* Orange Money */}
                  <div className="glass-card p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                        <span className="text-lg font-bold text-orange-500">OM</span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold">Orange Money</p>
                        <p className="text-xs text-muted-foreground">Cameroun</p>
                      </div>
                    </div>
                    <div className="bg-secondary/60 rounded-lg p-3 text-center">
                      <p className="text-xs text-muted-foreground mb-1">{isFr ? "Numéro Orange Money" : "Orange Money Number"}</p>
                      <p className="text-lg font-bold font-mono tracking-wider">+237 6XX XXX XXX</p>
                    </div>
                    <p className="text-[11px] text-muted-foreground text-center">
                      {isFr
                        ? "Envoyez votre don via Orange Money au numéro ci-dessus"
                        : "Send your donation via Orange Money to the number above"}
                    </p>
                  </div>

                  {/* Mobile Money (MTN) */}
                  <div className="glass-card p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center">
                        <span className="text-lg font-bold text-yellow-600">MM</span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold">MTN Mobile Money</p>
                        <p className="text-xs text-muted-foreground">Cameroun</p>
                      </div>
                    </div>
                    <div className="bg-secondary/60 rounded-lg p-3 text-center">
                      <p className="text-xs text-muted-foreground mb-1">{isFr ? "Numéro Mobile Money" : "Mobile Money Number"}</p>
                      <p className="text-lg font-bold font-mono tracking-wider">+237 6XX XXX XXX</p>
                    </div>
                    <p className="text-[11px] text-muted-foreground text-center">
                      {isFr
                        ? "Envoyez votre don via MTN Mobile Money au numéro ci-dessus"
                        : "Send your donation via MTN Mobile Money to the number above"}
                    </p>
                  </div>

                  {/* Suggested amounts */}
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      {isFr ? "Montants suggérés" : "Suggested amounts"}
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {[500, 1000, 2000, 5000, 10000, 25000].map((amount) => (
                        <div key={amount} className="glass-card p-2 text-center">
                          <p className="text-sm font-bold">{amount.toLocaleString()} <span className="text-[10px] font-normal text-muted-foreground">XAF</span></p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <p className="text-center text-xs text-muted-foreground mt-4">
                    {isFr ? "Merci pour votre générosité ! 🙏" : "Thank you for your generosity! 🙏"}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SettingsPage;
