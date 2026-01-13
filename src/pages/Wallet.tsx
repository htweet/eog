import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { WalletCard } from "@/components/wallet/WalletCard";
import { TransactionHistory } from "@/components/wallet/TransactionHistory";
import { WithdrawalCard } from "@/components/wallet/WithdrawalCard";
import { useAuth } from "@/contexts/AuthContext";

export default function Wallet() {
  const { userRole } = useAuth();

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header />
      <main className="container py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground sm:text-3xl">My Wallet</h1>
            <p className="text-muted-foreground">
              {userRole === "requester" 
                ? "Manage funds for task bounties"
                : "Track your earnings and withdraw funds"
              }
            </p>
          </div>

          <WalletCard />
          {userRole === "voucher" && <WithdrawalCard />}
          <TransactionHistory />
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
