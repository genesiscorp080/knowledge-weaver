import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Crown, Check, Infinity, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import orangeMoneyLogo from "@/assets/orange_money.jfif";
import mobileMoneyLogo from "@/assets/mobile_money.jfif";

const VipPage = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { activateVip, isVip } = useAuth();
  const isFr = language === "fr";
  const [selectedPlan, setSelectedPlan] = useState<"yearly" | "lifetime">("yearly");
  const [paymentMethod, setPaymentMethod] = useState<"orange" | "mobile">("orange");
  const [processing, setProcessing] = useState(false);

  const plans = [
    {
      id: "yearly" as const,
      name: isFr ? "Annuel" : "Yearly",
      price: "500 FCFA",
      period: isFr ? "/an" : "/year",
      features: isFr
        ? ["Génération illimitée", "Questions IA illimitées", "Accès prioritaire", "Support dédié"]
        : ["Unlimited generation", "Unlimited AI questions", "Priority access", "Dedicated support"],
    },
    {
      id: "lifetime" as const,
      name: isFr ? "À vie" : "Lifetime",
      price: "2 000 FCFA",
      period: isFr ? "unique" : "one-time",
      popular: true,
      features: isFr
        ? ["Tout l'annuel inclus", "Accès à vie", "Futures fonctionnalités", "Badge VIP permanent"]
        : ["Everything in yearly", "Lifetime access", "Future features", "Permanent VIP badge"],
    },
  ];

  const handleSubscribe = async () => {
    setProcessing(true);
    // Simulate payment processing
    await new Promise(r => setTimeout(r, 2000));
    await activateVip(selectedPlan);
    setProcessing(false);
    toast.success(isFr ? "Abonnement VIP activé ! 🎉" : "VIP subscription activated! 🎉");
    navigate(-1);
  };

  if (isVip) {
    return (
      <div className="mobile-container">
        <div className="fixed top-0 left-0 right-0 z-50">
          <div className="max-w-md mx-auto bg-background/90 backdrop-blur-2xl border-b border-border/50">
            <div className="flex items-center gap-3 px-4 py-3">
              <button onClick={() => navigate(-1)} className="p-1"><ArrowLeft size={20} /></button>
              <h1 className="font-display text-sm font-semibold">VIP</h1>
            </div>
          </div>
        </div>
        <div className="pt-16 pb-24 px-5 flex flex-col items-center justify-center min-h-[60vh]">
          <Crown size={48} className="text-primary mb-4" />
          <h2 className="font-display text-2xl font-bold">{isFr ? "Vous êtes VIP !" : "You are VIP!"}</h2>
          <p className="text-sm text-muted-foreground mt-2 text-center">
            {isFr ? "Vous bénéficiez d'un accès illimité à toutes les fonctionnalités." : "You have unlimited access to all features."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mobile-container">
      <div className="fixed top-0 left-0 right-0 z-50">
        <div className="max-w-md mx-auto bg-background/90 backdrop-blur-2xl border-b border-border/50">
          <div className="flex items-center gap-3 px-4 py-3">
            <button onClick={() => navigate(-1)} className="p-1"><ArrowLeft size={20} /></button>
            <h1 className="font-display text-sm font-semibold">{isFr ? "Passer VIP" : "Go VIP"}</h1>
          </div>
        </div>
      </div>

      <div className="pt-16 pb-24 px-5 space-y-5">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center pt-4">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-primary to-primary/60 text-primary-foreground px-4 py-1.5 rounded-full text-sm font-bold mb-3">
            <Crown size={16} /> VIP
          </div>
          <h2 className="font-display text-2xl font-bold">{isFr ? "Débloquez tout" : "Unlock everything"}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {isFr ? "Génération et questions illimitées" : "Unlimited generation and questions"}
          </p>
        </motion.div>

        {/* Plans */}
        <div className="space-y-3">
          {plans.map((plan) => (
            <motion.button key={plan.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              onClick={() => setSelectedPlan(plan.id)}
              className={`w-full glass-card p-4 text-left transition-all relative ${selectedPlan === plan.id ? "ring-2 ring-primary bg-primary/5" : ""}`}>
              {plan.popular && (
                <span className="absolute -top-2 right-4 bg-accent text-accent-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {isFr ? "POPULAIRE" : "POPULAR"}
                </span>
              )}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-display font-bold text-lg">{plan.name}</p>
                  <p className="text-2xl font-bold text-primary">{plan.price}<span className="text-sm text-muted-foreground font-normal"> {plan.period}</span></p>
                </div>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${selectedPlan === plan.id ? "border-primary bg-primary" : "border-muted-foreground/30"}`}>
                  {selectedPlan === plan.id && <Check size={14} className="text-primary-foreground" />}
                </div>
              </div>
              <div className="mt-3 space-y-1.5">
                {plan.features.map((f, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Check size={12} className="text-primary shrink-0" />
                    <span className="text-xs text-muted-foreground">{f}</span>
                  </div>
                ))}
              </div>
            </motion.button>
          ))}
        </div>

        {/* Payment method */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
            {isFr ? "Moyen de paiement" : "Payment method"}
          </label>
          <div className="flex gap-3">
            <button onClick={() => setPaymentMethod("orange")}
              className={`flex-1 glass-card p-3 flex flex-col items-center gap-2 transition-all ${paymentMethod === "orange" ? "ring-2 ring-primary" : ""}`}>
              <img src={orangeMoneyLogo} alt="Orange Money" className="w-12 h-12 object-contain rounded-lg" />
              <span className="text-xs font-semibold">Orange Money</span>
            </button>
            <button onClick={() => setPaymentMethod("mobile")}
              className={`flex-1 glass-card p-3 flex flex-col items-center gap-2 transition-all ${paymentMethod === "mobile" ? "ring-2 ring-primary" : ""}`}>
              <img src={mobileMoneyLogo} alt="Mobile Money" className="w-12 h-12 object-contain rounded-lg" />
              <span className="text-xs font-semibold">Mobile Money</span>
            </button>
          </div>
        </motion.div>

        {/* Subscribe button */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <button onClick={handleSubscribe} disabled={processing}
            className={`btn-primary w-full flex items-center justify-center gap-2 ${processing ? "opacity-60" : ""}`}>
            {processing ? (
              <><Sparkles size={16} className="animate-spin" /> {isFr ? "Traitement..." : "Processing..."}</>
            ) : (
              <><Crown size={16} /> {isFr ? "Souscrire" : "Subscribe"} — {plans.find(p => p.id === selectedPlan)?.price}</>
            )}
          </button>
        </motion.div>
      </div>
    </div>
  );
};

export default VipPage;
