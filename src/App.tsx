import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { NotificationProvider } from "@/components/notifications/NotificationProvider";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import Home from "./pages/Home";
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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <NotificationProvider>
          <InstallPrompt />
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route 
              path="/" 
              element={
                <ProtectedRoute>
                  <Home />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/dashboard/voucher" 
              element={
                <ProtectedRoute>
                  <VoucherDashboardPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/dashboard/requester" 
              element={
                <ProtectedRoute>
                  <RequesterDashboardPage />
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
                <ProtectedRoute>
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
                <ProtectedRoute>
                  <VerifyTask />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/task/:id/review" 
              element={
                <ProtectedRoute>
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
                <ProtectedRoute>
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
                <ProtectedRoute>
                  <VoucherDashboardPage />
                </ProtectedRoute>
              } 
            />
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
