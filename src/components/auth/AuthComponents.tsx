import { useState } from "react";
import { Eye, EyeOff, ArrowLeft, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface AuthInputProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  type?: string;
  prefix?: string;
  placeholder?: string;
}

export const AuthInput = ({ label, value, onChange, type = "text", prefix, placeholder }: AuthInputProps) => {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";

  return (
    <div className="space-y-1.5">
      <label className="text-sm text-muted-foreground font-medium">{label}</label>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{prefix}</span>
        )}
        <Input
          type={isPassword && !show ? "password" : "text"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`h-12 bg-secondary border-border text-foreground placeholder:text-muted-foreground ${prefix ? "pl-14" : ""}`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow(!show)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {show ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>
        )}
      </div>
    </div>
  );
};

interface MessageBannerProps {
  message: string;
  isSuccess: boolean;
}

export const MessageBanner = ({ message, isSuccess }: MessageBannerProps) => {
  if (!message) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-3 rounded-lg text-sm font-medium ${
        isSuccess ? "bg-accent/20 text-accent" : "bg-destructive/20 text-destructive"
      }`}
    >
      {message}
    </motion.div>
  );
};

interface AuthHeaderProps {
  onBack?: () => void;
  title?: string;
}

export const AuthHeader = ({ onBack, title }: AuthHeaderProps) => (
  <div className="flex items-center justify-between p-4">
    {onBack ? (
      <button onClick={onBack} className="text-foreground p-1">
        <ArrowLeft className="w-5 h-5" />
      </button>
    ) : <div />}
    <span className="text-lg font-display font-bold text-primary">AllFx</span>
  </div>
);

export const LoadingButton = ({
  loading,
  children,
  onClick,
  variant = "default",
  className = "",
}: {
  loading: boolean;
  children: React.ReactNode;
  onClick: () => void;
  variant?: "default" | "outline" | "secondary";
  className?: string;
}) => (
  <Button
    onClick={onClick}
    disabled={loading}
    variant={variant}
    className={`h-12 w-full text-base font-semibold ${className}`}
  >
    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : children}
  </Button>
);
