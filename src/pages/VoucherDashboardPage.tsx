import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { VoucherDashboard } from "@/components/dashboard/VoucherDashboard";

export default function VoucherDashboardPage() {
  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header />
      <main className="container py-8">
        <VoucherDashboard />
      </main>
      <BottomNav />
    </div>
  );
}
