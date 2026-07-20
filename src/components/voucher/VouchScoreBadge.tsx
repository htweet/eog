import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

export interface VouchScoreBreakdown {
  completion_rate?: number;
  avg_rating_score?: number;
  gps_score?: number;
  speed_score?: number;
  dispute_penalty?: number;
  total_tasks?: number;
  completed_tasks?: number;
  disputed_tasks?: number;
}

interface VouchScoreBadgeProps {
  score: number;
  level: string;
  breakdown?: VouchScoreBreakdown;
  compact?: boolean;
  className?: string;
}

const LEVEL_CONFIG: Record<string, {
  emoji: string;
  label: string;
  color: string;
  bg: string;
  border: string;
  textColor: string;
  nextLevel: string;
  nextThreshold: number;
  gradient: string;
}> = {
  bronze: {
    emoji: "🥉",
    label: "Bronze",
    color: "#CD7F32",
    bg: "rgba(205,127,50,0.1)",
    border: "rgba(205,127,50,0.3)",
    textColor: "#CD7F32",
    nextLevel: "Silver",
    nextThreshold: 40,
    gradient: "from-amber-900/20 to-amber-700/10",
  },
  silver: {
    emoji: "🥈",
    label: "Silver",
    color: "#9CA3AF",
    bg: "rgba(156,163,175,0.1)",
    border: "rgba(156,163,175,0.3)",
    textColor: "#9CA3AF",
    nextLevel: "Gold",
    nextThreshold: 60,
    gradient: "from-gray-500/20 to-gray-400/10",
  },
  gold: {
    emoji: "🥇",
    label: "Gold",
    color: "#F59E0B",
    bg: "rgba(245,158,11,0.1)",
    border: "rgba(245,158,11,0.3)",
    textColor: "#F59E0B",
    nextLevel: "Platinum",
    nextThreshold: 80,
    gradient: "from-yellow-500/20 to-amber-400/10",
  },
  platinum: {
    emoji: "💎",
    label: "Platinum",
    color: "#34D399",
    bg: "rgba(52,211,153,0.1)",
    border: "rgba(52,211,153,0.3)",
    textColor: "#34D399",
    nextLevel: "Elite",
    nextThreshold: 95,
    gradient: "from-emerald-500/20 to-teal-400/10",
  },
  elite: {
    emoji: "⚡",
    label: "Elite",
    color: "#A78BFA",
    bg: "rgba(167,139,250,0.1)",
    border: "rgba(167,139,250,0.3)",
    textColor: "#A78BFA",
    nextLevel: "Max",
    nextThreshold: 100,
    gradient: "from-violet-500/20 to-purple-400/10",
  },
};

const BREAKDOWN_FACTORS = [
  { key: "completion_rate", label: "Completion Rate", weight: "30%", description: "% of accepted tasks completed" },
  { key: "avg_rating_score", label: "Avg Rating", weight: "25%", description: "Star ratings from requesters (×20)" },
  { key: "gps_score", label: "GPS Accuracy", weight: "20%", description: "% of verifications within 50m" },
  { key: "speed_score", label: "Speed Score", weight: "15%", description: "How quickly you submit verifications" },
];

function getProgressToNext(score: number, level: string): number {
  const thresholds: Record<string, [number, number]> = {
    bronze: [0, 40],
    silver: [40, 60],
    gold: [60, 80],
    platinum: [80, 95],
    elite: [95, 100],
  };
  const [min, max] = thresholds[level] || [0, 100];
  if (level === "elite") return 100;
  return Math.min(100, ((score - min) / (max - min)) * 100);
}

export function VouchScoreBadge({ score, level, breakdown, compact = false, className }: VouchScoreBadgeProps) {
  const config = LEVEL_CONFIG[level?.toLowerCase()] || LEVEL_CONFIG.bronze;
  const progressToNext = getProgressToNext(score, level?.toLowerCase() || "bronze");

  if (compact) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold border",
          className
        )}
        style={{ background: config.bg, borderColor: config.border, color: config.textColor }}
      >
        <span>{config.emoji}</span>
        <span>{config.label}</span>
        <span className="opacity-70 font-normal">·</span>
        <span>{score.toFixed(1)}</span>
      </span>
    );
  }

  return (
    <Card className={cn("overflow-hidden", className)}>
      <div
        className={cn("px-4 pt-4 pb-3 bg-gradient-to-r", config.gradient)}
        style={{ borderBottom: `1px solid ${config.border}` }}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{config.emoji}</span>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">VouchScore™</p>
              <p className="text-xl font-bold" style={{ color: config.textColor }}>
                {score.toFixed(1)}
                <span className="text-sm font-normal text-muted-foreground ml-1">/ 100</span>
              </p>
            </div>
          </div>
          <Badge
            className="text-xs font-bold border"
            style={{ background: config.bg, borderColor: config.border, color: config.textColor }}
          >
            {config.label} Voucher
          </Badge>
        </div>

        {/* Progress to next level */}
        {level?.toLowerCase() !== "elite" && (
          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>{config.label}</span>
              <span>{config.nextLevel} at {config.nextThreshold}</span>
            </div>
            <Progress value={progressToNext} className="h-1.5" />
          </div>
        )}
        {level?.toLowerCase() === "elite" && (
          <p className="text-xs text-muted-foreground">Maximum level achieved ⚡</p>
        )}
      </div>

      {/* Breakdown */}
      {breakdown && (
        <CardContent className="p-3 space-y-2">
          {BREAKDOWN_FACTORS.map(({ key, label, weight, description }) => {
            const value = breakdown[key as keyof VouchScoreBreakdown] ?? 0;
            return (
              <div key={key}>
                <div className="flex items-center justify-between mb-0.5">
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">{label}</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3 text-muted-foreground/50 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">{description} (weight: {weight})</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <span className="text-xs font-medium">{value.toFixed(0)}</span>
                </div>
                <Progress value={Math.min(100, value)} className="h-1" />
              </div>
            );
          })}
          {breakdown.dispute_penalty !== undefined && breakdown.dispute_penalty > 0 && (
            <p className="text-xs text-destructive mt-1">
              ⚠️ Dispute penalty: −{breakdown.dispute_penalty} pts ({breakdown.disputed_tasks} dispute{breakdown.disputed_tasks !== 1 ? "s" : ""})
            </p>
          )}
          {breakdown.total_tasks !== undefined && (
            <p className="text-xs text-muted-foreground pt-1 border-t">
              {breakdown.completed_tasks} of {breakdown.total_tasks} tasks completed
            </p>
          )}
        </CardContent>
      )}
    </Card>
  );
}
