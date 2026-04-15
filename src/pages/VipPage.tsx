import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Crown, Check, Sparkles, Shield, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth, SubscriptionType } from "@/contexts/AuthContext";
import { toast } from "sonner";
import orangeMoneyLogo from "@/assets/orange_money.jfif";
import mobileMoneyLogo from "@/assets/mobile_money.jfif";

const VipPage = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { activateSubscription, subscriptionType } = useAuth();
  const isFr = language === "fr";
  const [selectedTier, setSelectedTier] = useState<SubscriptionType>("standard");
  const [selectedPlan, setSelectedPlan] = useState<"yearly" | "lifetime">("yearly");
  const [paymentMethod, setPaymentMethod] = useState<"orange" | "mobile">("orange");
  const [processing, setProcessing] = useState(false);

  const tiers = [
    {
      id: "standard" as SubscriptionType,
      name: "Standard",
      icon: Shield,
      yearlyPrice: "500 XAF",
      lifetimePrice: "2 000 XAF",
      features: isFr
        ? ["20 documents/semaine", "Questions IA illimitées", "Pas de génération simultanée"]
        : ["20 documents/week", "Unlimited AI questions", "No simultaneous generation"],
    },
    {
      id: "evolution" as SubscriptionType,
      name: "Évolution",
      icon: Zap,
      popular: true,
      yearlyPrice: "1 000 XAF",
      lifetimePrice: "10 000 XAF",
      features: isFr
        ? ["50 documents/semaine", "2 générations simultanées", "1 encyclopédie/semaine", "Questions IA illimitées"]
        : ["50 documents/week", "2 simultaneous generations", "1 encyclopedia/week", "Unlimited AI questions"],
    },
    {
      id: "vip" as SubscriptionType,
      name: "VIP",
      icon: Crown,
      yearlyPrice: "2 000 XAF",
      lifetimePrice: "25 000 XAF",
      features: isFr
        ? ["Documents illimités", "3 générations simultanées", "3 encyclopédies/semaine", "Toutes fonctionnalités", "Badge VIP"]
        : ["Unlimited documents", "3 simultaneous generations", "3 encyclopedias/week", "All features", "VIP badge"],
    },
  ];

  const selectedTierData = tiers.find(t => t.id === selectedTier);

  const handleSubscribe = async () => {
    setProcessing(true);
    await new Promise(r => setTimeout(r, 2000));
    await activateSubscription(selectedTier, selectedPlan);
    setProcessing(false);
    toast.success(isFr ? "Abonnement activé ! 🎉" : "Subscription activated! 🎉");
    navigate(-1);
  };

  if (subscriptionType !== "free" && subscriptionType !== "gold") {
    return (
      <div className="mobile-container">
        <div className="fixed top-0 left-0 right-0 z-50">
          <div className="max-w-md mx-auto bg-background/90 backdrop-blur-2xl border-b border-border/50">
            <div className="flex items-center gap-3 px-4 py-3">
              <button onClick={() => navigate(-1)} className="p-1"><ArrowLeft size={20} /></button>
              <h1 className="font-display text-sm font-semibold">{isFr ? "Abonnement" : "Subscription"}</h1>
            </div>
          </div>
        </div>
        <div className="pt-16 pb-24 px-5 flex flex-col items-center justify-center min-h-[60vh]">
          <Crown size={48} className="text-primary mb-4" />
          <h2 className="font-display text-2xl font-bold">
            {subscriptionType === "vip" ? "VIP" : subscriptionType === "evolution" ? "Évolution" : "Standard"} ✓
          </h2>
          <p className="text-sm text-muted-foreground mt-2 text-center">
            {isFr ? "Votre abonnement est actif." : "Your subscription is active."}
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
            <h1 className="font-display text-sm font-semibold">{isFr ? "Abonnements" : "Subscriptions"}</h1>
          </div>
        </div>
      </div>

      <div className="pt-16 pb-24 px-5 space-y-5">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center pt-4">
          <h2 className="font-display text-2xl font-bold">{isFr ? "Choisissez votre plan" : "Choose your plan"}</h2>
        </motion.div>

        {/* Tiers */}
        <div className="space-y-3">
          {tiers.map((tier) => {
            const Icon = tier.icon;
            return (
              <motion.button key={tier.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                onClick={() => setSelectedTier(tier.id)}
                className={`w-full glass-card p-4 text-left transition-all relative ${selectedTier === tier.id ? "ring-2 ring-primary bg-primary/5" : ""}`}>
                {tier.popular && (
                  <span className="absolute -top-2 right-4 bg-accent text-accent-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {isFr ? "POPULAIRE" : "POPULAR"}
                  </span>
                )}
                <div className="flex items-center gap-3 mb-2">
                  <Icon size={20} className="text-primary" />
                  <p className="font-display font-bold text-lg">{tier.name}</p>
                </div>
                <div className="space-y-1">
                  {tier.features.map((f, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Check size={12} className="text-primary shrink-0" />
                      <span className="text-xs text-muted-foreground">{f}</span>
                    </div>
                  ))}
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Plan selection */}
        <div className="flex gap-3">
          <button onClick={() => setSelectedPlan("yearly")}
            className={`flex-1 glass-card p-3 text-center transition-all ${selectedPlan === "yearly" ? "ring-2 ring-primary" : ""}`}>
            <p className="text-xs text-muted-foreground">{isFr ? "Annuel" : "Yearly"}</p>
            <p className="font-bold text-primary">{selectedTierData?.yearlyPrice}<span className="text-xs text-muted-foreground font-normal">/{isFr ? "an" : "yr"}</span></p>
          </button>
          <button onClick={() => setSelectedPlan("lifetime")}
            className={`flex-1 glass-card p-3 text-center transition-all ${selectedPlan === "lifetime" ? "ring-2 ring-primary" : ""}`}>
            <p className="text-xs text-muted-foreground">{isFr ? "À vie" : "Lifetime"}</p>
            <p className="font-bold text-primary">{selectedTierData?.lifetimePrice}</p>
          </button>
        </div>

        {/* Payment */}
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

        <button onClick={handleSubscribe} disabled={processing}
          className={`btn-primary w-full flex items-center justify-center gap-2 ${processing ? "opacity-60" : ""}`}>
          {processing ? (
            <><Sparkles size={16} className="animate-spin" /> {isFr ? "Traitement..." : "Processing..."}</>
          ) : (
            <><Crown size={16} /> {isFr ? "Souscrire" : "Subscribe"} — {selectedPlan === "yearly" ? selectedTierData?.yearlyPrice : selectedTierData?.lifetimePrice}</>
          )}
        </button>
      </div>
    </div>
  );
};

export default VipPage;
