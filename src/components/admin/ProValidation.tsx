import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Building2,
  Check,
  X,
  Clock,
  FileText,
  User,
  Loader2,
  Eye,
  RefreshCw,
  Crown,
} from "lucide-react";

interface UpgradeRequest {
  id: string;
  user_id: string;
  company_name: string;
  registration_number: string;
  document_urls: string[];
  status: string;
  rejection_reason: string | null;
  created_at: string;
  user?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

export function ProValidation() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedRequest, setSelectedRequest] = useState<UpgradeRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [processing, setProcessing] = useState(false);

  const { data: requests, isLoading, refetch } = useQuery({
    queryKey: ["admin-pro-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pro_upgrade_requests")
        .select(`
          *,
          user:profiles!pro_upgrade_requests_user_id_fkey (full_name, avatar_url)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      return data.map(req => ({
        ...req,
        user: Array.isArray(req.user) ? req.user[0] : req.user
      })) as UpgradeRequest[];
    },
  });

  const pendingRequests = requests?.filter((r) => r.status === "pending") || [];

  const handleApprove = async () => {
    if (!selectedRequest) return;
    setProcessing(true);

    try {
      // Update request status
      await supabase
        .from("pro_upgrade_requests")
        .update({
          status: "approved",
          reviewed_at: new Date().toISOString(),
        } as any)
        .eq("id", selectedRequest.id);

      // Upgrade user to Pro
      await supabase
        .from("profiles")
        .update({ 
          voucher_tier: "pro",
          company_details: {
            company_name: selectedRequest.company_name,
            registration_number: selectedRequest.registration_number,
            staff_count: 0,
          }
        } as any)
        .eq("id", selectedRequest.user_id);

      // Send notification
      await supabase.from("notifications").insert({
        user_id: selectedRequest.user_id,
        type: "pro_approved",
        title: "Pro Account Approved! 🎉",
        message: `Congratulations! Your ${selectedRequest.company_name} business account has been upgraded to Pro.`,
      });

      toast({
        title: "Pro Account Approved",
        description: `${selectedRequest.company_name} has been upgraded to Pro`,
      });

      setSelectedRequest(null);
      queryClient.invalidateQueries({ queryKey: ["admin-pro-requests"] });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to approve request",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;
    setProcessing(true);

    try {
      // Update request status
      await supabase
        .from("pro_upgrade_requests")
        .update({
          status: "rejected",
          rejection_reason: rejectionReason || "Application did not meet requirements",
          reviewed_at: new Date().toISOString(),
        } as any)
        .eq("id", selectedRequest.id);

      // Revert to standard tier
      await supabase
        .from("profiles")
        .update({ voucher_tier: "standard" } as any)
        .eq("id", selectedRequest.user_id);

      // Send notification
      await supabase.from("notifications").insert({
        user_id: selectedRequest.user_id,
        type: "pro_rejected",
        title: "Pro Application Update",
        message: rejectionReason || "Your Pro account application was not approved. Please contact support for details.",
      });

      toast({
        title: "Request Rejected",
        description: "The user has been notified",
      });

      setSelectedRequest(null);
      setRejectionReason("");
      queryClient.invalidateQueries({ queryKey: ["admin-pro-requests"] });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reject request",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case "approved":
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20"><Check className="h-3 w-3 mr-1" />Approved</Badge>;
      case "rejected":
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20"><X className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Reviews</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingRequests.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
            <Building2 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{requests?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved Pros</CardTitle>
            <Crown className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {requests?.filter(r => r.status === "approved").length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Requests Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-amber-500" />
              Pro Upgrade Requests
            </CardTitle>
            <CardDescription>Review and validate business applications</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : requests?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No upgrade requests</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Applicant</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>RC Number</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests?.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        {request.user?.full_name || "Unknown"}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-amber-500" />
                        {request.company_name}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {request.registration_number}
                    </TableCell>
                    <TableCell>{getStatusBadge(request.status)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(request.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedRequest(request);
                          setRejectionReason("");
                        }}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Review
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-amber-500" />
              Review Pro Application
            </DialogTitle>
            <DialogDescription>
              Verify business credentials before approval
            </DialogDescription>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-4 py-4">
              <div className="p-4 rounded-lg bg-muted space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Applicant</span>
                  <span className="font-medium">{selectedRequest.user?.full_name || "Unknown"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Company Name</span>
                  <span className="font-medium">{selectedRequest.company_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Registration (RC)</span>
                  <span className="font-mono font-medium">{selectedRequest.registration_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Applied</span>
                  <span>{new Date(selectedRequest.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  {getStatusBadge(selectedRequest.status)}
                </div>
              </div>

              {selectedRequest.document_urls && selectedRequest.document_urls.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Uploaded Documents</label>
                  <div className="flex flex-wrap gap-2">
                    {selectedRequest.document_urls.map((url, index) => (
                      <Button key={index} variant="outline" size="sm" asChild>
                        <a href={url} target="_blank" rel="noopener noreferrer">
                          <FileText className="h-4 w-4 mr-1" />
                          Document {index + 1}
                        </a>
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {selectedRequest.status === "pending" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Rejection Reason (if rejecting)</label>
                  <Textarea
                    placeholder="Provide a reason for rejection..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                  />
                </div>
              )}

              {selectedRequest.rejection_reason && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <p className="text-sm text-destructive">
                    <strong>Rejection Reason:</strong> {selectedRequest.rejection_reason}
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            {selectedRequest?.status === "pending" && (
              <>
                <Button
                  variant="destructive"
                  onClick={handleReject}
                  disabled={processing}
                >
                  {processing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <X className="h-4 w-4 mr-1" />}
                  Reject
                </Button>
                <Button
                  onClick={handleApprove}
                  disabled={processing}
                  className="bg-gradient-to-r from-amber-500 to-amber-600"
                >
                  {processing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Check className="h-4 w-4 mr-1" />}
                  Approve Pro
                </Button>
              </>
            )}
            {selectedRequest?.status !== "pending" && (
              <Button variant="outline" onClick={() => setSelectedRequest(null)}>
                Close
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
