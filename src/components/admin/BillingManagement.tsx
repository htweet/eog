import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  CreditCard, Users, Search, Loader2, RefreshCw, CheckCircle, XCircle,
  Clock, Crown, Eye, Banknote, AlertTriangle, Calendar,
} from "lucide-react";

interface Subscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: string;
  started_at: string;
  expires_at: string | null;
  cancelled_at: string | null;
  payment_reference: string | null;
  admin_notes: string | null;
  created_at: string | null;
  plan?: { name: string; price: number; billing_period: string };
  user?: { full_name: string | null };
}

type FilterStatus = "all" | "active" | "cancelled" | "expired";

export function BillingManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSub, setSelectedSub] = useState<Subscription | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [processing, setProcessing] = useState(false);

  const { data: subscriptions, isLoading, refetch } = useQuery({
    queryKey: ["admin-subscriptions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_subscriptions")
        .select(`*, plan:pricing_plans!user_subscriptions_plan_id_fkey (name, price, billing_period), user:profiles!user_subscriptions_user_id_fkey (full_name)`)
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) throw error;
      return data.map(s => ({
        ...s,
        plan: Array.isArray(s.plan) ? s.plan[0] : s.plan,
        user: Array.isArray(s.user) ? s.user[0] : s.user,
      })) as Subscription[];
    },
  });

  // Realtime subscription for updates
  useEffect(() => {
    const channel = supabase
      .channel("billing-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "user_subscriptions" }, () => {
        queryClient.invalidateQueries({ queryKey: ["admin-subscriptions"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const filtered = subscriptions?.filter(s => {
    const matchesStatus = statusFilter === "all" || s.status === statusFilter;
    const matchesSearch = !searchQuery ||
      s.user?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.plan?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.payment_reference?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  }) || [];

  const activeCount = subscriptions?.filter(s => s.status === "active").length || 0;
  const cancelledCount = subscriptions?.filter(s => s.status === "cancelled").length || 0;
  const totalRevenue = subscriptions?.filter(s => s.status === "active").reduce((sum, s) => sum + (s.plan?.price || 0), 0) || 0;

  const handleCancelSubscription = async () => {
    if (!selectedSub) return;
    setProcessing(true);
    try {
      await supabase.from("user_subscriptions").update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        admin_notes: adminNotes || "Cancelled by admin",
      } as any).eq("id", selectedSub.id);

      await supabase.from("notifications").insert({
        user_id: selectedSub.user_id,
        type: "subscription_cancelled",
        title: "Subscription Cancelled",
        message: `Your ${selectedSub.plan?.name || "subscription"} plan has been cancelled. ${adminNotes || ""}`,
      });

      toast({ title: "Subscription Cancelled" });
      setSelectedSub(null);
      setAdminNotes("");
      queryClient.invalidateQueries({ queryKey: ["admin-subscriptions"] });
    } catch {
      toast({ title: "Error", variant: "destructive" });
    } finally { setProcessing(false); }
  };

  const handleReactivate = async () => {
    if (!selectedSub) return;
    setProcessing(true);
    try {
      await supabase.from("user_subscriptions").update({
        status: "active",
        cancelled_at: null,
        admin_notes: adminNotes || "Reactivated by admin",
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      } as any).eq("id", selectedSub.id);

      await supabase.from("notifications").insert({
        user_id: selectedSub.user_id,
        type: "subscription_reactivated",
        title: "Subscription Reactivated! 🎉",
        message: `Your ${selectedSub.plan?.name || "subscription"} plan has been reactivated.`,
      });

      toast({ title: "Subscription Reactivated" });
      setSelectedSub(null);
      setAdminNotes("");
      queryClient.invalidateQueries({ queryKey: ["admin-subscriptions"] });
    } catch {
      toast({ title: "Error", variant: "destructive" });
    } finally { setProcessing(false); }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active": return <Badge className="bg-green-500/10 text-green-500 border-green-500/20"><CheckCircle className="h-3 w-3 mr-1" />Active</Badge>;
      case "cancelled": return <Badge className="bg-red-500/10 text-red-500 border-red-500/20"><XCircle className="h-3 w-3 mr-1" />Cancelled</Badge>;
      case "expired": return <Badge className="bg-muted text-muted-foreground"><Clock className="h-3 w-3 mr-1" />Expired</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{activeCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <Banknote className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₦{totalRevenue.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cancelled</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cancelledCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Subscribers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{subscriptions?.length || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5" />User Billing</CardTitle>
            <CardDescription>Manage user subscriptions and billing in real-time</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}><RefreshCw className="h-4 w-4 mr-2" />Refresh</Button>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search users, plans..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
            </div>
            <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as FilterStatus)}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="active">Active</TabsTrigger>
                <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
                <TabsTrigger value="expired">Expired</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" /><p>No subscriptions found</p>
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell className="font-medium">{sub.user?.full_name || "Unknown"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Crown className="h-3 w-3 text-amber-500" />
                          {sub.plan?.name || "Unknown"}
                        </div>
                      </TableCell>
                      <TableCell className="font-bold">₦{(sub.plan?.price || 0).toLocaleString()}<span className="text-xs text-muted-foreground">/{sub.plan?.billing_period || "mo"}</span></TableCell>
                      <TableCell>{getStatusBadge(sub.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{new Date(sub.started_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{sub.expires_at ? new Date(sub.expires_at).toLocaleDateString() : "—"}</TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" onClick={() => { setSelectedSub(sub); setAdminNotes(""); }}>
                          <Eye className="h-4 w-4 mr-1" />Manage
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Manage Dialog */}
      <Dialog open={!!selectedSub} onOpenChange={() => setSelectedSub(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Subscription</DialogTitle>
            <DialogDescription>Update subscription status for {selectedSub?.user?.full_name}</DialogDescription>
          </DialogHeader>
          {selectedSub && (
            <div className="space-y-4 py-2">
              <div className="p-4 rounded-lg bg-muted space-y-2">
                <div className="flex justify-between"><span className="text-muted-foreground">User</span><span className="font-medium">{selectedSub.user?.full_name}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Plan</span><span className="font-medium">{selectedSub.plan?.name}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Price</span><span className="font-bold">₦{(selectedSub.plan?.price || 0).toLocaleString()}/{selectedSub.plan?.billing_period}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Status</span>{getStatusBadge(selectedSub.status)}</div>
                <div className="flex justify-between"><span className="text-muted-foreground">Started</span><span>{new Date(selectedSub.started_at).toLocaleDateString()}</span></div>
                {selectedSub.payment_reference && <div className="flex justify-between"><span className="text-muted-foreground">Reference</span><span className="font-mono text-xs">{selectedSub.payment_reference}</span></div>}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Admin Notes</label>
                <Textarea placeholder="Add notes..." value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            {selectedSub?.status === "active" ? (
              <Button variant="destructive" onClick={handleCancelSubscription} disabled={processing}>
                {processing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <XCircle className="h-4 w-4 mr-1" />}Cancel Subscription
              </Button>
            ) : (
              <Button onClick={handleReactivate} disabled={processing}>
                {processing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle className="h-4 w-4 mr-1" />}Reactivate
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
