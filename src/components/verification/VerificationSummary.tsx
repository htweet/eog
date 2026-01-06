import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  Video, 
  MapPin, 
  CheckCircle2, 
  Clock, 
  FileVideo,
  AlertTriangle,
  Loader2,
  Send
} from "lucide-react";

interface GPSData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: Date;
}

interface CompletedItem {
  id: number;
  checked: boolean;
  notes?: string;
}

interface ChecklistItem {
  id: number;
  label: string;
  required: boolean;
}

interface VerificationSummaryProps {
  videoBlob: Blob | null;
  gpsData: GPSData | null;
  completedItems: CompletedItem[];
  checklist: ChecklistItem[];
  taskTitle: string;
  bountyAmount: number;
  onSubmit: () => void;
  submitting: boolean;
}

export function VerificationSummary({
  videoBlob,
  gpsData,
  completedItems,
  checklist,
  taskTitle,
  bountyAmount,
  onSubmit,
  submitting,
}: VerificationSummaryProps) {
  const videoSizeMB = videoBlob ? (videoBlob.size / (1024 * 1024)).toFixed(2) : 0;
  const videoDuration = videoBlob ? "Recorded" : "Not recorded";
  
  const completedCount = completedItems.filter(item => item.checked).length;
  const requiredItems = checklist.filter(item => item.required);
  const requiredCompleted = requiredItems.filter(item =>
    completedItems.find(c => c.id === item.id && c.checked)
  ).length;

  const hasVideo = !!videoBlob;
  const hasGPS = !!gpsData;
  const allRequiredComplete = requiredItems.length === requiredCompleted;
  
  const canSubmit = hasVideo && hasGPS && allRequiredComplete;

  const validationItems = [
    {
      label: "Video recorded",
      status: hasVideo,
      detail: hasVideo ? `${videoSizeMB} MB` : "Required",
    },
    {
      label: "GPS location captured",
      status: hasGPS,
      detail: hasGPS 
        ? `${gpsData.latitude.toFixed(4)}, ${gpsData.longitude.toFixed(4)}` 
        : "Required",
    },
    {
      label: "Required checklist items",
      status: allRequiredComplete,
      detail: `${requiredCompleted}/${requiredItems.length} completed`,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="h-5 w-5" />
          Submit Verification
        </CardTitle>
        <CardDescription>
          Review your verification before submitting for "{taskTitle}"
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Validation checklist */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Submission Requirements</h4>
          {validationItems.map((item, index) => (
            <div 
              key={index}
              className={`flex items-center justify-between p-3 rounded-lg border ${
                item.status 
                  ? "border-primary/30 bg-primary/5" 
                  : "border-destructive/30 bg-destructive/5"
              }`}
            >
              <div className="flex items-center gap-3">
                {item.status ? (
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                )}
                <span className="text-sm font-medium">{item.label}</span>
              </div>
              <Badge variant={item.status ? "secondary" : "destructive"}>
                {item.detail}
              </Badge>
            </div>
          ))}
        </div>

        <Separator />

        {/* Video preview info */}
        {hasVideo && (
          <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <FileVideo className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-medium">Verification Video</p>
              <p className="text-sm text-muted-foreground">
                {videoSizeMB} MB • Ready to upload
              </p>
            </div>
          </div>
        )}

        {/* GPS info */}
        {hasGPS && (
          <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <MapPin className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-medium">Location Data</p>
              <p className="text-sm text-muted-foreground">
                {gpsData.latitude.toFixed(6)}, {gpsData.longitude.toFixed(6)}
              </p>
              <p className="text-xs text-muted-foreground">
                Accuracy: ±{gpsData.accuracy.toFixed(0)}m • {gpsData.timestamp.toLocaleString()}
              </p>
            </div>
          </div>
        )}

        {/* Checklist summary */}
        <div className="p-4 rounded-lg bg-muted/50">
          <div className="flex items-center justify-between mb-2">
            <p className="font-medium">Checklist Summary</p>
            <Badge variant="secondary">
              {completedCount}/{checklist.length} items
            </Badge>
          </div>
          <div className="space-y-1 text-sm text-muted-foreground">
            {completedItems.filter(item => item.checked).map(item => {
              const checklistItem = checklist.find(c => c.id === item.id);
              return (
                <div key={item.id} className="flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3 text-primary" />
                  <span>{checklistItem?.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <Separator />

        {/* Bounty info */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-primary/10">
          <span className="font-medium">Bounty Amount</span>
          <span className="text-2xl font-bold text-primary">
            ${bountyAmount.toFixed(2)}
          </span>
        </div>

        {/* Submit button */}
        <Button
          className="w-full"
          size="lg"
          onClick={onSubmit}
          disabled={!canSubmit || submitting}
        >
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading & Submitting...
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              Submit Verification
            </>
          )}
        </Button>

        {!canSubmit && (
          <p className="text-center text-sm text-destructive">
            Please complete all requirements above before submitting
          </p>
        )}
      </CardContent>
    </Card>
  );
}
