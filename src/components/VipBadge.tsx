import { Crown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const VipBadge = () => {
  const { isVip } = useAuth();
  const navigate = useNavigate();

  if (!isVip) return null;

  return (
    <button onClick={() => navigate("/vip")}
      className="fixed top-3 right-3 z-[60] flex items-center gap-1 bg-gradient-to-r from-primary to-primary/70 text-primary-foreground px-2.5 py-1 rounded-full shadow-lg text-[11px] font-bold">
      <Crown size={12} />
      VIP
    </button>
  );
};

export default VipBadge;
