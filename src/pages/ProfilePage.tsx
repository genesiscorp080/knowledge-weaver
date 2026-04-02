import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Camera, User, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import StatusBar from "@/components/StatusBar";
import { useLanguage } from "@/contexts/LanguageContext";
import { useProfile } from "@/contexts/ProfileContext";
import { toast } from "sonner";

const levels = [
  { value: "primaire", labelKey: "level.primaire" },
  { value: "college", labelKey: "level.college" },
  { value: "lycee", labelKey: "level.lycee" },
  { value: "licence", labelKey: "level.licence" },
  { value: "ingenieur", labelKey: "level.ingenieur" },
  { value: "docteur", labelKey: "level.docteur" },
  { value: "expert", labelKey: "level.expert" },
];

const ageRanges = ["6-11", "12-15", "16-20", "21-25", "26-35", "36-45", "45+"];

const ProfilePage = () => {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { profile, updateProfile } = useProfile();
  const [name, setName] = useState(profile.name);
  const [defaultLevel, setDefaultLevel] = useState(profile.defaultLevel);
  const [gender, setGender] = useState(profile.gender);
  const [ageRange, setAgeRange] = useState(profile.ageRange);
  const photoRef = useRef<HTMLInputElement>(null);
  const isFr = language === "fr";

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      updateProfile({ photo: result });
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    updateProfile({ name, defaultLevel, gender, ageRange });
    toast.success(isFr ? "Profil mis à jour !" : "Profile updated!");
    navigate(-1);
  };

  return (
    <div className="mobile-container">
      <div className="fixed top-0 left-0 right-0 z-50">
        <div className="max-w-md mx-auto bg-background/90 backdrop-blur-2xl border-b border-border/50">
          <div className="flex items-center gap-3 px-4 py-3">
            <button onClick={() => navigate(-1)} className="p-1"><ArrowLeft size={20} className="text-foreground" /></button>
            <h1 className="font-display text-sm font-semibold">{isFr ? "Mon profil" : "My Profile"}</h1>
            <div className="flex-1" />
            <button onClick={handleSave} className="text-primary text-sm font-semibold flex items-center gap-1">
              <Check size={16} /> {t("common.save")}
            </button>
          </div>
        </div>
      </div>

      <div className="pt-16 pb-24 px-5 space-y-6">
        {/* Photo */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-3 pt-4">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden border-2 border-primary/30">
              {profile.photo ? (
                <img src={profile.photo} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <User size={36} className="text-primary" />
              )}
            </div>
            <input ref={photoRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
            <button onClick={() => photoRef.current?.click()}
              className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full p-2 shadow-lg">
              <Camera size={14} />
            </button>
          </div>
        </motion.div>

        {/* Name */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
            {isFr ? "Nom" : "Name"}
          </label>
          <input value={name} onChange={(e) => setName(e.target.value)}
            placeholder={isFr ? "Entrez votre nom" : "Enter your name"}
            className="input-field w-full" />
        </motion.div>

        {/* Gender */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
            {isFr ? "Genre" : "Gender"}
          </label>
          <div className="flex gap-3">
            {[
              { value: "homme" as const, label: isFr ? "Homme" : "Male" },
              { value: "femme" as const, label: isFr ? "Femme" : "Female" },
            ].map(g => (
              <button key={g.value} onClick={() => setGender(g.value)}
                className={`flex-1 h-12 rounded-xl text-sm font-semibold transition-all ${gender === g.value ? "bg-primary text-primary-foreground shadow-md" : "bg-secondary text-muted-foreground"}`}>
                {g.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Age range */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
            {isFr ? "Tranche d'âge" : "Age Range"}
          </label>
          <div className="flex flex-wrap gap-2">
            {ageRanges.map(a => (
              <button key={a} onClick={() => setAgeRange(a)}
                className={`chip ${ageRange === a ? "chip-active" : "chip-inactive"}`}>
                {a}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Default level */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
            {isFr ? "Niveau par défaut" : "Default Level"}
          </label>
          <p className="text-[11px] text-muted-foreground mb-2">
            {isFr ? "Niveau de compréhension générale des concepts courants" : "General understanding level of common concepts"}
          </p>
          <div className="space-y-1.5">
            {levels.map(l => (
              <button key={l.value} onClick={() => setDefaultLevel(l.value)}
                className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all ${defaultLevel === l.value ? "bg-primary/10 text-primary border border-primary/30" : "bg-secondary/60 text-foreground hover:bg-secondary"}`}>
                {t(l.labelKey)}
              </button>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ProfilePage;
