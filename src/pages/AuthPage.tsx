import { useState } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2, ChevronDown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import genesisLogo from "@/assets/logo_genesis.png";

const levels = [
  { value: "primaire", fr: "Primaire", en: "Primary" },
  { value: "college", fr: "Collège", en: "Middle School" },
  { value: "lycee", fr: "Lycée", en: "High School" },
  { value: "licence", fr: "Licence", en: "Bachelor's" },
  { value: "ingenieur", fr: "Ingénieur", en: "Engineer" },
  { value: "docteur", fr: "Docteur", en: "Doctorate" },
  { value: "expert", fr: "Expert", en: "Expert" },
];

const ageRanges = ["6-11", "12-15", "16-20", "21-25", "26-35", "36-45", "45+"];

const AuthPage = () => {
  const { signUp, signIn } = useAuth();
  const { language } = useLanguage();
  const isFr = language === "fr";
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Form fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [gender, setGender] = useState("homme");
  const [ageRange, setAgeRange] = useState("21-25");
  const [defaultLevel, setDefaultLevel] = useState("licence");

  const handleSubmit = async () => {
    if (!email || !password) {
      toast.error(isFr ? "Veuillez remplir tous les champs" : "Please fill all fields");
      return;
    }

    if (!isLogin && !name) {
      toast.error(isFr ? "Veuillez entrer votre nom" : "Please enter your name");
      return;
    }

    if (password.length < 6) {
      toast.error(isFr ? "Le mot de passe doit faire au moins 6 caractères" : "Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          toast.error(isFr ? "Email ou mot de passe incorrect" : "Incorrect email or password");
        } else {
          toast.success(isFr ? "Connexion réussie !" : "Login successful!");
        }
      } else {
        const { error } = await signUp(email, password, name, gender, ageRange, defaultLevel);
        if (error) {
          toast.error(error);
        } else {
          toast.success(isFr ? "Compte créé avec succès !" : "Account created successfully!");
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mobile-container min-h-screen bg-background flex flex-col">
      <div className="flex-1 px-6 py-8 overflow-y-auto">
        {/* Logo */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center mb-8">
          <img src={genesisLogo} alt="Genesis" className="w-16 h-16 object-contain mb-3" />
          <h1 className="font-display text-3xl font-bold text-foreground">Prisca</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isFr ? "Votre assistant éducatif intelligent" : "Your smart educational assistant"}
          </p>
        </motion.div>

        {/* Toggle */}
        <div className="flex bg-secondary/60 rounded-xl p-1 mb-6">
          <button onClick={() => setIsLogin(true)}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${isLogin ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground"}`}>
            {isFr ? "Connexion" : "Login"}
          </button>
          <button onClick={() => setIsLogin(false)}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${!isLogin ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground"}`}>
            {isFr ? "Inscription" : "Sign up"}
          </button>
        </div>

        <motion.div key={isLogin ? "login" : "signup"} initial={{ opacity: 0, x: isLogin ? -20 : 20 }} animate={{ opacity: 1, x: 0 }}
          className="space-y-4">
          
          {!isLogin && (
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                {isFr ? "Nom complet" : "Full name"}
              </label>
              <input value={name} onChange={(e) => setName(e.target.value)}
                placeholder={isFr ? "Votre nom" : "Your name"}
                className="input-field w-full" />
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email"
              placeholder="email@example.com" className="input-field w-full" />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
              {isFr ? "Mot de passe" : "Password"}
            </label>
            <div className="relative">
              <input value={password} onChange={(e) => setPassword(e.target.value)}
                type={showPassword ? "text" : "password"} placeholder="••••••••"
                className="input-field w-full pr-12" />
              <button onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {!isLogin && (
            <>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                  {isFr ? "Genre" : "Gender"}
                </label>
                <div className="flex gap-3">
                  {[
                    { v: "homme", l: isFr ? "Homme" : "Male" },
                    { v: "femme", l: isFr ? "Femme" : "Female" },
                  ].map(g => (
                    <button key={g.v} onClick={() => setGender(g.v)}
                      className={`flex-1 h-11 rounded-xl text-sm font-semibold transition-all ${gender === g.v ? "bg-primary text-primary-foreground shadow-md" : "bg-secondary text-muted-foreground"}`}>
                      {g.l}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                  {isFr ? "Tranche d'âge" : "Age range"}
                </label>
                <div className="flex flex-wrap gap-2">
                  {ageRanges.map(a => (
                    <button key={a} onClick={() => setAgeRange(a)}
                      className={`chip ${ageRange === a ? "chip-active" : "chip-inactive"}`}>
                      {a}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                  {isFr ? "Niveau par défaut" : "Default level"}
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {levels.map(l => (
                    <button key={l.value} onClick={() => setDefaultLevel(l.value)}
                      className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${defaultLevel === l.value ? "bg-primary/10 text-primary border border-primary/30" : "bg-secondary/60 text-foreground"}`}>
                      {isFr ? l.fr : l.en}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          <button onClick={handleSubmit} disabled={loading}
            className={`btn-primary w-full flex items-center justify-center gap-2 mt-4 ${loading ? "opacity-60" : ""}`}>
            {loading && <Loader2 size={16} className="animate-spin" />}
            {isLogin ? (isFr ? "Se connecter" : "Login") : (isFr ? "Créer un compte" : "Create account")}
          </button>
        </motion.div>
      </div>
    </div>
  );
};

export default AuthPage;
