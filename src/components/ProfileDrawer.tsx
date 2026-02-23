import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, Phone, User, MapPin, LogOut, ChevronRight } from "lucide-react";
import { getUserData, logout } from "@/lib/api-auth";

interface ProfileDrawerProps {
  open: boolean;
  onClose: () => void;
}

const formatCurrency = (value: number) =>
  value.toLocaleString("en-RW", { minimumFractionDigits: 2 });

const ProfileDrawer = ({ open, onClose }: ProfileDrawerProps) => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const fetchUser = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const userId = localStorage.getItem("user_id") ?? "";
        const data = await getUserData(userId);
        setUser(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load profile");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, [open]); // re-fetch every time drawer opens

  const handleLogout = async () => {
    onClose();
    await logout();
    navigate("/");
  };

  if (!open) return null;

  const initials = user
    ? `${user.first_name?.[0] ?? ""}${user.last_name?.[0] ?? ""}`.toUpperCase()
    : "?";

  const location = user
    ? [user.country, user.state, user.city].filter(Boolean).join(" - ") || "—"
    : "—";

  return (
    <>
      {/* Overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-background/60 backdrop-blur-sm z-50"
        onClick={onClose}
      />

      {/* Drawer */}
      <motion.div
        initial={{ x: "-100%" }}
        animate={{ x: 0 }}
        exit={{ x: "-100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="fixed inset-y-0 left-0 w-80 max-w-[85vw] bg-card border-r border-border z-50 flex flex-col"
      >
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-muted-foreground animate-pulse">Loading profile...</p>
          </div>
        ) : error ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 px-6">
            <p className="text-sm text-destructive text-center">{error}</p>
            <button
              onClick={() => setIsLoading(true)}
              className="text-xs text-primary underline"
            >
              Try again
            </button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="p-6 border-b border-border">
              <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xl font-bold mb-3">
                {initials}
              </div>
              <h2 className="text-lg font-display font-bold">
                {user?.first_name} {user?.last_name}
              </h2>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>

            {/* Balance */}
            {user?.account_balance !== undefined && (
              <div className="px-6 py-4 border-b border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Balance</p>
                    <p className="text-lg font-semibold">
                      RWF {formatCurrency(parseFloat(user.account_balance ?? 0))}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
            )}

            {/* Info */}
            <div className="flex-1 overflow-y-auto">
              <div className="px-6 py-4">
                <p className="text-xs text-muted-foreground font-semibold uppercase mb-3">
                  User Information
                </p>
                <div className="space-y-4">
                  <ProfileItem icon={Mail} label="Email" value={user?.email ?? "—"} />
                  <ProfileItem icon={Phone} label="Phone" value={user?.phone ?? "—"} />
                  <ProfileItem
                    icon={User}
                    label="Name"
                    value={`${user?.first_name ?? ""} ${user?.last_name ?? ""}`.trim() || "—"}
                  />
                  <ProfileItem icon={MapPin} label="Location" value={location} />
                </div>
              </div>
            </div>
          </>
        )}

        {/* Logout — always visible */}
        <div className="p-4 border-t border-border">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full p-3 rounded-xl text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-sm font-medium">Log Out</span>
          </button>
        </div>
      </motion.div>
    </>
  );
};

const ProfileItem = ({ icon: Icon, label, value }: { icon: any; label: string; value: string }) => (
  <div className="flex items-start gap-3">
    <Icon className="w-4 h-4 text-muted-foreground mt-0.5" />
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm">{value}</p>
    </div>
  </div>
);

export default ProfileDrawer;