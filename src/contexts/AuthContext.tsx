import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

const PREMIUM_EMAILS = ["genesiscorp080@gmail.com", "juniormanfouo45@gmail.com"];

export type SubscriptionType = "free" | "standard" | "evolution" | "vip" | "gold";

interface UserProfile {
  name: string;
  email: string;
  gender: string;
  age_range: string;
  default_level: string;
  photo_url: string | null;
  is_vip: boolean;
  vip_plan: string | null;
  vip_expires_at: string | null;
  generations_this_week: number;
  last_generation_week: string | null;
  questions_today: number;
  last_question_date: string | null;
  subscription_type: SubscriptionType;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  isVip: boolean;
  isGuest: boolean;
  guestGenerationsLeft: number;
  subscriptionType: SubscriptionType;
  signUp: (email: string, password: string, name: string, gender: string, ageRange: string, defaultLevel: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signInAsGuest: () => void;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  canGenerate: () => boolean;
  canAskQuestion: () => boolean;
  recordGeneration: () => Promise<void>;
  recordQuestion: () => Promise<void>;
  activateSubscription: (type: SubscriptionType, plan: "yearly" | "lifetime") => Promise<void>;
  getMaxConcurrent: () => number;
  getWeeklyLimit: () => number;
  getEncyclopediaWeeklyLimit: () => number;
  canAccessEncyclopedia: () => boolean;
}


const AuthContext = createContext<AuthContextType | undefined>(undefined);

function getCurrentWeek(): string {
  const now = new Date();
  const jan1 = new Date(now.getFullYear(), 0, 1);
  const week = Math.ceil(((now.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${week}`;
}

function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

const GUEST_KEY = "prisca-guest";
const GUEST_LIMIT = 1;

interface GuestState {
  active: boolean;
  generations: number;
  profile: UserProfile;
}

const defaultGuestProfile: UserProfile = {
  name: "Invité",
  email: "",
  gender: "homme",
  age_range: "21-25",
  default_level: "licence",
  photo_url: null,
  is_vip: false,
  vip_plan: null,
  vip_expires_at: null,
  generations_this_week: 0,
  last_generation_week: null,
  questions_today: 0,
  last_question_date: null,
  subscription_type: "free",
};

function loadGuest(): GuestState {
  try {
    const raw = localStorage.getItem(GUEST_KEY);
    if (!raw) return { active: false, generations: 0, profile: defaultGuestProfile };
    const parsed = JSON.parse(raw);
    return {
      active: !!parsed.active,
      generations: parsed.generations || 0,
      profile: { ...defaultGuestProfile, ...(parsed.profile || {}) },
    };
  } catch {
    return { active: false, generations: 0, profile: defaultGuestProfile };
  }
}

function saveGuest(state: GuestState) {
  try { localStorage.setItem(GUEST_KEY, JSON.stringify(state)); } catch { /* ignore */ }
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [guest, setGuest] = useState<GuestState>(loadGuest);
  const isGuest = !user && guest.active;
  const guestGenerationsLeft = Math.max(0, GUEST_LIMIT - guest.generations);


  const effProfile = isGuest ? guest.profile : profile;

  const isPremiumEmail = (email: string) => PREMIUM_EMAILS.includes(email.toLowerCase());

  const getEffectiveSubscription = (): SubscriptionType => {
    if (isGuest) return "free";
    if (!profile) return "free";
    if (isPremiumEmail(profile.email)) return "gold";

    if (!profile.subscription_type || profile.subscription_type === "free") {
      // Legacy VIP check
      if (profile.is_vip) return "vip";
      return "free";
    }
    // Check expiration for yearly plans
    if (profile.vip_plan === "yearly" && profile.vip_expires_at) {
      if (new Date(profile.vip_expires_at) <= new Date()) return "free";
    }
    return profile.subscription_type;
  };

  const subscriptionType = getEffectiveSubscription();
  const isVip = ["standard", "evolution", "vip", "gold"].includes(subscriptionType);

  const fetchProfile = async (userId: string, fallbackEmail = "") => {
    const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();

    if (!data && error) {
      console.error("Error loading profile:", error);
    }

    const profileData = data || {
      id: userId,
      name: "",
      email: fallbackEmail,
      gender: "homme",
      age_range: "21-25",
      default_level: "licence",
      photo_url: null,
      is_vip: false,
      vip_plan: null,
      vip_expires_at: null,
      generations_this_week: 0,
      last_generation_week: null,
      questions_today: 0,
      last_question_date: null,
      subscription_type: "free",
    };

    if (!data) {
      await supabase.from("profiles").upsert({ id: userId, email: fallbackEmail }, { onConflict: "id" });
    }

    if (profileData) {
      setProfile({
        name: profileData.name || "",
        email: profileData.email || fallbackEmail || "",
        gender: profileData.gender || "homme",
        age_range: profileData.age_range || "21-25",
        default_level: profileData.default_level || "licence",
        photo_url: profileData.photo_url,
        is_vip: profileData.is_vip || false,
        vip_plan: profileData.vip_plan,
        vip_expires_at: profileData.vip_expires_at,
        generations_this_week: profileData.generations_this_week || 0,
        last_generation_week: profileData.last_generation_week,
        questions_today: profileData.questions_today || 0,
        last_question_date: profileData.last_question_date,
        subscription_type: (profileData as any).subscription_type || "free",
      });
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setLoading(true);
        setTimeout(() => {
          fetchProfile(session.user.id, session.user.email || "").finally(() => setLoading(false));
        }, 0);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) await fetchProfile(session.user.id, session.user.email || "");
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, name: string, gender: string, ageRange: string, defaultLevel: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name } } });
    if (error) return { error: error.message };
    if (data.user) {
      await supabase.from("profiles").update({ name, gender, age_range: ageRange, default_level: defaultLevel }).eq("id", data.user.id);
    }
    return { error: null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    setGuest(prev => { const next = { ...prev, active: false }; saveGuest(next); return next; });
    return { error: null };
  };

  const signInAsGuest = () => {
    setGuest(prev => {
      const next = { ...prev, active: true };
      saveGuest(next);
      return next;
    });
    setLoading(false);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setGuest(prev => { const next = { ...prev, active: false }; saveGuest(next); return next; });
    setUser(null); setSession(null); setProfile(null);
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (isGuest) {
      setGuest(prev => {
        const next = { ...prev, profile: { ...prev.profile, ...updates } };
        saveGuest(next);
        return next;
      });
      return;
    }
    if (!user) return;
    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.gender !== undefined) dbUpdates.gender = updates.gender;
    if (updates.age_range !== undefined) dbUpdates.age_range = updates.age_range;
    if (updates.default_level !== undefined) dbUpdates.default_level = updates.default_level;
    if (updates.photo_url !== undefined) dbUpdates.photo_url = updates.photo_url;
    await supabase.from("profiles").update(dbUpdates).eq("id", user.id);
    setProfile(prev => prev ? { ...prev, ...updates } : null);
  };


  const getWeeklyLimit = (): number => {
    switch (subscriptionType) {
      case "free": return 1;
      case "standard": return 20;
      case "evolution": return 50;
      case "vip": case "gold": return Infinity;
      default: return 1;
    }
  };

  const getMaxConcurrent = (): number => {
    switch (subscriptionType) {
      case "free": case "standard": return 1;
      case "evolution": return 2;
      case "vip": case "gold": return 3;
      default: return 1;
    }
  };

  const getEncyclopediaWeeklyLimit = (): number => {
    switch (subscriptionType) {
      case "evolution": return 1;
      case "vip": return 3;
      case "gold": return Infinity;
      default: return 0;
    }
  };

  const canAccessEncyclopedia = (): boolean => {
    return ["evolution", "vip", "gold"].includes(subscriptionType);
  };

  const canGenerate = () => {
    if (!profile) return false;
    const limit = getWeeklyLimit();
    if (limit === Infinity) return true;
    const currentWeek = getCurrentWeek();
    const count = profile.last_generation_week !== currentWeek ? 0 : profile.generations_this_week;
    return count < limit;
  };

  const canAskQuestion = () => {
    if (!profile) return false;
    if (isVip) return true;
    const today = getToday();
    if (profile.last_question_date !== today) return true;
    return profile.questions_today < 5;
  };

  const recordGeneration = async () => {
    if (!user || !profile) return;
    const currentWeek = getCurrentWeek();
    const newCount = profile.last_generation_week === currentWeek ? profile.generations_this_week + 1 : 1;
    await supabase.from("profiles").update({ generations_this_week: newCount, last_generation_week: currentWeek }).eq("id", user.id);
    setProfile(prev => prev ? { ...prev, generations_this_week: newCount, last_generation_week: currentWeek } : null);
  };

  const recordQuestion = async () => {
    if (!user || !profile) return;
    const today = getToday();
    const newCount = profile.last_question_date === today ? profile.questions_today + 1 : 1;
    await supabase.from("profiles").update({ questions_today: newCount, last_question_date: today }).eq("id", user.id);
    setProfile(prev => prev ? { ...prev, questions_today: newCount, last_question_date: today } : null);
  };

  const activateSubscription = async (type: SubscriptionType, plan: "yearly" | "lifetime") => {
    if (!user) return;
    const updates: any = { is_vip: type !== "free", vip_plan: plan, subscription_type: type };
    if (plan === "yearly") {
      const expires = new Date();
      expires.setFullYear(expires.getFullYear() + 1);
      updates.vip_expires_at = expires.toISOString();
    } else {
      updates.vip_expires_at = null;
    }
    await supabase.from("profiles").update(updates).eq("id", user.id);
    setProfile(prev => prev ? { ...prev, ...updates } : null);
  };

  return (
    <AuthContext.Provider value={{
      user, session, profile, loading, isVip, subscriptionType,
      signUp, signIn, signOut, updateProfile,
      canGenerate, canAskQuestion, recordGeneration, recordQuestion,
      activateSubscription, getMaxConcurrent, getWeeklyLimit, getEncyclopediaWeeklyLimit, canAccessEncyclopedia,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
