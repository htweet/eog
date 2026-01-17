import { Badge } from "@/components/ui/badge";
import { Shield, Star, Building2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProBadgeProps {
  tier: 'standard' | 'pro' | 'pending_pro';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export function ProBadge({ tier, size = 'md', showLabel = true, className }: ProBadgeProps) {
  if (tier === 'standard') {
    return null;
  }

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  if (tier === 'pending_pro') {
    return (
      <Badge 
        variant="outline" 
        className={cn(
          "bg-amber-500/10 text-amber-500 border-amber-500/30 gap-1",
          sizeClasses[size],
          className
        )}
      >
        <Clock className={iconSizes[size]} />
        {showLabel && "Pending Pro"}
      </Badge>
    );
  }

  return (
    <Badge 
      className={cn(
        "bg-gradient-to-r from-amber-500 to-amber-600 text-white border-0 gap-1 shadow-lg shadow-amber-500/20",
        sizeClasses[size],
        className
      )}
    >
      <Building2 className={iconSizes[size]} />
      {showLabel && "PRO"}
      <Star className={cn(iconSizes[size], "fill-current")} />
    </Badge>
  );
}

interface ProVerifiedBadgeProps {
  className?: string;
}

export function ProVerifiedBadge({ className }: ProVerifiedBadgeProps) {
  return (
    <Badge 
      variant="outline"
      className={cn(
        "bg-primary/10 text-primary border-primary/30 gap-1",
        className
      )}
    >
      <Shield className="h-3 w-3" />
      Registered Business
    </Badge>
  );
}

export function StaffVerifiedBadge({ className }: ProVerifiedBadgeProps) {
  return (
    <Badge 
      variant="outline"
      className={cn(
        "bg-green-500/10 text-green-500 border-green-500/30 gap-1",
        className
      )}
    >
      <Shield className="h-3 w-3" />
      Staff Verified
    </Badge>
  );
}
