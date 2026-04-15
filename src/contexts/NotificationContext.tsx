import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";

interface NotificationContextType {
  notificationsEnabled: boolean;
  setNotificationsEnabled: (v: boolean) => void;
  sendNotification: (title: string, body: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [notificationsEnabled, setNotificationsEnabledState] = useState(() => {
    return localStorage.getItem("prisca-notifications") !== "false";
  });

  const setNotificationsEnabled = (v: boolean) => {
    setNotificationsEnabledState(v);
    localStorage.setItem("prisca-notifications", String(v));
    if (v && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  };

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    if (notificationsEnabled && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, [notificationsEnabled]);

  const sendNotification = useCallback((title: string, body: string) => {
    if (!notificationsEnabled) return;
    if ("Notification" in window && Notification.permission === "granted") {
      try {
        new Notification(title, { body, icon: "/favicon.ico" });
      } catch {
        if (navigator.serviceWorker?.controller) {
          navigator.serviceWorker.controller.postMessage({ type: "SHOW_NOTIFICATION", title, body });
        }
      }
    }
  }, [notificationsEnabled]);

  return (
    <NotificationContext.Provider value={{ notificationsEnabled, setNotificationsEnabled, sendNotification }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
};
