import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, Phone, User, MapPin, LogOut, ChevronRight, Pencil, X, Check } from "lucide-react";
import { getUserData, updateUserInfo, logout } from "@/lib/api-auth";
import { toast } from "sonner";

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

  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    country: "",
    state: "",
    city: "",
  });

  useEffect(() => {
    if (!open) return;
    const fetchUser = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const userId = localStorage.getItem("user_id") ?? "";
        const data = await getUserData(userId);
        setUser(data);
        // Pre-fill form with current values
        setForm({
          first_name: data.first_name ?? "",
          last_name: data.last_name ?? "",
          phone: data.phone ?? "",
          country: data.country ?? "",
          state: data.state ?? "",
          city: data.city ?? "",
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load profile");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, [open]);

  const handleSave = async () => {
    const userId = localStorage.getItem("user_id") ?? "";
    setIsSaving(true);
    try {
      await updateUserInfo(userId, form);
      setUser({ ...user, ...form });
      setIsEditing(false);
      toast.success("Profile updated successfully");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

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
            <button onClick={() => setIsLoading(true)} className="text-xs text-primary underline">
              Try again
            </button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="p-6 border-b border-border">
              <div className="flex items-start justify-between">
                <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xl font-bold mb-3">
                  {initials}
                </div>
                {/* Edit / Cancel toggle */}
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="p-2 rounded-lg bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                >
                  {isEditing ? <X className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
                </button>
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

            {/* Info / Edit form */}
            <div className="flex-1 overflow-y-auto">
              <div className="px-6 py-4">
                <p className="text-xs text-muted-foreground font-semibold uppercase mb-3">
                  {isEditing ? "Edit Profile" : "User Information"}
                </p>

                {isEditing ? (
                  <div className="space-y-3">
                    <EditField
                      label="First Name"
                      value={form.first_name}
                      onChange={(v) => setForm({ ...form, first_name: v })}
                    />
                    <EditField
                      label="Last Name"
                      value={form.last_name}
                      onChange={(v) => setForm({ ...form, last_name: v })}
                    />
                    <EditField
                      label="Phone"
                      value={form.phone}
                      onChange={(v) => setForm({ ...form, phone: v })}
                    />
                    <EditField
                      label="Country"
                      value={form.country}
                      onChange={(v) => setForm({ ...form, country: v })}
                    />
                    <EditField
                      label="State"
                      value={form.state}
                      onChange={(v) => setForm({ ...form, state: v })}
                    />
                    <EditField
                      label="City"
                      value={form.city}
                      onChange={(v) => setForm({ ...form, city: v })}
                    />

                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50 mt-2"
                    >
                      <Check className="w-4 h-4" />
                      {isSaving ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                ) : (
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
                )}
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

const EditField = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) => (
  <div>
    <p className="text-xs text-muted-foreground mb-1">{label}</p>
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:border-primary transition-colors"
    />
  </div>
);

export default ProfileDrawer;