import { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { Menu, Search } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import ProfileDrawer from "@/components/ProfileDrawer";

const DashboardLayout = () => {
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="app-shell min-h-screen bg-background">
      {/* Top bar */}
      <div className="flex items-center gap-3 p-4">
        <button onClick={() => setDrawerOpen(true)} className="text-foreground">
          <Menu className="w-5 h-5" />
        </button>
        <button
          onClick={() => navigate("/search")}
          className="flex-1 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary border border-border text-sm text-muted-foreground"
        >
          <Search className="w-4 h-4" />
          Search assets and symbols
        </button>
      </div>

      {/* Page content */}
      <Outlet />

      {/* Bottom nav */}
      <BottomNav />

      {/* Profile drawer */}
      <ProfileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
};

export default DashboardLayout;
