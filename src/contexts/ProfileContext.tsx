import { createContext, useContext, useState, ReactNode } from "react";

export interface UserProfile {
  name: string;
  photo: string;
  defaultLevel: string;
  gender: "homme" | "femme" | "";
  ageRange: string;
}

interface ProfileContextType {
  profile: UserProfile;
  updateProfile: (updates: Partial<UserProfile>) => void;
}

const PROFILE_KEY = "prisca-profile";

const defaultProfile: UserProfile = {
  name: "",
  photo: "",
  defaultLevel: "licence",
  gender: "",
  ageRange: "",
};

const loadProfile = (): UserProfile => {
  try {
    const saved = localStorage.getItem(PROFILE_KEY);
    if (!saved) return defaultProfile;
    return { ...defaultProfile, ...JSON.parse(saved) };
  } catch { return defaultProfile; }
};

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export const ProfileProvider = ({ children }: { children: ReactNode }) => {
  const [profile, setProfile] = useState<UserProfile>(loadProfile);

  const updateProfile = (updates: Partial<UserProfile>) => {
    setProfile((prev) => {
      const next = { ...prev, ...updates };
      localStorage.setItem(PROFILE_KEY, JSON.stringify(next));
      return next;
    });
  };

  return (
    <ProfileContext.Provider value={{ profile, updateProfile }}>
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfile = () => {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be used within ProfileProvider");
  return ctx;
};
