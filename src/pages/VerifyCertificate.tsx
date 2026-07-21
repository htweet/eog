import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Shield, CheckCircle2, XCircle, MapPin, Calendar, User, Award, ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface Certificate {
  certificate_number: string;
  item_title: string;
  category: string;
  address: string;
  gps_latitude: number | null;
  gps_longitude: number | null;
  verified_at: string;
  vouchscore_at_time: number | null;
  ai_analysis_score: number | null;
  checklist_summary: {
    label: string;
    required: boolean;
    checked: boolean;
    notes?: string | null;
  }[] | null;
  created_at: string;
  voucher_id: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  auto: "Automobiles",
  realestate: "Real Estate",
  electronics: "Electronics",
  general: "General Items",
};

export default function VerifyCertificate() {
  const { certNumber } = useParams<{ certNumber: string }>();
  const navigate = useNavigate();
  const [cert, setCert] = useState<Certificate | null>(null);
  const [voucherName, setVoucherName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (certNumber) fetchCertificate();
  }, [certNumber]);

  const fetchCertificate = async () => {
    const { data, error } = await supabase
      .from("certificates")
      .select("*")
      .eq("certificate_number", certNumber)
      .maybeSingle();

    if (error || !data) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    setCert(data as unknown as Certificate);

    // Fetch voucher name
    if (data.voucher_id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", data.voucher_id)
        .maybeSingle();
      if (profile) setVoucherName(profile.full_name);
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-6">
        <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <XCircle className="h-8 w-8 text-destructive" />
        </div>
        <h1 className="text-xl font-bold">Certificate Not Found</h1>
        <p className="text-muted-foreground text-center max-w-xs">
          The certificate <strong>{certNumber}</strong> does not exist or may have been revoked.
        </p>
        <Button variant="outline" onClick={() => navigate("/")}>
          Go to Vouch
        </Button>
      </div>
    );
  }

  if (!cert) return null;

  const checklist = cert.checklist_summary || [];
  const passCount = checklist.filter((i) => i.checked).length;
  const catLabel = CATEGORY_LABELS[cert.category] || cert.category;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
              <Shield className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg">Vouch</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Vouch
          </Button>
        </div>
      </header>

      <main className="container max-w-2xl py-8">
        {/* Verified Banner */}
        <div className="rounded-xl bg-green-50 border-2 border-green-500 p-5 mb-6 flex items-center gap-4">
          <div className="h-14 w-14 rounded-full bg-green-500 flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-8 w-8 text-white" />
          </div>
          <div>
            <p className="text-xs font-bold text-green-600 uppercase tracking-widest mb-0.5">
              Authentic Verification
            </p>
            <h1 className="text-xl font-bold text-green-900">This item has been verified by Vouch</h1>
            <p className="text-sm text-green-700 mt-0.5">
              Certificate No. <strong className="font-mono">{cert.certificate_number}</strong>
            </p>
          </div>
        </div>

        {/* Item Details */}
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-xs">{catLabel}</Badge>
              <span className="text-xs text-muted-foreground font-mono">{cert.certificate_number}</span>
            </div>
            <CardTitle className="text-lg mt-1">{cert.item_title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div>
                <p>{cert.address}</p>
                {cert.gps_latitude && cert.gps_longitude && (
                  <p className="text-xs text-muted-foreground/70 mt-0.5 font-mono">
                    {Number(cert.gps_latitude).toFixed(6)}, {Number(cert.gps_longitude).toFixed(6)}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4 text-primary" />
              Verified on {new Date(cert.verified_at).toLocaleDateString("en-NG", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </div>
            {voucherName && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-4 w-4 text-primary" />
                Verified by <strong className="text-foreground">{voucherName}</strong>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Scores */}
        {(cert.vouchscore_at_time || cert.ai_analysis_score || checklist.length > 0) && (
          <div className="grid grid-cols-3 gap-3 mb-4">
            {cert.vouchscore_at_time && (
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-primary">
                    {Number(cert.vouchscore_at_time).toFixed(0)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Agent VouchScore™</p>
                </CardContent>
              </Card>
            )}
            {cert.ai_analysis_score && (
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-primary">
                    {Number(cert.ai_analysis_score).toFixed(0)}%
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">AI Score</p>
                </CardContent>
              </Card>
            )}
            {checklist.length > 0 && (
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-primary">
                    {passCount}/{checklist.length}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Checklist Passed</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Checklist */}
        {checklist.length > 0 && (
          <Card className="mb-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Verification Checklist
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {checklist.map((item, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-3 p-3 rounded-lg ${
                    item.checked
                      ? "bg-green-50 border border-green-200 dark:bg-green-950/20 dark:border-green-900"
                      : "bg-muted/50 border border-border"
                  }`}
                >
                  {item.checked ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{item.label}</p>
                    {item.required && (
                      <Badge variant="outline" className="text-xs mt-1">Required</Badge>
                    )}
                    {item.notes && (
                      <p className="text-xs text-muted-foreground mt-1 italic">"{item.notes}"</p>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Footer trust note */}
        <div className="rounded-lg border bg-muted/30 p-4 flex items-start gap-3">
          <Award className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div className="text-xs text-muted-foreground leading-relaxed">
            This certificate was issued by <strong className="text-foreground">Vouch</strong>,
            Nigeria's physical verification network. The verification was conducted in person with live
            GPS watermarked video. Certificate ID:{" "}
            <span className="font-mono font-semibold text-foreground">{cert.certificate_number}</span>.
            Issued {new Date(cert.created_at).toLocaleDateString()}.
          </div>
        </div>
      </main>
    </div>
  );
}
