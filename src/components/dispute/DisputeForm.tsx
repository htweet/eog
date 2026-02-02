import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { AlertTriangle, Upload, Loader2, FileText } from "lucide-react";

interface DisputeFormProps {
  taskId: string;
  taskTitle: string;
  requesterId: string;
  voucherId: string | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function DisputeForm({
  taskId,
  taskTitle,
  requesterId,
  voucherId,
  onSuccess,
  onCancel,
}: DisputeFormProps) {
  const { user } = useAuth();
  const [reason, setReason] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [evidenceUrls, setEvidenceUrls] = useState<string[]>([]);
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setEvidenceFiles(prev => [...prev, ...files]);
    }
  };

  const uploadEvidence = async () => {
    if (evidenceFiles.length === 0 || !user) return [];

    setUploading(true);
    const urls: string[] = [];

    for (const file of evidenceFiles) {
      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/${taskId}/${Date.now()}.${fileExt}`;

      const { error } = await supabase.storage
        .from("dispute-evidence")
        .upload(filePath, file);

      if (!error) {
        urls.push(filePath);
      }
    }

    setUploading(false);
    return urls;
  };

  const handleSubmit = async () => {
    if (!user || !reason.trim()) {
      toast.error("Please provide a reason for the dispute");
      return;
    }

    setSubmitting(true);

    try {
      // Upload evidence files first
      const uploadedUrls = await uploadEvidence();

      // Create dispute record
      const { error } = await supabase.from("disputes").insert({
        task_id: taskId,
        requester_id: requesterId,
        voucher_id: voucherId,
        reason: reason.trim(),
        evidence_urls: [...evidenceUrls, ...uploadedUrls],
        status: "open",
      });

      if (error) throw error;

      // Update task status to disputed
      await supabase
        .from("tasks")
        .update({ status: "disputed" })
        .eq("id", taskId);

      toast.success("Dispute submitted successfully");
      onSuccess?.();
    } catch (error: any) {
      console.error("Error submitting dispute:", error);
      toast.error("Failed to submit dispute");
    } finally {
      setSubmitting(false);
    }
  };

  const removeFile = (index: number) => {
    setEvidenceFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-5 w-5" />
          File a Dispute
        </CardTitle>
        <CardDescription>
          Explain why you're disputing this task. Our team will review your case.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-3 rounded-lg bg-muted">
          <p className="font-medium text-sm">Task</p>
          <p className="text-muted-foreground">{taskTitle}</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="reason">Reason for Dispute *</Label>
          <Textarea
            id="reason"
            placeholder="Describe the issue in detail..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="evidence">Evidence (Optional)</Label>
          <p className="text-sm text-muted-foreground">
            Upload screenshots, photos, or documents to support your case
          </p>
          <Input
            id="evidence"
            type="file"
            multiple
            accept="image/*,.pdf,.doc,.docx"
            onChange={handleFileChange}
          />
          {evidenceFiles.length > 0 && (
            <div className="space-y-2 mt-2">
              {evidenceFiles.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 rounded bg-muted"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <span className="text-sm truncate max-w-[200px]">{file.name}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(index)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-4">
          <Button variant="outline" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || uploading || !reason.trim()}
            className="flex-1"
            variant="destructive"
          >
            {submitting || uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {uploading ? "Uploading..." : "Submitting..."}
              </>
            ) : (
              <>
                <AlertTriangle className="mr-2 h-4 w-4" />
                Submit Dispute
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
