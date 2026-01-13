import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { CategoriesSection } from "@/components/CategoriesSection";
import { ActiveBountiesSection } from "@/components/ActiveBountiesSection";
import { HowItWorksSection } from "@/components/HowItWorksSection";
import { BottomNav } from "@/components/BottomNav";
import { RequesterDashboard } from "@/components/dashboard/RequesterDashboard";
import { VoucherDashboard } from "@/components/dashboard/VoucherDashboard";
import { RecentVerifications } from "@/components/home/RecentVerifications";

const Index = () => {
  const { userRole } = useAuth();

  // Show role-based dashboard if user has a role
  if (userRole === "requester") {
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-0">
        <Header />
        <main className="container py-8">
          <RequesterDashboard />
        </main>
        <BottomNav />
      </div>
    );
  }

  if (userRole === "voucher") {
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

  // Default landing page (for admin or fallback)
  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header />
      <main>
        <HeroSection />
        <RecentVerifications />
        <CategoriesSection />
        <ActiveBountiesSection />
        <HowItWorksSection />
      </main>
      <BottomNav />
    </div>
  );
};

export default Index;
