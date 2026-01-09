import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  Shield,
  CheckCircle,
  XCircle,
  User,
  FileCheck,
  AlertTriangle,
  Camera,
  IdCard,
  Loader2,
} from "lucide-react";

interface VoucherRequest {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  is_verified: boolean | null;
  trust_score: number | null;
  created_at: string | null;
}

export function VoucherVerification() {
  const { toast } = useToast();
  const [vouchers, setVouchers] = useState<VoucherRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVoucher, setSelectedVoucher] = useState<VoucherRequest | null>(null);
  const [verificationNotes, setVerificationNotes] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchVouchers();
  }, []);

  const fetchVouchers = async () => {
    try {
      // Get all voucher user IDs
      const { data: voucherRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "voucher");

      if (!voucherRoles) return;

      const voucherIds = voucherRoles.map((r) => r.user_id);

      // Get profiles for these vouchers
      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .in("id", voucherIds)
        .order("created_at", { ascending: false });

      setVouchers(profiles || []);
    } catch (error) {
      console.error("Error fetching vouchers:", error);
    } finally {
      setLoading(false);
    }
  };

  const verifyVoucher = async (voucherId: string, approved: boolean) => {
    setProcessing(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          is_verified: approved,
          trust_score: approved ? 7.0 : 3.0, // Boost trust score on verification
        })
        .eq("id", voucherId);

      if (error) throw error;

      // Create notification for the voucher
      await supabase.from("notifications").insert({
        user_id: voucherId,
        type: approved ? "verification_approved" : "verification_rejected",
        title: approved ? "Verification Approved" : "Verification Update",
        message: approved
          ? "Congratulations! Your identity has been verified. You now have access to enhanced features."
          : "Your verification request has been reviewed. Please ensure your documents are clear and try again.",
      });

      toast({
        title: approved ? "Voucher Verified" : "Verification Rejected",
        description: approved
          ? "The voucher has been successfully verified"
          : "The voucher's verification request has been rejected",
      });

      setSelectedVoucher(null);
      setVerificationNotes("");
      await fetchVouchers();
    } catch (error) {
      console.error("Error verifying voucher:", error);
      toast({
        title: "Error",
        description: "Failed to update verification status",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const unverifiedVouchers = vouchers.filter((v) => !v.is_verified);
  const verifiedVouchers = vouchers.filter((v) => v.is_verified);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Vouchers</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{vouchers.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Verified</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{verifiedVouchers.length}</div>
          </CardContent>
        </Card>
        <Card className={unverifiedVouchers.length > 0 ? "border-amber-500/50" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Verification</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${unverifiedVouchers.length > 0 ? "text-amber-500" : "text-muted-foreground"}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-500">{unverifiedVouchers.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Verification */}
      {unverifiedVouchers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IdCard className="h-5 w-5" />
              Pending Verification Requests
            </CardTitle>
            <CardDescription>Review and verify voucher identities</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="space-y-4">
                {unverifiedVouchers.map((voucher) => (
                  <Card key={voucher.id} className="border-amber-500/30">
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={voucher.avatar_url || undefined} />
                            <AvatarFallback>
                              {voucher.full_name?.[0]?.toUpperCase() || "V"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h4 className="font-semibold">{voucher.full_name || "Anonymous"}</h4>
                            <p className="text-sm text-muted-foreground">{voucher.bio || "No bio provided"}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                Trust: {voucher.trust_score?.toFixed(1) || "5.0"}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                Joined {new Date(voucher.created_at || "").toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedVoucher(voucher)}
                              >
                                <FileCheck className="h-4 w-4 mr-1" />
                                Review
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Verify Voucher Identity</DialogTitle>
                                <DialogDescription>
                                  Review the voucher's information and verify their identity
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 py-4">
                                <div className="flex items-center gap-4">
                                  <Avatar className="h-16 w-16">
                                    <AvatarImage src={voucher.avatar_url || undefined} />
                                    <AvatarFallback>
                                      {voucher.full_name?.[0]?.toUpperCase() || "V"}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <h3 className="font-semibold text-lg">{voucher.full_name || "Anonymous"}</h3>
                                    <p className="text-muted-foreground">{voucher.bio || "No bio"}</p>
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <Label>Verification Notes</Label>
                                  <Textarea
                                    value={verificationNotes}
                                    onChange={(e) => setVerificationNotes(e.target.value)}
                                    placeholder="Add notes about the verification decision..."
                                    rows={3}
                                  />
                                </div>
                              </div>
                              <DialogFooter className="gap-2">
                                <Button
                                  variant="outline"
                                  className="text-red-600 border-red-600 hover:bg-red-50"
                                  onClick={() => verifyVoucher(voucher.id, false)}
                                  disabled={processing}
                                >
                                  {processing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <XCircle className="h-4 w-4 mr-1" />}
                                  Reject
                                </Button>
                                <Button
                                  className="bg-green-600 hover:bg-green-700"
                                  onClick={() => verifyVoucher(voucher.id, true)}
                                  disabled={processing}
                                >
                                  {processing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                                  Approve & Verify
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Verified Vouchers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-500" />
            Verified Vouchers
          </CardTitle>
          <CardDescription>All verified vouchers on the platform</CardDescription>
        </CardHeader>
        <CardContent>
          {verifiedVouchers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No verified vouchers yet</p>
            </div>
          ) : (
            <ScrollArea className="h-[300px]">
              <div className="grid gap-4 md:grid-cols-2">
                {verifiedVouchers.map((voucher) => (
                  <Card key={voucher.id} className="border-green-500/30">
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={voucher.avatar_url || undefined} />
                          <AvatarFallback>
                            {voucher.full_name?.[0]?.toUpperCase() || "V"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{voucher.full_name || "Anonymous"}</h4>
                            <Badge className="bg-green-500/10 text-green-500 text-xs">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Verified
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Trust Score: {voucher.trust_score?.toFixed(1) || "5.0"}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
