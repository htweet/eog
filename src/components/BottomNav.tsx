import { Home, Search, PlusCircle, MessageSquare, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { userRole } = useAuth();

  const navItems = [
    { icon: Home, label: "Home", path: "/", active: location.pathname === "/" },
    { icon: Search, label: "Browse", path: "/browse", active: location.pathname === "/browse" },
    { icon: PlusCircle, label: "Post", path: "/create-task", active: location.pathname === "/create-task", primary: true, showFor: "requester" },
    { icon: MessageSquare, label: "Messages", path: "/messages", active: location.pathname === "/messages" },
    { icon: User, label: "Profile", path: "/profile", active: location.pathname === "/profile" },
  ];

  // Filter nav items based on role (vouchers don't see Post button)
  const filteredNavItems = navItems.filter(item => {
    if (item.showFor && item.showFor !== userRole) {
      return false;
    }
    return true;
  });

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-lg md:hidden">
      <div className="flex h-16 items-center justify-around px-2">
        {filteredNavItems.map((item) => (
          <button
            key={item.label}
            onClick={() => navigate(item.path)}
            className={cn(
              "flex flex-col items-center gap-1 px-4 py-2 transition-colors",
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
                    "h-6 w-6",
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
