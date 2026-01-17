import { cn } from "@/lib/utils";
import { MapPin, Clock, DollarSign, LucideIcon, Car, Home, Smartphone, Package } from "lucide-react";
import { Button } from "./ui/button";

interface BountyCardProps {
  title: string;
  location: string;
  distance: string;
  price: number;
  category: "auto" | "realestate" | "electronics" | "general";
  timePosted: string;
  urgency?: "low" | "medium" | "high";
  isPro?: boolean;
  onClick?: () => void;
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
  onClick,
}: BountyCardProps) {
  const Icon = categoryIcons[category];
  const styles = categoryStyles[category];

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-lg bg-card p-5 transition-all duration-300",
        "shadow-card hover:shadow-card-hover",
        "border border-border",
        "animate-slide-in-up"
      )}
    >
      {/* Category indicator bar */}
      <div className={cn("absolute left-0 top-0 h-full w-1", styles.gradient)} />

      <div className="flex items-start gap-4">
        {/* Category icon */}
        <div
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
            styles.light
          )}
        >
          <Icon className={cn("h-6 w-6", styles.text)} />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-start justify-between gap-2">
            <h3 className="truncate font-semibold text-foreground">{title}</h3>
            <span
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
                urgencyStyles[urgency]
              )}
            >
              {urgency === "high" ? "Urgent" : urgency === "medium" ? "New" : "Flexible"}
            </span>
          </div>

          {/* Location */}
          <div className="mb-3 flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            <span className="truncate">{location}</span>
            <span className="mx-1">•</span>
            <span className="shrink-0">{distance}</span>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Price */}
              <div className="flex items-center gap-1">
                <DollarSign className="h-4 w-4 text-accent" />
                <span className="font-bold text-foreground">${price}</span>
              </div>
              {/* Time */}
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>{timePosted}</span>
              </div>
            </div>

            <Button
              size="sm"
              variant="trust"
              onClick={onClick}
              className="h-8 px-3 text-xs"
            >
              View Details
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
