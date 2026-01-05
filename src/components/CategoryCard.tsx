import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface CategoryCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  category: "auto" | "realestate" | "electronics" | "general";
  bountyCount: number;
  onClick?: () => void;
}

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

export function CategoryCard({
  title,
  description,
  icon: Icon,
  category,
  bountyCount,
  onClick,
}: CategoryCardProps) {
  const styles = categoryStyles[category];

  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative overflow-hidden rounded-lg p-6 text-left transition-all duration-300",
        "bg-card shadow-card hover:shadow-card-hover",
        "border border-border hover:border-transparent",
        "hover:-translate-y-1 active:scale-[0.98]"
      )}
    >
      {/* Gradient overlay on hover */}
      <div
        className={cn(
          "absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100",
          styles.gradient
        )}
      />

      {/* Content */}
      <div className="relative z-10">
        {/* Icon */}
        <div
          className={cn(
            "mb-4 inline-flex h-14 w-14 items-center justify-center rounded-xl transition-colors duration-300",
            styles.light,
            "group-hover:bg-white/20"
          )}
        >
          <Icon
            className={cn(
              "h-7 w-7 transition-colors duration-300",
              styles.text,
              "group-hover:text-white"
            )}
          />
        </div>

        {/* Title */}
        <h3 className="mb-2 text-lg font-bold text-foreground transition-colors duration-300 group-hover:text-white">
          {title}
        </h3>

        {/* Description */}
        <p className="mb-4 text-sm text-muted-foreground transition-colors duration-300 group-hover:text-white/80">
          {description}
        </p>

        {/* Bounty count */}
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold transition-colors duration-300",
              styles.light,
              styles.text,
              "group-hover:bg-white/20 group-hover:text-white"
            )}
          >
            {bountyCount} active bounties
          </span>
        </div>
      </div>
    </button>
  );
}
