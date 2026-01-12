import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { RequesterDashboard } from "@/components/dashboard/RequesterDashboard";

const RequesterDashboardPage = () => {
  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header />
      <main className="container py-8">
        <RequesterDashboard />
      </main>
      <BottomNav />
    </div>
  );
};

export default RequesterDashboardPage;
