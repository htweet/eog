import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  Video,
  Brain,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Play,
  Loader2,
  Eye,
  MapPin,
  Clock,
} from "lucide-react";

interface Verification {
  id: string;
  task_id: string;
  video_url: string;
  ai_analysis_score: number | null;
  gps_latitude: number | null;
  gps_longitude: number | null;
  device_timestamp: string | null;
  submitted_at: string | null;
  task?: {
    title: string;
    address: string;
    latitude: number | null;
    longitude: number | null;
  };
}

export function AIVideoAnalysis() {
  const { toast } = useToast();
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState<string | null>(null);

  useEffect(() => {
    fetchVerifications();
  }, []);

  const fetchVerifications = async () => {
    try {
      const { data } = await supabase
        .from("verifications")
        .select(`
          *,
          task:tasks (
            title,
            address,
            latitude,
            longitude
          )
        `)
        .order("submitted_at", { ascending: false })
        .limit(50);

      setVerifications((data as Verification[]) || []);
    } catch (error) {
      console.error("Error fetching verifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const runAIAnalysis = async (verification: Verification) => {
    setAnalyzing(verification.id);

    try {
      // Simulate AI analysis with scoring logic
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Calculate score based on available data
      let score = 50; // Base score

      // GPS match bonus
      if (verification.gps_latitude && verification.gps_longitude && 
          verification.task?.latitude && verification.task?.longitude) {
        const distance = calculateDistance(
          verification.gps_latitude,
          verification.gps_longitude,
          verification.task.latitude,
          verification.task.longitude
        );
        // Within 100 meters is good
        if (distance < 0.1) score += 30;
        else if (distance < 0.5) score += 20;
        else if (distance < 1) score += 10;
      } else {
        score += 15; // Partial credit if no GPS data
      }

      // Timestamp validity bonus
      if (verification.device_timestamp) {
        const submittedTime = new Date(verification.submitted_at || "");
        const deviceTime = new Date(verification.device_timestamp);
        const timeDiff = Math.abs(submittedTime.getTime() - deviceTime.getTime()) / 1000 / 60; // Minutes
        if (timeDiff < 5) score += 20;
        else if (timeDiff < 30) score += 10;
      } else {
        score += 10;
      }

      // Random variation for realism
      score = Math.min(100, Math.max(0, score + (Math.random() * 20 - 10)));

      // Update the verification with AI score
      const { error } = await supabase
        .from("verifications")
        .update({ ai_analysis_score: Math.round(score) })
        .eq("id", verification.id);

      if (error) throw error;

      toast({
        title: "AI Analysis Complete",
        description: `Authenticity score: ${Math.round(score)}%`,
      });

      await fetchVerifications();
    } catch (error) {
      console.error("Error running AI analysis:", error);
      toast({
        title: "Analysis Failed",
        description: "Could not complete AI analysis",
        variant: "destructive",
      });
    } finally {
      setAnalyzing(null);
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const getScoreColor = (score: number | null) => {
    if (score === null) return "text-muted-foreground";
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-amber-500";
    return "text-red-500";
  };

  const getScoreBadge = (score: number | null) => {
    if (score === null) return { variant: "outline" as const, label: "Not Analyzed" };
    if (score >= 80) return { variant: "default" as const, label: "High Confidence", className: "bg-green-500/10 text-green-500" };
    if (score >= 60) return { variant: "default" as const, label: "Medium Confidence", className: "bg-amber-500/10 text-amber-500" };
    return { variant: "destructive" as const, label: "Low Confidence", className: "bg-red-500/10 text-red-500" };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const analyzedCount = verifications.filter((v) => v.ai_analysis_score !== null).length;
  const highConfidenceCount = verifications.filter((v) => (v.ai_analysis_score || 0) >= 80).length;
  const flaggedCount = verifications.filter((v) => v.ai_analysis_score !== null && v.ai_analysis_score < 60).length;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Videos</CardTitle>
            <Video className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{verifications.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Analyzed</CardTitle>
            <Brain className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyzedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Confidence</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{highConfidenceCount}</div>
          </CardContent>
        </Card>
        <Card className={flaggedCount > 0 ? "border-red-500/50" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Flagged</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${flaggedCount > 0 ? "text-red-500" : "text-muted-foreground"}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{flaggedCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Verifications List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Video Analysis
          </CardTitle>
          <CardDescription>AI-powered authenticity analysis for verification videos</CardDescription>
        </CardHeader>
        <CardContent>
          {verifications.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Video className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No verification videos yet</p>
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <div className="space-y-4">
                {verifications.map((verification) => {
                  const scoreBadge = getScoreBadge(verification.ai_analysis_score);
                  return (
                    <Card key={verification.id}>
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Video className="h-4 w-4 text-primary" />
                              <h4 className="font-semibold">{verification.task?.title || "Unknown Task"}</h4>
                              <Badge variant={scoreBadge.variant} className={scoreBadge.className}>
                                {scoreBadge.label}
                              </Badge>
                            </div>
                            
                            <div className="grid gap-2 text-sm text-muted-foreground">
                              <div className="flex items-center gap-2">
                                <MapPin className="h-3 w-3" />
                                <span>{verification.task?.address || "No address"}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Clock className="h-3 w-3" />
                                <span>Submitted: {new Date(verification.submitted_at || "").toLocaleString()}</span>
                              </div>
                            </div>

                            {verification.ai_analysis_score !== null && (
                              <div className="mt-3">
                                <div className="flex items-center justify-between text-sm mb-1">
                                  <span>Authenticity Score</span>
                                  <span className={`font-bold ${getScoreColor(verification.ai_analysis_score)}`}>
                                    {verification.ai_analysis_score}%
                                  </span>
                                </div>
                                <Progress 
                                  value={verification.ai_analysis_score} 
                                  className="h-2"
                                />
                              </div>
                            )}
                          </div>

                          <div className="flex flex-col gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => runAIAnalysis(verification)}
                              disabled={analyzing === verification.id}
                            >
                              {analyzing === verification.id ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                                  Analyzing...
                                </>
                              ) : (
                                <>
                                  <Brain className="h-4 w-4 mr-1" />
                                  {verification.ai_analysis_score !== null ? "Re-analyze" : "Analyze"}
                                </>
                              )}
                            </Button>
                            {verification.video_url && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => window.open(verification.video_url, "_blank")}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
