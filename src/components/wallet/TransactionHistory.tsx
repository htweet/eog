import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useWallet } from "@/hooks/useWallet";
import { ArrowUpRight, ArrowDownLeft, Lock, Unlock, DollarSign, Loader2 } from "lucide-react";
import { format } from "date-fns";

const typeConfig = {
  deposit: {
    icon: ArrowDownLeft,
    label: "Deposit",
    color: "text-accent",
    bgColor: "bg-accent/10",
  },
  withdrawal: {
    icon: ArrowUpRight,
    label: "Withdrawal",
    color: "text-destructive",
    bgColor: "bg-destructive/10",
  },
  escrow_hold: {
    icon: Lock,
    label: "Escrow Hold",
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
  },
  escrow_release: {
    icon: Unlock,
    label: "Escrow Released",
    color: "text-accent",
    bgColor: "bg-accent/10",
  },
  bounty_earned: {
    icon: DollarSign,
    label: "Bounty Earned",
    color: "text-accent",
    bgColor: "bg-accent/10",
  },
  bounty_paid: {
    icon: DollarSign,
    label: "Bounty Paid",
    color: "text-muted-foreground",
    bgColor: "bg-muted",
  },
};

const statusColors: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  completed: "bg-accent/10 text-accent border-accent/20",
  failed: "bg-destructive/10 text-destructive border-destructive/20",
  cancelled: "bg-muted text-muted-foreground border-muted",
};

export function TransactionHistory() {
  const { transactions, loading } = useWallet();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transaction History</CardTitle>
        <CardDescription>Your recent wallet activity</CardDescription>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No transactions yet</p>
            <p className="text-sm">Your transaction history will appear here</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {transactions.map((tx) => {
                const config = typeConfig[tx.type as keyof typeof typeConfig] || typeConfig.deposit;
                const Icon = config.icon;
                const isPositive = tx.amount > 0;

                return (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`h-10 w-10 rounded-full ${config.bgColor} flex items-center justify-center`}>
                        <Icon className={`h-5 w-5 ${config.color}`} />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{config.label}</p>
                        <p className="text-sm text-muted-foreground">
                          {tx.description || format(new Date(tx.created_at), "MMM d, yyyy")}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-3">
                      <div>
                        <p className={`font-semibold ${isPositive ? "text-accent" : "text-foreground"}`}>
                          {isPositive ? "+" : ""}₦{Math.abs(tx.amount).toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(tx.created_at), "h:mm a")}
                        </p>
                      </div>
                      <Badge variant="outline" className={statusColors[tx.status]}>
                        {tx.status}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
