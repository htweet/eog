import { Bell, Menu, User } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";

interface HeaderProps {
  userName?: string;
}

export function Header({ userName = "Guest" }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-lg">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary">
            <span className="text-lg font-bold text-primary-foreground">V</span>
          </div>
          <span className="text-xl font-bold text-foreground">Vouch</span>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-1 md:flex">
          <Button variant="ghost" className="text-foreground">
            Browse
          </Button>
          <Button variant="ghost" className="text-foreground">
            My Tasks
          </Button>
          <Button variant="ghost" className="text-foreground">
            How it Works
          </Button>
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive" />
          </Button>

          {/* Profile */}
          <Button variant="ghost" size="icon" className="hidden md:flex">
            <User className="h-5 w-5" />
          </Button>

          {/* Mobile menu */}
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
