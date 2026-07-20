import { cn } from "@/lib/utils";
import { MapPin, Clock, DollarSign, LucideIcon, Car, Home, Smartphone, Package, Zap, Star } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { useEffect, useState } from "react";

interface BountyCardProps {
  title: string;
  location: string;
  distance: string;
  price: number;
  category: "auto" | "realestate" | "electronics" | "general";
  timePosted: string;
  urgency?: "low" | "medium" | "high";
  isPro?: boolean;
  isFlash?: boolean;
  flashExpiresAt?: string | null;
  isFeatured?: boolean;
  onClick?: () => void;
}

function FlashCountdown({ expiresAt }: { expiresAt: string }) {
  const [remaining, setRemaining] = useState("");

  useEffect(() => {
    const calc = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) { setRemaining("Expired"); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setRemaining(h > 0 ? `${h}h ${m}m` : `${m}m ${s}s`);
    };
    calc();
    const interval = setInterval(calc, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  return <span className="font-mono text-xs font-bold text-orange-500">{remaining}</span>;
}

const categoryIcons: Record<string, LucideIcon> = {
  auto: Car,
  realestate: Home,
  electronics: Smartphone,
  general: Package,
};

const categoryStyles = {
  auto: {
    gradient: "gradient-auto",
    light: "bg-category-auto-light",
    text: "text-category-auto",
  },
  realestate: {
    gradient: "gradient-realestate",
    light: "bg-category-realestate-light",
    text: "text-category-realestate",
  },
  electronics: {
    gradient: "gradient-electronics",
    light: "bg-category-electronics-light",
    text: "text-category-electronics",
  },
  general: {
    gradient: "gradient-general",
    light: "bg-category-general-light",
    text: "text-category-general",
  },
};

const urgencyStyles = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-category-general-light text-category-general",
  high: "bg-destructive/10 text-destructive",
};

export function BountyCard({
  title,
  location,
  distance,
  price,
  category,
  timePosted,
  urgency = "medium",
  isPro = false,
  isFlash = false,
  flashExpiresAt,
  isFeatured = false,
  onClick,
}: BountyCardProps) {
  const Icon = categoryIcons[category];
  const styles = categoryStyles[category];

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-lg bg-card p-4 transition-all duration-300",
        "shadow-card hover:shadow-card-hover",
        "border border-border",
        "animate-slide-in-up active:scale-[0.99]",
        isFlash && "border-orange-300 dark:border-orange-700",
        isFeatured && "ring-2 ring-violet-500/30"
      )}
      onClick={onClick}
    >
      {/* Indicator bar */}
      <div className={cn(
        "absolute left-0 top-0 h-full w-1",
        isFlash ? "bg-gradient-to-b from-orange-400 to-red-500" : styles.gradient
      )} />

      {/* Flash / Featured banners */}
      {isFlash && (
        <div className="absolute top-0 right-0 bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-bl-lg flex items-center gap-1">
          <Zap className="h-3 w-3" /> FLASH
        </div>
      )}
      {isFeatured && !isFlash && (
        <div className="absolute top-0 right-0 bg-violet-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-bl-lg flex items-center gap-1">
          <Star className="h-3 w-3" /> FEATURED
        </div>
      )}

      <div className="flex items-start gap-3">
        {/* Category icon */}
        <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl mt-0.5", styles.light)}>
          <Icon className={cn("h-5 w-5", styles.text)} />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex items-start justify-between gap-2 pr-1">
            <h3 className="line-clamp-2 font-semibold text-foreground text-sm leading-tight">{title}</h3>
            {!isFlash && (
              <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium mt-0.5", urgencyStyles[urgency])}>
                {urgency === "high" ? "Urgent" : urgency === "medium" ? "New" : "Open"}
              </span>
            )}
          </div>

          {/* Location */}
          <div className="mb-2 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">{location}</span>
            {distance && <><span className="mx-0.5">·</span><span className="shrink-0">{distance}</span></>}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-0.5">
                <span className="text-accent font-bold text-sm">₦</span>
                <span className="font-bold text-foreground">{price.toLocaleString()}</span>
              </div>
              {isPro && (
                <Badge className="text-[10px] px-1.5 py-0 h-4 bg-amber-500/10 text-amber-600 border-amber-500/20" variant="outline">PRO</Badge>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {isFlash && flashExpiresAt && (
                <div className="flex items-center gap-1 text-orange-500 text-xs">
                  <Clock className="h-3 w-3" />
                  <FlashCountdown expiresAt={flashExpiresAt} />
                </div>
              )}
              {!isFlash && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{timePosted}</span>
                </div>
              )}
              <Button
                size="sm"
                variant="trust"
                className="h-7 px-2.5 text-xs"
                onClick={(e) => { e.stopPropagation(); onClick?.(); }}
              >
                View
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
