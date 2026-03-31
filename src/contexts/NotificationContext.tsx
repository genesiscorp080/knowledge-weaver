import { createContext, useContext, useState, ReactNode } from "react";

interface NotificationContextType {
  notificationsEnabled: boolean;
  setNotificationsEnabled: (enabled: boolean) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [notificationsEnabled, setNotificationsEnabledState] = useState(() => {
    const saved = localStorage.getItem("scribeai-notif");
    return saved !== "false";
  });

  const setNotificationsEnabled = (enabled: boolean) => {
    setNotificationsEnabledState(enabled);
    localStorage.setItem("scribeai-notif", String(enabled));
  };

  return (
    <NotificationContext.Provider value={{ notificationsEnabled, setNotificationsEnabled }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
};
