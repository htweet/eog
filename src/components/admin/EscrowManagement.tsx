import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useEscrow } from "@/hooks/useEscrow";
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
  Lock,
  Unlock,
  RefreshCcw,
  AlertTriangle,
  Loader2,
  Eye,
  RefreshCw,
  Banknote,
  Clock,
  Check,
  X,
  ArrowRightLeft,
} from "lucide-react";

interface EscrowTransaction {
  id: string;
  task_id: string;
  requester_id: string;
  voucher_id: string | null;
  amount: number;
  platform_fee: number;
  status: 'held' | 'released' | 'refunded' | 'disputed';
  held_at: string;
  released_at: string | null;
  refunded_at: string | null;
  notes: string | null;
  task?: {
    title: string;
    status: string;
  };
  task_voucher_id?: string | null;
  requester?: {
    full_name: string | null;
  };
  voucher?: {
    full_name: string | null;
  };
}

export function EscrowManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { releaseEscrow, refundEscrow, settings } = useEscrow();
  const [selectedEscrow, setSelectedEscrow] = useState<EscrowTransaction | null>(null);
  const [actionType, setActionType] = useState<'release' | 'refund' | null>(null);
  const [notes, setNotes] = useState("");
  const [processing, setProcessing] = useState(false);

  const { data: escrowTransactions, isLoading, refetch } = useQuery({
    queryKey: ["admin-escrow"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("escrow_transactions")
        .select(`
          *,
          task:tasks!escrow_transactions_task_id_fkey (title, status),
          requester:profiles!escrow_transactions_requester_id_fkey (full_name),
          voucher:profiles!escrow_transactions_voucher_id_fkey (full_name)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      return data.map(tx => ({
        ...tx,
        task: Array.isArray(tx.task) ? tx.task[0] : tx.task,
        requester: Array.isArray(tx.requester) ? tx.requester[0] : tx.requester,
        voucher: Array.isArray(tx.voucher) ? tx.voucher[0] : tx.voucher,
      })) as EscrowTransaction[];
    },
  });

  const heldEscrows = escrowTransactions?.filter((t) => t.status === "held") || [];
  const totalHeld = heldEscrows.reduce((sum, t) => sum + t.amount, 0);

  const handleRelease = async () => {
    if (!selectedEscrow || !selectedEscrow.task?.voucher_id) {
      toast({
        title: "Error",
        description: "No voucher assigned to this task",
        variant: "destructive",
      });
      return;
    }
    
    setProcessing(true);
    const result = await releaseEscrow(selectedEscrow.task_id, selectedEscrow.task.voucher_id);
    setProcessing(false);

    if (result.success) {
      setSelectedEscrow(null);
      setActionType(null);
      queryClient.invalidateQueries({ queryKey: ["admin-escrow"] });
    }
  };

  const handleRefund = async () => {
    if (!selectedEscrow) return;
    
    setProcessing(true);
    const result = await refundEscrow(selectedEscrow.task_id, notes || "Refunded by admin");
    setProcessing(false);

    if (result.success) {
      setSelectedEscrow(null);
      setActionType(null);
      setNotes("");
      queryClient.invalidateQueries({ queryKey: ["admin-escrow"] });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "held":
        return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20"><Lock className="h-3 w-3 mr-1" />Held</Badge>;
      case "released":
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20"><Unlock className="h-3 w-3 mr-1" />Released</Badge>;
      case "refunded":
        return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20"><RefreshCcw className="h-3 w-3 mr-1" />Refunded</Badge>;
      case "disputed":
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20"><AlertTriangle className="h-3 w-3 mr-1" />Disputed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Held in Escrow</CardTitle>
            <Lock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₦{totalHeld.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{heldEscrows.length} transactions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Platform Fee</CardTitle>
            <Banknote className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{settings?.platform_fee_percent || 10}%</div>
            <p className="text-xs text-muted-foreground">Per transaction</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Released</CardTitle>
            <Unlock className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₦{escrowTransactions?.filter(t => t.status === "released").reduce((s, t) => s + t.amount, 0).toLocaleString() || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Refunded</CardTitle>
            <RefreshCcw className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₦{escrowTransactions?.filter(t => t.status === "refunded").reduce((s, t) => s + t.amount, 0).toLocaleString() || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transactions Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5" />
              Escrow Transactions
            </CardTitle>
            <CardDescription>Manage task bounties held in escrow</CardDescription>
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
          ) : escrowTransactions?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Lock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No escrow transactions</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task</TableHead>
                  <TableHead>Requester</TableHead>
                  <TableHead>Voucher</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {escrowTransactions?.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="font-medium max-w-[200px] truncate">
                      {tx.task?.title || "Unknown Task"}
                    </TableCell>
                    <TableCell>{tx.requester?.full_name || "Unknown"}</TableCell>
                    <TableCell>{tx.voucher?.full_name || "Not assigned"}</TableCell>
                    <TableCell className="font-bold">
                      ₦{tx.amount.toLocaleString()}
                    </TableCell>
                    <TableCell>{getStatusBadge(tx.status)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(tx.held_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {tx.status === "held" && (
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedEscrow(tx);
                              setActionType('release');
                            }}
                            className="text-green-600"
                          >
                            <Unlock className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedEscrow(tx);
                              setActionType('refund');
                            }}
                            className="text-blue-600"
                          >
                            <RefreshCcw className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                      {tx.status !== "held" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedEscrow(tx);
                            setActionType(null);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Action Dialog */}
      <Dialog open={!!selectedEscrow} onOpenChange={() => {
        setSelectedEscrow(null);
        setActionType(null);
        setNotes("");
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {actionType === 'release' && "Release Escrow"}
              {actionType === 'refund' && "Refund Escrow"}
              {!actionType && "Escrow Details"}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'release' && "Release funds to the voucher"}
              {actionType === 'refund' && "Return funds to the requester"}
              {!actionType && "View transaction details"}
            </DialogDescription>
          </DialogHeader>
          
          {selectedEscrow && (
            <div className="space-y-4 py-4">
              <div className="p-4 rounded-lg bg-muted space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Task</span>
                  <span className="font-medium text-right max-w-[200px] truncate">
                    {selectedEscrow.task?.title || "Unknown"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-bold text-primary">₦{selectedEscrow.amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Requester</span>
                  <span>{selectedEscrow.requester?.full_name || "Unknown"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Voucher</span>
                  <span>{selectedEscrow.voucher?.full_name || "Not assigned"}</span>
                </div>
                {actionType === 'release' && (
                  <>
                    <div className="flex justify-between border-t pt-2 mt-2">
                      <span className="text-muted-foreground">Platform Fee ({settings?.platform_fee_percent || 10}%)</span>
                      <span className="text-destructive">-₦{(selectedEscrow.amount * ((settings?.platform_fee_percent || 10) / 100)).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between font-bold">
                      <span>Voucher Receives</span>
                      <span className="text-green-600">
                        ₦{(selectedEscrow.amount * (1 - (settings?.platform_fee_percent || 10) / 100)).toLocaleString()}
                      </span>
                    </div>
                  </>
                )}
              </div>

              {actionType === 'refund' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Refund Reason</label>
                  <Textarea
                    placeholder="Reason for refund..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              )}

              {selectedEscrow.notes && (
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-sm"><strong>Notes:</strong> {selectedEscrow.notes}</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => {
              setSelectedEscrow(null);
              setActionType(null);
            }}>
              Cancel
            </Button>
            {actionType === 'release' && (
              <Button
                onClick={handleRelease}
                disabled={processing || !selectedEscrow?.task?.voucher_id}
                className="bg-green-600 hover:bg-green-700"
              >
                {processing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Unlock className="h-4 w-4 mr-1" />}
                Release Funds
              </Button>
            )}
            {actionType === 'refund' && (
              <Button
                onClick={handleRefund}
                disabled={processing}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {processing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RefreshCcw className="h-4 w-4 mr-1" />}
                Refund
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
