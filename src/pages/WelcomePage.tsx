import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { TrendingUp, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import heroBg from "@/assets/hero-bg.jpg";

const WelcomePage = () => {
  const navigate = useNavigate();

  return (
    <div className="app-shell min-h-screen relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <img src={heroBg} alt="" className="w-full h-full object-cover opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/80 to-background" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col min-h-screen px-6">
        {/* Top bar */}
        <div className="flex items-center justify-between pt-6 pb-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Globe className="w-4 h-4" />
            <select className="bg-transparent text-sm text-muted-foreground outline-none cursor-pointer">
              <option value="EN">EN</option>
              <option value="KN">KN</option>
              <option value="FR">FR</option>
            </select>
          </div>
          <span className="text-xl font-display font-bold text-primary">AllFx</span>
        </div>

        {/* Hero */}
        <div className="flex-1 flex flex-col justify-center items-center text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-8 mx-auto">
              <TrendingUp className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-4xl font-display font-bold mb-3">
              Welcome to{" "}
              <span className="text-primary">AllFx</span>
            </h1>
            <p className="text-muted-foreground text-base max-w-xs mx-auto leading-relaxed">
              Trade stocks, manage your portfolio, and grow your wealth — all from one place.
            </p>
          </motion.div>
        </div>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="pb-12 space-y-3"
        >
          <Button
            onClick={() => navigate("/login")}
            className="w-full h-14 text-base font-semibold"
          >
            I am a customer
          </Button>
          <Button
            onClick={() => navigate("/register")}
            variant="outline"
            className="w-full h-14 text-base font-semibold border-primary/30 text-primary hover:bg-primary/10"
          >
            Become a customer
          </Button>
        </motion.div>
      </div>
    </div>
  );
};

export default WelcomePage;
