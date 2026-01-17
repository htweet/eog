import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ProBadge } from "@/components/pro/ProBadge";
import { useTaskApplications } from "@/hooks/useTaskApplications";
import {
  Star,
  MapPin,
  Check,
  X,
  Loader2,
  MessageSquare,
  Users,
  Crown,
} from "lucide-react";

interface ApplicationsListProps {
  taskId: string;
  isRequester: boolean;
}

export function ApplicationsList({ taskId, isRequester }: ApplicationsListProps) {
  const {
    pendingApplications,
    acceptedApplication,
    loading,
    acceptApplication,
    rejectApplication,
  } = useTaskApplications(taskId);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleAccept = async (applicationId: string) => {
    setProcessingId(applicationId);
    await acceptApplication(applicationId);
    setProcessingId(null);
  };

  const handleReject = async (applicationId: string) => {
    setProcessingId(applicationId);
    await rejectApplication(applicationId);
    setProcessingId(null);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  // If there's an accepted application, show that
  if (acceptedApplication) {
    return (
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Check className="h-5 w-5 text-primary" />
            Selected Voucher
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12">
              <AvatarImage src={acceptedApplication.voucher?.avatar_url || undefined} />
              <AvatarFallback>
                {acceptedApplication.voucher?.full_name?.[0]?.toUpperCase() || "V"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-medium">
                  {acceptedApplication.voucher?.full_name || "Anonymous"}
                </p>
                {acceptedApplication.voucher?.voucher_tier === "pro" && (
                  <ProBadge tier="pro" size="sm" />
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Star className="h-4 w-4 text-amber-500" />
                {acceptedApplication.voucher?.trust_score?.toFixed(1) || "5.0"}
                {acceptedApplication.distance_meters && (
                  <>
                    <span>•</span>
                    <MapPin className="h-3 w-3" />
                    {(acceptedApplication.distance_meters / 1000).toFixed(1)} km away
                  </>
                )}
              </div>
            </div>
            <Badge className="bg-primary/10 text-primary border-primary/20">
              Assigned
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  // No applications yet
  if (pendingApplications.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <Users className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="font-medium">No applications yet</p>
          <p className="text-sm text-muted-foreground">
            Vouchers in the area will apply soon
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="h-5 w-5" />
          Interested Vouchers
          <Badge variant="secondary">{pendingApplications.length}</Badge>
        </CardTitle>
        <CardDescription>
          Select a voucher to complete your verification
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {pendingApplications.map((application) => (
          <div
            key={application.id}
            className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
          >
            <Avatar className="h-12 w-12">
              <AvatarImage src={application.voucher?.avatar_url || undefined} />
              <AvatarFallback>
                {application.voucher?.full_name?.[0]?.toUpperCase() || "V"}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-medium truncate">
                  {application.voucher?.full_name || "Anonymous"}
                </p>
                {application.voucher?.voucher_tier === "pro" && (
                  <ProBadge tier="pro" size="sm" />
                )}
                {application.voucher?.is_verified && (
                  <Badge variant="secondary" className="text-xs">Verified</Badge>
                )}
              </div>
              
              <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                <div className="flex items-center gap-1">
                  <Star className="h-3 w-3 text-amber-500" />
                  {application.voucher?.trust_score?.toFixed(1) || "5.0"}
                </div>
                {application.distance_meters && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {(application.distance_meters / 1000).toFixed(1)} km
                  </div>
                )}
              </div>
              
              {application.bid_message && (
                <div className="mt-2 text-sm text-muted-foreground flex items-start gap-2">
                  <MessageSquare className="h-4 w-4 mt-0.5 shrink-0" />
                  <p className="line-clamp-2">{application.bid_message}</p>
                </div>
              )}
            </div>

            {isRequester && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleReject(application.id)}
                  disabled={processingId !== null}
                >
                  {processingId === application.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <X className="h-4 w-4 text-destructive" />
                  )}
                </Button>
                <Button
                  size="icon"
                  onClick={() => handleAccept(application.id)}
                  disabled={processingId !== null}
                  className="bg-primary hover:bg-primary/90"
                >
                  {processingId === application.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                </Button>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
