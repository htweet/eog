import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  MessageSquare,
  Send,
  Video,
  MapPin,
  DollarSign,
  Clock,
  Loader2,
  Gavel,
} from "lucide-react";
import { format } from "date-fns";

interface DisputeTask {
  id: string;
  title: string;
  address: string;
  bounty_amount: number;
  status: string;
  created_at: string;
  requester_id: string;
  voucher_id: string | null;
  category: string;
}

interface DisputeMessage {
  id: string;
  task_id: string;
  sender_id: string;
  message: string;
  sender_type: string;
  created_at: string;
}

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

export function DisputeResolution() {
  const { user } = useAuth();
  const [disputes, setDisputes] = useState<DisputeTask[]>([]);
  const [selectedDispute, setSelectedDispute] = useState<DisputeTask | null>(null);
  const [messages, setMessages] = useState<DisputeMessage[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [resolutionDialogOpen, setResolutionDialogOpen] = useState(false);
  const [resolutionDecision, setResolutionDecision] = useState<"approve" | "reject" | null>(null);
  const [processingResolution, setProcessingResolution] = useState(false);

  useEffect(() => {
    fetchDisputes();
  }, []);

  useEffect(() => {
    if (selectedDispute) {
      fetchMessages(selectedDispute.id);
      fetchParticipantProfiles(selectedDispute);
    }
  }, [selectedDispute]);

  const fetchDisputes = async () => {
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("status", "disputed")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setDisputes(data);
    }
    setLoading(false);
  };

  const fetchMessages = async (taskId: string) => {
    const { data, error } = await (supabase as any)
      .from("dispute_messages")
      .select("*")
      .eq("task_id", taskId)
      .order("created_at", { ascending: true });

    if (!error && data) {
      setMessages(data as DisputeMessage[]);
    }
  };

  const fetchParticipantProfiles = async (task: DisputeTask) => {
    const ids = [task.requester_id];
    if (task.voucher_id) ids.push(task.voucher_id);

    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .in("id", ids);

    if (data) {
      const profileMap = data.reduce((acc, p) => {
        acc[p.id] = p;
        return acc;
      }, {} as Record<string, Profile>);
      setProfiles(profileMap);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedDispute || !user) return;

    setSendingMessage(true);
    const { error } = await (supabase as any).from("dispute_messages").insert({
      task_id: selectedDispute.id,
      sender_id: user.id,
      message: newMessage.trim(),
      sender_type: "admin",
    });

    if (error) {
      toast.error("Failed to send message");
    } else {
      setNewMessage("");
      fetchMessages(selectedDispute.id);
      toast.success("Message sent");
    }
    setSendingMessage(false);
  };

  const resolveDispute = async () => {
    if (!selectedDispute || !resolutionDecision) return;

    setProcessingResolution(true);

    try {
      if (resolutionDecision === "approve") {
        // Approve: Pay the voucher
        await supabase
          .from("tasks")
          .update({ status: "completed" })
          .eq("id", selectedDispute.id);

        if (selectedDispute.voucher_id) {
          // Add bounty to voucher's withdrawable balance
          const { data: voucherProfile } = await supabase
            .from("profiles")
            .select("withdrawable_balance")
            .eq("id", selectedDispute.voucher_id)
            .single();

          await supabase
            .from("profiles")
            .update({
              withdrawable_balance: (voucherProfile?.withdrawable_balance || 0) + selectedDispute.bounty_amount,
            })
            .eq("id", selectedDispute.voucher_id);

          // Create transaction record
          await supabase.from("transactions").insert({
            user_id: selectedDispute.voucher_id,
            type: "bounty_earned",
            amount: selectedDispute.bounty_amount,
            status: "completed",
            task_id: selectedDispute.id,
            description: "Dispute resolved in voucher's favor",
          });
        }
      } else {
        // Reject: Refund the requester
        await supabase
          .from("tasks")
          .update({ status: "cancelled" })
          .eq("id", selectedDispute.id);

        // Add bounty back to requester's wallet
        const { data: requesterProfile } = await supabase
          .from("profiles")
          .select("wallet_balance")
          .eq("id", selectedDispute.requester_id)
          .single();

        await supabase
          .from("profiles")
          .update({
            wallet_balance: (requesterProfile?.wallet_balance || 0) + selectedDispute.bounty_amount,
          })
          .eq("id", selectedDispute.requester_id);

        // Create refund transaction
        await supabase.from("transactions").insert({
          user_id: selectedDispute.requester_id,
          type: "refund",
          amount: selectedDispute.bounty_amount,
          status: "completed",
          task_id: selectedDispute.id,
          description: "Dispute resolved - bounty refunded",
        });
      }

      toast.success(`Dispute ${resolutionDecision === "approve" ? "approved" : "rejected"} successfully`);
      setResolutionDialogOpen(false);
      setSelectedDispute(null);
      fetchDisputes();
    } catch (error) {
      toast.error("Failed to resolve dispute");
    }

    setProcessingResolution(false);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Loading disputes...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Dispute List */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Active Disputes
          </CardTitle>
          <CardDescription>
            {disputes.length} dispute{disputes.length !== 1 ? "s" : ""} pending review
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            <div className="space-y-3">
              {disputes.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-2" />
                  <p className="text-muted-foreground">No pending disputes</p>
                </div>
              ) : (
                disputes.map((dispute) => (
                  <div
                    key={dispute.id}
                    className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                      selectedDispute?.id === dispute.id
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted/50"
                    }`}
                    onClick={() => setSelectedDispute(dispute)}
                  >
                    <h4 className="font-medium truncate">{dispute.title}</h4>
                    <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                      <DollarSign className="h-3 w-3" />
                      <span>₦{dispute.bounty_amount.toLocaleString()}</span>
                      <span>•</span>
                      <Clock className="h-3 w-3" />
                      <span>{format(new Date(dispute.created_at), "MMM d")}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Dispute Details & Chat */}
      <Card className="lg:col-span-2">
        {selectedDispute ? (
          <>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>{selectedDispute.title}</CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-1">
                    <MapPin className="h-4 w-4" />
                    {selectedDispute.address}
                  </CardDescription>
                </div>
                <Badge variant="destructive">Disputed</Badge>
              </div>
              
              {/* Task Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-xs text-muted-foreground">Bounty</p>
                  <p className="font-semibold">₦{selectedDispute.bounty_amount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Category</p>
                  <p className="font-semibold capitalize">{selectedDispute.category}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Requester</p>
                  <p className="font-semibold">
                    {profiles[selectedDispute.requester_id]?.full_name || "Unknown"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Voucher</p>
                  <p className="font-semibold">
                    {selectedDispute.voucher_id 
                      ? profiles[selectedDispute.voucher_id]?.full_name || "Unknown"
                      : "N/A"}
                  </p>
                </div>
              </div>
            </CardHeader>
            
            <Separator />
            
            <CardContent className="pt-4">
              {/* Messages */}
              <div className="mb-4">
                <h4 className="font-medium flex items-center gap-2 mb-3">
                  <MessageSquare className="h-4 w-4" />
                  Communication Thread
                </h4>
                <ScrollArea className="h-[250px] border rounded-lg p-4">
                  {messages.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No messages yet. Start communication below.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {messages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex gap-3 ${
                            msg.sender_type === "admin" ? "justify-end" : ""
                          }`}
                        >
                          {msg.sender_type !== "admin" && (
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={profiles[msg.sender_id]?.avatar_url || undefined} />
                              <AvatarFallback>
                                {profiles[msg.sender_id]?.full_name?.[0] || msg.sender_type[0].toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          <div
                            className={`max-w-[70%] p-3 rounded-lg ${
                              msg.sender_type === "admin"
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted"
                            }`}
                          >
                            <p className="text-xs font-medium mb-1 opacity-70">
                              {msg.sender_type === "admin" 
                                ? "Admin" 
                                : profiles[msg.sender_id]?.full_name || msg.sender_type}
                            </p>
                            <p className="text-sm">{msg.message}</p>
                            <p className="text-xs opacity-60 mt-1">
                              {format(new Date(msg.created_at), "MMM d, h:mm a")}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>

              {/* Message Input */}
              <div className="flex gap-2 mb-6">
                <Textarea
                  placeholder="Type a message to both parties..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  rows={2}
                />
                <Button onClick={sendMessage} disabled={sendingMessage || !newMessage.trim()}>
                  {sendingMessage ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>

              <Separator className="my-4" />

              {/* Resolution Actions */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Gavel className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">Make Decision</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="text-green-600 border-green-600 hover:bg-green-50"
                    onClick={() => {
                      setResolutionDecision("approve");
                      setResolutionDialogOpen(true);
                    }}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve & Pay Voucher
                  </Button>
                  <Button
                    variant="outline"
                    className="text-red-600 border-red-600 hover:bg-red-50"
                    onClick={() => {
                      setResolutionDecision("reject");
                      setResolutionDialogOpen(true);
                    }}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject & Refund
                  </Button>
                </div>
              </div>
            </CardContent>
          </>
        ) : (
          <CardContent className="py-20">
            <div className="text-center text-muted-foreground">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>Select a dispute to view details</p>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Resolution Confirmation Dialog */}
      <Dialog open={resolutionDialogOpen} onOpenChange={setResolutionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {resolutionDecision === "approve" ? "Approve Dispute" : "Reject Dispute"}
            </DialogTitle>
            <DialogDescription>
              {resolutionDecision === "approve"
                ? `This will mark the task as completed and pay ₦${selectedDispute?.bounty_amount.toLocaleString()} to the voucher.`
                : `This will cancel the task and refund ₦${selectedDispute?.bounty_amount.toLocaleString()} to the requester.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolutionDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant={resolutionDecision === "approve" ? "default" : "destructive"}
              onClick={resolveDispute}
              disabled={processingResolution}
            >
              {processingResolution && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirm {resolutionDecision === "approve" ? "Approval" : "Rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
