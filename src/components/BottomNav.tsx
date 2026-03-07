import { Home, Search, PlusCircle, User, Settings, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { userRole, allRoles, isAdmin } = useAuth();
  const showAgency = isAdmin || allRoles.includes('voucher');

  // Determine home path based on active role
  const getHomePath = () => {
    if (userRole === "admin" || isAdmin) return "/admin";
    if (userRole === "voucher") return "/dashboard/voucher";
    if (userRole === "requester") return "/dashboard/requester";
    return "/";
  };

  const homePath = getHomePath();
  const isHomePage = location.pathname === "/" || 
                     location.pathname === "/admin" ||
                     location.pathname === "/dashboard/voucher" ||
                     location.pathname === "/dashboard/requester";

  const navItems = [
    { 
      icon: Home, 
      label: "Home", 
      path: homePath, 
      active: isHomePage
    },
    { 
      icon: Search, 
      label: "Browse", 
      path: "/browse", 
      active: location.pathname === "/browse" 
    },
    // Only show Post for requesters
    ...(userRole === "requester" ? [{
      icon: PlusCircle, 
      label: "Post", 
      path: "/create-task", 
      active: location.pathname === "/create-task",
      primary: true
    }] : []),
    { 
      icon: Settings, 
      label: "Settings", 
      path: "/settings", 
      active: location.pathname === "/settings" 
    },
    { 
      icon: User, 
      label: "Profile", 
      path: "/profile", 
      active: location.pathname === "/profile" 
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-lg md:hidden">
      <div className="flex h-16 items-center justify-around px-2">
        {navItems.map((item) => (
          <button
            key={item.label}
            onClick={() => navigate(item.path)}
            className={cn(
              "flex flex-col items-center gap-1 px-3 py-2 transition-colors",
              item.primary && "-mt-6"
            )}
          >
            {item.primary ? (
              <div className="flex h-14 w-14 items-center justify-center rounded-full gradient-primary shadow-button">
                <item.icon className="h-7 w-7 text-primary-foreground" />
              </div>
            ) : (
              <>
                <item.icon
                  className={cn(
                    "h-5 w-5",
                    item.active ? "text-primary" : "text-muted-foreground"
                  )}
                />
                <span
                  className={cn(
                    "text-xs",
                    item.active ? "font-medium text-primary" : "text-muted-foreground"
                  )}
                >
                  {item.label}
                </span>
              </>
            )}
          </button>
        ))}
      </div>
    </nav>
  );
}
