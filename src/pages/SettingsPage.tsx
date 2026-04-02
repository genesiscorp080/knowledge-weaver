import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Moon, Sun, Globe, Bell, BellOff, HelpCircle, LogOut, ChevronRight, FileText, Shield, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import StatusBar from "@/components/StatusBar";
import { useThemeContext } from "@/contexts/ThemeContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { useProfile } from "@/contexts/ProfileContext";
import { Switch } from "@/components/ui/switch";
import ReactMarkdown from "react-markdown";

const SettingsPage = () => {
  const { theme, toggleTheme } = useThemeContext();
  const { language, setLanguage, t } = useLanguage();
  const { notificationsEnabled, setNotificationsEnabled } = useNotifications();
  const { profile } = useProfile();
  const navigate = useNavigate();
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const isFr = language === "fr";

  const settingsGroups = [
    {
      title: t("settings.general"),
      items: [
        { icon: User, label: t("settings.profile"), desc: profile.name || t("settings.profileDesc"), action: () => navigate("/profile") },
        { icon: Globe, label: t("settings.language"), desc: language === "fr" ? t("settings.languageFr") : t("settings.languageEn"), action: () => setLanguage(language === "fr" ? "en" : "fr") },
        { icon: theme === "dark" ? Sun : Moon, label: t("settings.appearance"), desc: theme === "dark" ? t("settings.dark") : t("settings.light"), action: toggleTheme },
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
      title: t("settings.help"),
      items: [
        { icon: HelpCircle, label: t("settings.helpFaq"), desc: "", action: undefined },
        { icon: LogOut, label: t("settings.logout"), desc: "", destructive: true, action: undefined },
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

L'accès à l'Application est gratuit. Certaines fonctionnalités avancées pourront faire l'objet d'une tarification ultérieure, auquel cas l'Utilisateur en sera informé préalablement.

L'Utilisateur s'engage à fournir des informations exactes lors de la création de son profil.

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
- En aucun cas Genesis ne pourra être tenu responsable de dommages indirects résultant de l'utilisation de l'Application.

## Article 7 — Modération du Contenu

L'Application intègre des mécanismes de modération automatique. Les contenus à caractère érotique, politique partisan, ou contraires aux bonnes mœurs sont filtrés et interdits. Genesis se réserve le droit de suspendre l'accès à tout Utilisateur contrevenant à ces règles.

## Article 8 — Modifications des CGU

Genesis se réserve le droit de modifier les présentes CGU à tout moment. Les modifications entreront en vigueur dès leur publication dans l'Application. L'Utilisateur sera informé de toute modification substantielle.

## Article 9 — Droit Applicable

Les présentes CGU sont régies par le droit en vigueur. Tout litige relatif à l'interprétation ou à l'exécution des présentes CGU sera soumis aux juridictions compétentes.

## Article 10 — Contact

Pour toute question relative aux présentes CGU, veuillez nous contacter à l'adresse : **contact@genesis-apps.com**

---

*© 2026 Genesis. Tous droits réservés.*`
  : `# Terms of Use

**Prisca Application — Last updated: April 2026**

---

## Preamble

These Terms of Use (hereinafter "Terms") govern the use of the Prisca application (hereinafter "the Application"), published by Genesis. By accessing or using the Application, you unconditionally accept these Terms in their entirety.

## Article 1 — Definitions

- **Application**: refers to the Prisca mobile and web application, accessible via browser or download.
- **User**: any individual using the Application.
- **Generated Content**: any document, evaluation, or text produced by the artificial intelligence integrated into the Application.
- **Service**: all features offered by the Application.

## Article 2 — Purpose

The Prisca Application provides an automatic generation service for educational documents, teaching materials, evaluations, and learning content using artificial intelligence technologies.

## Article 3 — Access to the Service

Access to the Application is free. Certain advanced features may be subject to future pricing, in which case the User will be informed in advance.

The User agrees to provide accurate information when creating their profile.

## Article 4 — Acceptable Use

The User agrees to:
- Use the Application in accordance with its educational purpose;
- Not generate content that is illegal, defamatory, discriminatory, pornographic, or inciting hatred;
- Not attempt to circumvent content moderation filters;
- Not use the Application for commercial purposes without prior authorization;
- Respect the intellectual property rights of third parties.

## Article 5 — Intellectual Property

### 5.1 Application
The Application, its source code, design, algorithms, and brand are the exclusive property of Genesis. Any unauthorized reproduction is prohibited.

### 5.2 Generated Content
Content generated by AI is made available to the User for personal and educational use. The User acknowledges that this content is produced by artificial intelligence and does not constitute certified professional, medical, legal, or scientific advice.

## Article 6 — Limitation of Liability

- The Application is provided "as is," without guarantee of accuracy, completeness, or relevance of Generated Content.
- Genesis shall not be held responsible for the User's use of Generated Content.
- Genesis does not guarantee continuous and uninterrupted availability of the Service.
- Under no circumstances shall Genesis be liable for indirect damages resulting from the use of the Application.

## Article 7 — Content Moderation

The Application incorporates automatic moderation mechanisms. Content of an erotic, partisan political nature, or contrary to public morals is filtered and prohibited. Genesis reserves the right to suspend access to any User violating these rules.

## Article 8 — Amendments

Genesis reserves the right to modify these Terms at any time. Modifications will take effect upon publication in the Application. The User will be informed of any substantial modification.

## Article 9 — Applicable Law

These Terms are governed by applicable law. Any dispute relating to the interpretation or execution of these Terms shall be submitted to the competent courts.

## Article 10 — Contact

For any questions regarding these Terms, please contact us at: **contact@genesis-apps.com**

---

*© 2026 Genesis. All rights reserved.*`;

  const privacyContent = isFr ? `# Politique de Confidentialité

**Application Prisca — Dernière mise à jour : Avril 2026**

---

## 1. Introduction

La présente Politique de Confidentialité décrit la manière dont Genesis (ci-après « nous », « notre ») collecte, utilise, stocke et protège les données personnelles des utilisateurs de l'application Prisca (ci-après « l'Application »).

Nous nous engageons à respecter votre vie privée et à protéger vos données personnelles conformément aux réglementations en vigueur en matière de protection des données.

## 2. Données Collectées

### 2.1 Données de profil
- Nom ou pseudonyme
- Photo de profil (stockée localement)
- Genre et tranche d'âge
- Niveau d'études par défaut
- Préférences linguistiques et d'affichage

### 2.2 Données d'utilisation
- Documents générés et leur contenu
- Historique des conversations avec l'IA
- Évaluations créées et résultats
- Documents PDF importés

### 2.3 Données techniques
- Type d'appareil et navigateur
- Préférences d'affichage (thème, langue)

## 3. Stockage des Données

**Toutes vos données sont stockées localement sur votre appareil.** Nous n'avons pas accès à vos documents, conversations ou informations personnelles stockés dans l'Application.

Les seules données transmises à des serveurs externes sont les requêtes de génération de contenu envoyées à notre service d'intelligence artificielle. Ces données de requête **ne sont pas conservées** après le traitement.

## 4. Utilisation des Données

Vos données sont utilisées exclusivement pour :
- Le fonctionnement des fonctionnalités de l'Application ;
- La personnalisation de votre expérience utilisateur ;
- La génération de contenu éducatif adapté à votre profil ;
- L'amélioration de la qualité du service.

## 5. Partage des Données

Nous ne vendons, ne louons et ne partageons **aucune** donnée personnelle avec des tiers à des fins commerciales.

Les seuls transferts de données s'effectuent vers notre service d'IA pour le traitement des requêtes de génération, et ces données sont traitées de manière anonyme et éphémère.

## 6. Sécurité

Nous mettons en œuvre des mesures de sécurité techniques et organisationnelles appropriées pour protéger vos données :
- Stockage local chiffré
- Communications sécurisées (HTTPS)
- Clés API protégées côté serveur
- Aucune conservation des données de requête après traitement

## 7. Vos Droits

Conformément aux réglementations applicables, vous disposez des droits suivants :
- **Droit d'accès** : consulter vos données personnelles à tout moment dans l'Application ;
- **Droit de rectification** : modifier vos informations de profil ;
- **Droit de suppression** : supprimer vos documents, conversations et données de profil ;
- **Droit à la portabilité** : exporter vos documents en format PDF.

Pour exercer ces droits, vous pouvez directement utiliser les fonctionnalités de l'Application ou nous contacter.

## 8. Cookies et Technologies de Suivi

L'Application n'utilise **aucun cookie** de suivi ni technologie de profilage publicitaire. Seul le stockage local (localStorage) est utilisé pour conserver vos préférences et données.

## 9. Protection des Mineurs

L'Application est accessible aux utilisateurs de tous âges dans un cadre strictement éducatif. Les contenus inappropriés sont automatiquement filtrés et bloqués.

## 10. Modifications

Nous nous réservons le droit de modifier cette politique à tout moment. Toute modification sera communiquée via l'Application.

## 11. Contact

Pour toute question relative à la protection de vos données, contactez-nous :
**Email** : privacy@genesis-apps.com

---

*© 2026 Genesis. Tous droits réservés.*`
  : `# Privacy Policy

**Prisca Application — Last updated: April 2026**

---

## 1. Introduction

This Privacy Policy describes how Genesis (hereinafter "we," "our") collects, uses, stores, and protects the personal data of users of the Prisca application (hereinafter "the Application").

We are committed to respecting your privacy and protecting your personal data in accordance with applicable data protection regulations.

## 2. Data Collected

### 2.1 Profile Data
- Name or pseudonym
- Profile photo (stored locally)
- Gender and age range
- Default education level
- Language and display preferences

### 2.2 Usage Data
- Generated documents and their content
- AI conversation history
- Created evaluations and results
- Imported PDF documents

### 2.3 Technical Data
- Device type and browser
- Display preferences (theme, language)

## 3. Data Storage

**All your data is stored locally on your device.** We do not have access to your documents, conversations, or personal information stored in the Application.

The only data transmitted to external servers are content generation requests sent to our artificial intelligence service. This request data **is not retained** after processing.

## 4. Data Usage

Your data is used exclusively for:
- Operating the Application's features;
- Personalizing your user experience;
- Generating educational content adapted to your profile;
- Improving service quality.

## 5. Data Sharing

We do not sell, rent, or share **any** personal data with third parties for commercial purposes.

The only data transfers occur to our AI service for processing generation requests, and this data is processed anonymously and ephemerally.

## 6. Security

We implement appropriate technical and organizational security measures to protect your data:
- Encrypted local storage
- Secure communications (HTTPS)
- Server-side protected API keys
- No retention of request data after processing

## 7. Your Rights

In accordance with applicable regulations, you have the following rights:
- **Right of access**: view your personal data at any time in the Application;
- **Right of rectification**: modify your profile information;
- **Right of deletion**: delete your documents, conversations, and profile data;
- **Right to portability**: export your documents in PDF format.

To exercise these rights, you can directly use the Application's features or contact us.

## 8. Cookies and Tracking Technologies

The Application uses **no tracking cookies** or advertising profiling technology. Only local storage (localStorage) is used to save your preferences and data.

## 9. Protection of Minors

The Application is accessible to users of all ages in a strictly educational context. Inappropriate content is automatically filtered and blocked.

## 10. Amendments

We reserve the right to modify this policy at any time. Any modification will be communicated via the Application.

## 11. Contact

For any questions regarding the protection of your data, contact us:
**Email**: privacy@genesis-apps.com

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
            {profile.photo ? (
              <img src={profile.photo} alt="Profile" className="w-full h-full object-cover rounded-2xl" />
            ) : (
              <User size={24} className="text-primary" />
            )}
          </div>
          <div>
            <h2 className="font-display text-lg font-bold">{profile.name || t("settings.user")}</h2>
            <p className="text-sm text-muted-foreground">{t("settings.defaultLevel")} : {t(`level.${profile.defaultLevel}`)}</p>
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
                    <Icon size={18} className={isDestructive ? "text-destructive" : "text-muted-foreground"} />
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
    </div>
  );
};

export default SettingsPage;
