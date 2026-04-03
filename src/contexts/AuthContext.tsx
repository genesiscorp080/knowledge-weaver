import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

const PREMIUM_EMAILS = ["genesiscorp080@gmail.com", "juniormanfouo45@gmail.com"];

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
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  isVip: boolean;
  signUp: (email: string, password: string, name: string, gender: string, ageRange: string, defaultLevel: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  canGenerate: () => boolean;
  canAskQuestion: () => boolean;
  recordGeneration: () => Promise<void>;
  recordQuestion: () => Promise<void>;
  activateVip: (plan: "yearly" | "lifetime") => Promise<void>;
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

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const isPremiumEmail = (email: string) => PREMIUM_EMAILS.includes(email.toLowerCase());
  
  const isVip = profile ? (
    profile.is_vip || 
    isPremiumEmail(profile.email) ||
    (profile.vip_plan === "lifetime") ||
    (profile.vip_plan === "yearly" && profile.vip_expires_at && new Date(profile.vip_expires_at) > new Date())
  ) : false;

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    
    if (data && !error) {
      setProfile({
        name: data.name || "",
        email: data.email || "",
        gender: data.gender || "homme",
        age_range: data.age_range || "21-25",
        default_level: data.default_level || "licence",
        photo_url: data.photo_url,
        is_vip: data.is_vip || false,
        vip_plan: data.vip_plan,
        vip_expires_at: data.vip_expires_at,
        generations_this_week: data.generations_this_week || 0,
        last_generation_week: data.last_generation_week,
        questions_today: data.questions_today || 0,
        last_question_date: data.last_question_date,
      });
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setTimeout(() => fetchProfile(session.user.id), 0);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, name: string, gender: string, ageRange: string, defaultLevel: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });

    if (error) return { error: error.message };

    if (data.user) {
      // Update profile with extra data
      await supabase.from("profiles").update({
        name,
        gender,
        age_range: ageRange,
        default_level: defaultLevel,
      }).eq("id", data.user.id);
    }

    return { error: null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
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

  const canGenerate = () => {
    if (!profile) return false;
    if (isVip) return true;
    const currentWeek = getCurrentWeek();
    if (profile.last_generation_week !== currentWeek) return true;
    return profile.generations_this_week < 1;
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
    
    await supabase.from("profiles").update({
      generations_this_week: newCount,
      last_generation_week: currentWeek,
    }).eq("id", user.id);

    setProfile(prev => prev ? { ...prev, generations_this_week: newCount, last_generation_week: currentWeek } : null);
  };

  const recordQuestion = async () => {
    if (!user || !profile) return;
    const today = getToday();
    const newCount = profile.last_question_date === today ? profile.questions_today + 1 : 1;

    await supabase.from("profiles").update({
      questions_today: newCount,
      last_question_date: today,
    }).eq("id", user.id);

    setProfile(prev => prev ? { ...prev, questions_today: newCount, last_question_date: today } : null);
  };

  const activateVip = async (plan: "yearly" | "lifetime") => {
    if (!user) return;
    const updates: any = { is_vip: true, vip_plan: plan };
    if (plan === "yearly") {
      const expires = new Date();
      expires.setFullYear(expires.getFullYear() + 1);
      updates.vip_expires_at = expires.toISOString();
    }
    await supabase.from("profiles").update(updates).eq("id", user.id);
    setProfile(prev => prev ? { ...prev, ...updates } : null);
  };

  return (
    <AuthContext.Provider value={{
      user, session, profile, loading, isVip,
      signUp, signIn, signOut, updateProfile,
      canGenerate, canAskQuestion, recordGeneration, recordQuestion, activateVip,
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
