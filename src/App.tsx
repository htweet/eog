import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { NotificationProvider } from "@/components/notifications/NotificationProvider";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import Browse from "./pages/Browse";
import CreateTask from "./pages/CreateTask";
import TaskDetail from "./pages/TaskDetail";
import VerifyTask from "./pages/VerifyTask";
import ReviewTask from "./pages/ReviewTask";
import Wallet from "./pages/Wallet";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";
import Checkout from "./pages/Checkout";
import PaymentSuccess from "./pages/PaymentSuccess";
import Settings from "./pages/Settings";
import VoucherDashboardPage from "./pages/VoucherDashboardPage";
import RequesterDashboardPage from "./pages/RequesterDashboardPage";
import Install from "./pages/Install";
import Landing from "./pages/Landing";
import AgencyDashboard from "./pages/AgencyDashboard";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

// Root route component that handles landing vs authenticated redirect
function RootRoute() {
  const { user, loading, userRole, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not authenticated - show landing page
  if (!user) {
    return <Landing />;
  }

  // Authenticated - redirect to appropriate dashboard
  if (isAdmin) {
    return <Navigate to="/admin" replace />;
  } else if (userRole === "voucher") {
    return <Navigate to="/dashboard/voucher" replace />;
  } else if (userRole === "requester") {
    return <Navigate to="/dashboard/requester" replace />;
  }
  
  // Default fallback to Index
  return <Index />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <NotificationProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<RootRoute />} />
            <Route 
              path="/home" 
              element={
                <ProtectedRoute>
                  <Index />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/profile" 
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/browse" 
              element={
                <ProtectedRoute>
                  <Browse />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/create-task" 
              element={
                <ProtectedRoute requiredRole="requester">
                  <CreateTask />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/task/:id" 
              element={
                <ProtectedRoute>
                  <TaskDetail />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/task/:id/verify" 
              element={
                <ProtectedRoute requiredRole="voucher">
                  <VerifyTask />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/task/:id/review" 
              element={
                <ProtectedRoute requiredRole="requester">
                  <ReviewTask />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/wallet" 
              element={
                <ProtectedRoute>
                  <Wallet />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin" 
              element={
                <ProtectedRoute requiredRole="admin">
                  <Admin />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/checkout" 
              element={
                <ProtectedRoute>
                  <Checkout />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/payment-success" 
              element={
                <ProtectedRoute>
                  <PaymentSuccess />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/settings" 
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/voucher-dashboard" 
              element={
                <ProtectedRoute requiredRole="voucher">
                  <VoucherDashboardPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/dashboard/voucher" 
              element={
                <ProtectedRoute requiredRole="voucher">
                  <VoucherDashboardPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/dashboard/requester" 
              element={
                <ProtectedRoute requiredRole="requester">
                  <RequesterDashboardPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/dashboard/agency" 
              element={
                <ProtectedRoute requiredRole="voucher">
                  <AgencyDashboard />
                </ProtectedRoute>
              } 
            />
            <Route path="/install" element={<Install />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </NotificationProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
