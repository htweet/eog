import { cn } from "@/lib/utils";
import { usePresence } from "@/hooks/usePresence";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Video } from "lucide-react";

interface PresenceIndicatorProps {
  userId: string;
  className?: string;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
}

export function PresenceIndicator({ 
  userId, 
  className,
  showLabel = false,
  size = "md" 
}: PresenceIndicatorProps) {
  const { getUserPresence } = usePresence();
  const presence = getUserPresence(userId);

  const sizeClasses = {
    sm: "h-2 w-2",
    md: "h-3 w-3",
    lg: "h-4 w-4",
  };

  const statusColors = {
    online: "bg-green-500",
    busy: "bg-amber-500",
    away: "bg-yellow-500",
    offline: "bg-gray-400",
  };

  const statusLabels = {
    online: "Online",
    busy: "Verifying Task",
    away: "Away",
    offline: "Offline",
  };

  const status = presence?.status || "offline";
  const isStreaming = presence?.is_streaming;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={cn("flex items-center gap-1.5", className)}>
          <span 
            className={cn(
              "rounded-full ring-2 ring-background animate-pulse",
              sizeClasses[size],
              statusColors[status]
            )} 
          />
          {isStreaming && (
            <Video className="h-3 w-3 text-red-500 animate-pulse" />
          )}
          {showLabel && (
            <span className="text-xs text-muted-foreground">
              {isStreaming ? "Live" : statusLabels[status]}
            </span>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>{isStreaming ? "Currently Streaming Live" : statusLabels[status]}</p>
      </TooltipContent>
    </Tooltip>
  );
}
