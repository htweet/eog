import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Wallet,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Building,
  Search,
  Filter
} from "lucide-react";
import { format } from "date-fns";

interface PayoutRequest {
  id: string;
  user_id: string;
  amount: number;
  status: string;
  bank_name: string | null;
  account_number: string | null;
  account_name: string | null;
  admin_notes: string | null;
  created_at: string;
  processed_at: string | null;
  user?: {
    full_name: string | null;
    email?: string;
  };
}

export const PayoutManagement = () => {
  const { toast } = useToast();
  const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    completed: 0,
    rejected: 0,
    totalAmount: 0
  });

  useEffect(() => {
    fetchPayouts();
  }, []);

  const fetchPayouts = async () => {
    try {
      const { data, error } = await supabase
        .from("payout_requests")
        .select(`
          *,
          user:profiles!payout_requests_user_id_fkey(full_name)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setPayouts(data || []);

      // Calculate stats
      const pending = data?.filter(p => p.status === "pending").length || 0;
      const approved = data?.filter(p => p.status === "approved").length || 0;
      const completed = data?.filter(p => p.status === "completed").length || 0;
      const rejected = data?.filter(p => p.status === "rejected").length || 0;
      const totalAmount = data?.filter(p => p.status === "completed").reduce((sum, p) => sum + p.amount, 0) || 0;

      setStats({ pending, approved, completed, rejected, totalAmount });
    } catch (error) {
      console.error("Error fetching payouts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleProcessPayout = async (payoutId: string, action: "approve" | "reject" | "complete") => {
    setProcessingId(payoutId);
    try {
      const { data: authData } = await supabase.auth.getUser();
      
      const newStatus = action === "approve" ? "approved" : action === "reject" ? "rejected" : "completed";

      const { error } = await supabase
        .from("payout_requests")
        .update({
          status: newStatus,
          admin_notes: adminNotes[payoutId] || null,
          processed_by: authData.user?.id,
          processed_at: new Date().toISOString()
        })
        .eq("id", payoutId);

      if (error) throw error;

      // Update transaction status if completed
      if (action === "complete") {
        const payout = payouts.find(p => p.id === payoutId);
        if (payout) {
          await supabase
            .from("transactions")
            .update({ status: "completed" })
            .eq("user_id", payout.user_id)
            .eq("type", "withdrawal")
            .eq("status", "pending");
        }
      }

      toast({
        title: `Payout ${action}d`,
        description: `The withdrawal request has been ${action}d`
      });

      fetchPayouts();
    } catch (error: any) {
      console.error("Error processing payout:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
      case "approved":
        return <Badge className="bg-accent text-accent-foreground"><CheckCircle className="w-3 h-3 mr-1" /> Approved</Badge>;
      case "completed":
        return <Badge className="bg-category-realestate text-white"><CheckCircle className="w-3 h-3 mr-1" /> Completed</Badge>;
      case "rejected":
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredPayouts = payouts.filter(p => 
    p.user?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.bank_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.account_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderPayoutCard = (payout: PayoutRequest) => (
    <Card key={payout.id} className="rounded-2xl shadow-card border-0">
      <CardContent className="p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">{payout.user?.full_name || "Unknown User"}</span>
              {getStatusBadge(payout.status)}
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-muted-foreground">Amount</p>
                <p className="font-bold text-lg">₦{payout.amount.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Requested</p>
                <p>{format(new Date(payout.created_at), "MMM dd, yyyy")}</p>
              </div>
            </div>

            <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <Building className="w-3 h-3" />
              {payout.bank_name} • ****{payout.account_number?.slice(-4)} • {payout.account_name}
            </div>
          </div>

          {payout.status === "pending" && (
            <div className="flex flex-col gap-2">
              <Textarea
                placeholder="Admin notes (optional)"
                value={adminNotes[payout.id] || ""}
                onChange={(e) => setAdminNotes(prev => ({ ...prev, [payout.id]: e.target.value }))}
                className="text-sm rounded-xl"
                rows={2}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleProcessPayout(payout.id, "reject")}
                  disabled={processingId === payout.id}
                  className="rounded-xl"
                >
                  <XCircle className="w-4 h-4 mr-1" />
                  Reject
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleProcessPayout(payout.id, "approve")}
                  disabled={processingId === payout.id}
                  className="rounded-xl"
                >
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Approve
                </Button>
              </div>
            </div>
          )}

          {payout.status === "approved" && (
            <Button
              size="sm"
              onClick={() => handleProcessPayout(payout.id, "complete")}
              disabled={processingId === payout.id}
              className="gradient-primary text-primary-foreground rounded-xl"
            >
              <Wallet className="w-4 h-4 mr-1" />
              Mark Paid
            </Button>
          )}

          {payout.admin_notes && (
            <div className="text-sm text-muted-foreground bg-muted/50 p-2 rounded-lg mt-2">
              Note: {payout.admin_notes}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return <div className="animate-pulse space-y-4">
      {[1, 2, 3].map(i => <div key={i} className="h-32 bg-muted rounded-2xl" />)}
    </div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="rounded-2xl shadow-card border-0">
          <CardContent className="p-4 text-center">
            <Clock className="w-6 h-6 mx-auto mb-2 text-yellow-500" />
            <p className="text-2xl font-bold">{stats.pending}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl shadow-card border-0">
          <CardContent className="p-4 text-center">
            <CheckCircle className="w-6 h-6 mx-auto mb-2 text-accent" />
            <p className="text-2xl font-bold">{stats.approved}</p>
            <p className="text-xs text-muted-foreground">Approved</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl shadow-card border-0">
          <CardContent className="p-4 text-center">
            <Wallet className="w-6 h-6 mx-auto mb-2 text-category-realestate" />
            <p className="text-2xl font-bold">{stats.completed}</p>
            <p className="text-xs text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl shadow-card border-0">
          <CardContent className="p-4 text-center">
            <XCircle className="w-6 h-6 mx-auto mb-2 text-destructive" />
            <p className="text-2xl font-bold">{stats.rejected}</p>
            <p className="text-xs text-muted-foreground">Rejected</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl shadow-card border-0">
          <CardContent className="p-4 text-center">
            <Wallet className="w-6 h-6 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">₦{(stats.totalAmount / 1000).toFixed(0)}k</p>
            <p className="text-xs text-muted-foreground">Total Paid</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by user, bank, or account name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 rounded-xl"
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="pending">
        <TabsList className="grid w-full grid-cols-4 rounded-xl">
          <TabsTrigger value="pending" className="rounded-lg">
            Pending ({stats.pending})
          </TabsTrigger>
          <TabsTrigger value="approved" className="rounded-lg">
            Approved ({stats.approved})
          </TabsTrigger>
          <TabsTrigger value="completed" className="rounded-lg">
            Completed ({stats.completed})
          </TabsTrigger>
          <TabsTrigger value="rejected" className="rounded-lg">
            Rejected ({stats.rejected})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4 mt-4">
          {filteredPayouts.filter(p => p.status === "pending").length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No pending withdrawal requests</p>
            </div>
          ) : (
            filteredPayouts.filter(p => p.status === "pending").map(renderPayoutCard)
          )}
        </TabsContent>

        <TabsContent value="approved" className="space-y-4 mt-4">
          {filteredPayouts.filter(p => p.status === "approved").map(renderPayoutCard)}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4 mt-4">
          {filteredPayouts.filter(p => p.status === "completed").map(renderPayoutCard)}
        </TabsContent>

        <TabsContent value="rejected" className="space-y-4 mt-4">
          {filteredPayouts.filter(p => p.status === "rejected").map(renderPayoutCard)}
        </TabsContent>
      </Tabs>
    </div>
  );
};
