import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { WalletCard } from "@/components/wallet/WalletCard";
import { TransactionHistory } from "@/components/wallet/TransactionHistory";
import { VouchCreditsPanel } from "@/components/wallet/VouchCreditsPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { Wallet as WalletIcon, Zap } from "lucide-react";

export default function Wallet() {
  const { userRole } = useAuth();

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header />
      <main className="container py-6 md:py-8">
        <div className="max-w-2xl mx-auto space-y-5">
          <div>
            <h1 className="text-2xl font-bold text-foreground">My Wallet</h1>
            <p className="text-muted-foreground text-sm">
              {userRole === "requester"
                ? "Manage funds for task bounties"
                : "Track earnings, credits &amp; rewards"}
            </p>
          </div>

          <WalletCard />

          <Tabs defaultValue="naira">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="naira" className="gap-2">
                <WalletIcon className="h-4 w-4" /> Naira Wallet
              </TabsTrigger>
              <TabsTrigger value="credits" className="gap-2">
                <Zap className="h-4 w-4" /> Vouch Credits™
              </TabsTrigger>
            </TabsList>

            <TabsContent value="naira" className="mt-4">
              <TransactionHistory />
            </TabsContent>

            <TabsContent value="credits" className="mt-4">
              <VouchCreditsPanel />
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
