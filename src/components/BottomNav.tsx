import { Home, Search, PlusCircle, MessageSquare, User } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { icon: Home, label: "Home", active: true },
  { icon: Search, label: "Browse", active: false },
  { icon: PlusCircle, label: "Post", active: false, primary: true },
  { icon: MessageSquare, label: "Messages", active: false },
  { icon: User, label: "Profile", active: false },
];

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-lg md:hidden">
      <div className="flex h-16 items-center justify-around px-2">
        {navItems.map((item) => (
          <button
            key={item.label}
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
