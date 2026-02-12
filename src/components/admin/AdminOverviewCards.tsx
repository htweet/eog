import { Card, CardContent } from "@/components/ui/card";
import {
  Users,
  ClipboardList,
  AlertTriangle,
  TrendingUp,
  Wallet,
  Activity,
} from "lucide-react";

interface AdminStats {
  totalUsers: number;
  totalTasks: number;
  totalTransactions: number;
  pendingDisputes: number;
  totalBountyPaid: number;
  activeTasksCount: number;
}

export function AdminOverviewCards({ stats }: { stats: AdminStats }) {
  const cards = [
    {
      label: "Total Users",
      value: stats.totalUsers.toLocaleString(),
      sub: "Registered accounts",
      icon: Users,
      iconColor: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      label: "Total Tasks",
      value: stats.totalTasks.toLocaleString(),
      sub: `${stats.activeTasksCount} active`,
      icon: ClipboardList,
      iconColor: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: "Bounty Paid",
      value: `₦${stats.totalBountyPaid.toLocaleString()}`,
      sub: `${stats.totalTransactions} transactions`,
      icon: Wallet,
      iconColor: "text-accent",
      bgColor: "bg-accent/10",
    },
    {
      label: "Active Rate",
      value: stats.totalTasks > 0
        ? `${((stats.activeTasksCount / stats.totalTasks) * 100).toFixed(0)}%`
        : "0%",
      sub: "Tasks in progress",
      icon: Activity,
      iconColor: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      label: "Disputes",
      value: stats.pendingDisputes.toString(),
      sub: stats.pendingDisputes > 0 ? "Require attention" : "All clear",
      icon: AlertTriangle,
      iconColor: stats.pendingDisputes > 0 ? "text-destructive" : "text-green-500",
      bgColor: stats.pendingDisputes > 0 ? "bg-destructive/10" : "bg-green-500/10",
    },
    {
      label: "Avg. Bounty",
      value: stats.totalTasks > 0
        ? `₦${Math.round(stats.totalBountyPaid / Math.max(stats.totalTransactions, 1)).toLocaleString()}`
        : "₦0",
      sub: "Per transaction",
      icon: TrendingUp,
      iconColor: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
  ];

  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {cards.map((card) => (
        <Card key={card.label} className="relative overflow-hidden border-border/50 hover:shadow-card-hover transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className={`h-9 w-9 rounded-lg ${card.bgColor} flex items-center justify-center`}>
                <card.icon className={`h-4.5 w-4.5 ${card.iconColor}`} />
              </div>
            </div>
            <div className="text-2xl font-bold tracking-tight">{card.value}</div>
            <p className="text-xs text-muted-foreground mt-1">{card.label}</p>
            <p className="text-[10px] text-muted-foreground/70 mt-0.5">{card.sub}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
