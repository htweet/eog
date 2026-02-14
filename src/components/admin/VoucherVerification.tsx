import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  Shield, CheckCircle, XCircle, User, FileCheck, AlertTriangle,
  IdCard, Loader2, Search, RefreshCw, Eye, Clock,
} from "lucide-react";

interface VoucherProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  is_verified: boolean | null;
  trust_score: number | null;
  created_at: string | null;
  voucher_tier: string | null;
}

type ViewFilter = "all" | "pending" | "verified" | "rejected";

export function VoucherVerification() {
  const { toast } = useToast();
  const [vouchers, setVouchers] = useState<VoucherProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVoucher, setSelectedVoucher] = useState<VoucherProfile | null>(null);
  const [verificationNotes, setVerificationNotes] = useState("");
  const [processing, setProcessing] = useState(false);
  const [viewFilter, setViewFilter] = useState<ViewFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => { fetchVouchers(); }, []);

  const fetchVouchers = async () => {
    try {
      const { data: voucherRoles } = await supabase.from("user_roles").select("user_id").eq("role", "voucher");
      if (!voucherRoles) return;
      const ids = voucherRoles.map(r => r.user_id);
      const { data: profiles } = await supabase.from("profiles")
        .select("id, full_name, avatar_url, bio, is_verified, trust_score, created_at, voucher_tier")
        .in("id", ids)
        .order("created_at", { ascending: false });
      setVouchers(profiles || []);
    } catch (error) {
      console.error("Error:", error);
    } finally { setLoading(false); }
  };

  const verifyVoucher = async (voucherId: string, approved: boolean) => {
    setProcessing(true);
    try {
      const { error } = await supabase.from("profiles").update({
        is_verified: approved,
        trust_score: approved ? 7.0 : 3.0,
      }).eq("id", voucherId);
      if (error) throw error;

      await supabase.from("notifications").insert({
        user_id: voucherId,
        type: approved ? "verification_approved" : "verification_rejected",
        title: approved ? "Identity Verified ✅" : "Verification Update",
        message: approved
          ? "Your identity has been verified! You now have the verified badge and access to enhanced features."
          : `Your verification was not approved. ${verificationNotes || "Please ensure your documents are clear and try again."}`,
      });

      toast({
        title: approved ? "Voucher Verified" : "Verification Rejected",
        description: approved ? "Verified badge applied" : "User has been notified",
      });

      setSelectedVoucher(null);
      setVerificationNotes("");
      await fetchVouchers();
    } catch (error) {
      toast({ title: "Error", description: "Failed to update verification", variant: "destructive" });
    } finally { setProcessing(false); }
  };

  const filteredVouchers = vouchers.filter(v => {
    const matchesFilter = viewFilter === "all" || 
      (viewFilter === "verified" && v.is_verified) ||
      (viewFilter === "pending" && !v.is_verified) ||
      (viewFilter === "rejected" && v.is_verified === false && (v.trust_score || 5) < 4);
    const matchesSearch = !searchQuery || 
      v.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.bio?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const unverifiedCount = vouchers.filter(v => !v.is_verified).length;
  const verifiedCount = vouchers.filter(v => v.is_verified).length;

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Vouchers</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{vouchers.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Verified</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-green-500">{verifiedCount}</div></CardContent>
        </Card>
        <Card className={unverifiedCount > 0 ? "border-amber-500/50" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Verification</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${unverifiedCount > 0 ? "text-amber-500" : "text-muted-foreground"}`} />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-amber-500">{unverifiedCount}</div></CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Tabs value={viewFilter} onValueChange={(v) => setViewFilter(v as ViewFilter)}>
          <TabsList>
            <TabsTrigger value="all">All ({vouchers.length})</TabsTrigger>
            <TabsTrigger value="pending" className="gap-1">
              Pending {unverifiedCount > 0 && <Badge variant="destructive" className="h-5 min-w-5 text-[10px] px-1">{unverifiedCount}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="verified">Verified ({verifiedCount})</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search vouchers..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchVouchers()}><RefreshCw className="h-4 w-4 mr-2" />Refresh</Button>
      </div>

      {/* Voucher List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><IdCard className="h-5 w-5" />Voucher Verification</CardTitle>
          <CardDescription>Review and verify voucher identities with real-time persistence</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredVouchers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" /><p>No vouchers matching filter</p>
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <div className="space-y-3">
                {filteredVouchers.map((voucher) => (
                  <Card key={voucher.id} className={!voucher.is_verified ? "border-amber-500/30" : "border-green-500/20"}>
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={voucher.avatar_url || undefined} />
                            <AvatarFallback>{voucher.full_name?.[0]?.toUpperCase() || "V"}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold">{voucher.full_name || "Anonymous"}</h4>
                              {voucher.is_verified ? (
                                <Badge className="bg-green-500/10 text-green-500 border-green-500/20 text-xs"><CheckCircle className="h-3 w-3 mr-1" />Verified</Badge>
                              ) : (
                                <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-xs"><Clock className="h-3 w-3 mr-1" />Pending</Badge>
                              )}
                              {voucher.voucher_tier === "pro" && (
                                <Badge className="bg-primary/10 text-primary text-xs">PRO</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">{voucher.bio || "No bio provided"}</p>
                            <div className="flex items-center gap-3 mt-1">
                              <span className={`text-xs font-medium ${(voucher.trust_score || 5) >= 7 ? "text-green-500" : (voucher.trust_score || 5) >= 4 ? "text-amber-500" : "text-red-500"}`}>
                                Trust: {voucher.trust_score?.toFixed(1) || "5.0"}
                              </span>
                              <span className="text-xs text-muted-foreground">Joined {voucher.created_at ? new Date(voucher.created_at).toLocaleDateString() : "N/A"}</span>
                            </div>
                          </div>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => { setSelectedVoucher(voucher); setVerificationNotes(""); }}>
                          <Eye className="h-4 w-4 mr-1" />Review
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={!!selectedVoucher} onOpenChange={() => setSelectedVoucher(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Shield className="h-5 w-5" />Verify Voucher Identity</DialogTitle>
            <DialogDescription>Review and update verification status</DialogDescription>
          </DialogHeader>
          {selectedVoucher && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={selectedVoucher.avatar_url || undefined} />
                  <AvatarFallback className="text-lg">{selectedVoucher.full_name?.[0]?.toUpperCase() || "V"}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-lg">{selectedVoucher.full_name || "Anonymous"}</h3>
                  <p className="text-muted-foreground text-sm">{selectedVoucher.bio || "No bio"}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {selectedVoucher.is_verified ? (
                      <Badge className="bg-green-500/10 text-green-500 text-xs"><CheckCircle className="h-3 w-3 mr-1" />Currently Verified</Badge>
                    ) : (
                      <Badge className="bg-amber-500/10 text-amber-500 text-xs"><Clock className="h-3 w-3 mr-1" />Unverified</Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-muted space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Trust Score</span><span className="font-medium">{selectedVoucher.trust_score?.toFixed(1) || "5.0"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Tier</span><span className="capitalize font-medium">{selectedVoucher.voucher_tier || "standard"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Joined</span><span>{selectedVoucher.created_at ? new Date(selectedVoucher.created_at).toLocaleDateString() : "N/A"}</span></div>
              </div>
              <div className="space-y-2">
                <Label>Verification Notes</Label>
                <Textarea value={verificationNotes} onChange={(e) => setVerificationNotes(e.target.value)} placeholder="Add notes about verification decision..." rows={3} />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            {selectedVoucher?.is_verified ? (
              <Button variant="destructive" onClick={() => verifyVoucher(selectedVoucher!.id, false)} disabled={processing}>
                {processing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <XCircle className="h-4 w-4 mr-1" />}Revoke Verification
              </Button>
            ) : (
              <>
                <Button variant="outline" className="text-red-600 border-red-600" onClick={() => verifyVoucher(selectedVoucher!.id, false)} disabled={processing}>
                  {processing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <XCircle className="h-4 w-4 mr-1" />}Reject
                </Button>
                <Button className="bg-green-600 hover:bg-green-700" onClick={() => verifyVoucher(selectedVoucher!.id, true)} disabled={processing}>
                  {processing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle className="h-4 w-4 mr-1" />}Verify
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
