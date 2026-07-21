import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Award, Download, Loader2, CheckCircle, ExternalLink } from "lucide-react";

interface CertificateData {
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
}

interface VoucherData {
  full_name: string | null;
}

interface Props {
  taskId: string;
  size?: "default" | "sm" | "lg";
  className?: string;
}

export function CertificateDownloadButton({ taskId, size = "default", className }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [cert, setCert] = useState<CertificateData | null>(null);
  const [voucher, setVoucher] = useState<VoucherData | null>(null);
  const [open, setOpen] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-certificate`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ task_id: taskId }),
        }
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to generate certificate");
      }

      const data = await response.json();
      setCert(data.certificate);
      setVoucher(data.voucher);
      setOpen(true);
    } catch (error: any) {
      toast({
        title: "Certificate Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    if (!cert) return;

    const verifyUrl = `${window.location.origin}/verify/${cert.certificate_number}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(verifyUrl)}`;
    const checklist = cert.checklist_summary || [];
    const passCount = checklist.filter((i) => i.checked).length;
    const totalCount = checklist.length;
    const catLabel = cert.category === "auto" ? "Automobiles"
      : cert.category === "realestate" ? "Real Estate"
      : cert.category === "electronics" ? "Electronics"
      : "General Items";

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Vouch Certificate — ${cert.certificate_number}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:Inter,Arial,sans-serif;background:#fff;color:#1a1a1a}
    .page{width:210mm;min-height:270mm;margin:0 auto;padding:10mm 12mm}
    .header{background:linear-gradient(135deg,#f07240 0%,#f09860 100%);color:#fff;padding:20px 28px;border-radius:12px;margin-bottom:20px;display:flex;align-items:center;justify-content:space-between}
    .logo{font-size:24px;font-weight:800}
    .logo small{display:block;font-size:12px;font-weight:400;opacity:.75;margin-top:2px}
    .badge-verified{background:rgba(255,255,255,.2);border:1px solid rgba(255,255,255,.4);padding:5px 14px;border-radius:20px;font-size:11px;font-weight:700;letter-spacing:1px}
    .cert-no{font-size:11px;opacity:.75;margin-top:4px;text-align:right}
    .stamp{display:inline-flex;align-items:center;gap:6px;background:#f0fdf4;border:2px solid #22c55e;color:#16a34a;padding:5px 14px;border-radius:20px;font-size:11px;font-weight:700;margin-bottom:14px}
    .title-sec{text-align:center;margin-bottom:18px}
    .title-sec h1{font-size:20px;font-weight:700;margin-bottom:3px}
    .title-sec p{font-size:12px;color:#666}
    .item-box{border:2px solid #f07240;border-radius:10px;padding:16px 20px;margin-bottom:16px}
    .item-box .cat{display:inline-block;background:#fff3ee;color:#f07240;font-size:10px;font-weight:700;padding:2px 10px;border-radius:20px;margin-bottom:8px;letter-spacing:.5px}
    .item-box h2{font-size:16px;font-weight:700;margin-bottom:4px}
    .item-box .addr{font-size:12px;color:#555}
    .item-box .gps{font-size:10px;color:#aaa;margin-top:2px}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px}
    .ic{background:#f8f8f8;border-radius:8px;padding:12px 14px}
    .ic label{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#888;display:block;margin-bottom:3px}
    .ic .val{font-size:13px;font-weight:600}
    .ic .val-sm{font-size:10px;color:#f07240;font-weight:600;word-break:break-all}
    .scores{display:flex;gap:12px;margin-bottom:16px}
    .sc{flex:1;background:linear-gradient(135deg,#f07240 0%,#f09860 100%);color:#fff;border-radius:10px;padding:14px;text-align:center}
    .sc .num{font-size:28px;font-weight:800}
    .sc .lbl{font-size:10px;opacity:.85;margin-top:2px}
    .cl-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#888;margin-bottom:8px}
    .ci{display:flex;align-items:center;gap:8px;padding:7px 10px;border-radius:6px;margin-bottom:5px}
    .ci.pass{background:#f0fdf4}
    .ci.fail{background:#fef2f2}
    .ci-icon{width:16px;height:16px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;flex-shrink:0}
    .ci-icon.pass{background:#22c55e;color:#fff}
    .ci-icon.fail{background:#ef4444;color:#fff}
    .ci-lbl{font-size:12px;flex:1}
    .ci-req{font-size:9px;color:#aaa}
    .footer{border-top:2px solid #f07240;padding-top:16px;margin-top:16px;display:flex;align-items:flex-start;justify-content:space-between}
    .ft{font-size:10px;color:#888;max-width:260px;line-height:1.7}
    .ft strong{color:#f07240}
    .qr img{width:80px;height:80px;border:2px solid #eee;border-radius:8px}
    .qr p{font-size:8px;color:#aaa;margin-top:3px;text-align:center}
    @media print{@page{margin:0}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
  </style>
</head>
<body>
<div class="page">
  <div class="header">
    <div>
      <div class="logo">🛡️ Vouch<small>Physical Verification Certificate</small></div>
    </div>
    <div>
      <div class="badge-verified">✓ VERIFIED</div>
      <div class="cert-no">${cert.certificate_number}</div>
    </div>
  </div>

  <div class="title-sec">
    <div class="stamp">✓ Authentically Verified by Vouch</div>
    <h1>${cert.item_title}</h1>
    <p>This certificate confirms that the item below was physically inspected by a trusted Vouch agent.</p>
  </div>

  <div class="item-box">
    <div class="cat">${catLabel.toUpperCase()}</div>
    <h2>${cert.item_title}</h2>
    <div class="addr">📍 ${cert.address}</div>
    ${cert.gps_latitude ? `<div class="gps">GPS: ${Number(cert.gps_latitude).toFixed(6)}, ${Number(cert.gps_longitude).toFixed(6)}</div>` : ""}
  </div>

  <div class="grid">
    <div class="ic">
      <label>Verified On</label>
      <div class="val">${new Date(cert.verified_at).toLocaleDateString("en-NG", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</div>
    </div>
    <div class="ic">
      <label>Verified By</label>
      <div class="val">${voucher?.full_name || "Vouch Agent"}</div>
    </div>
    <div class="ic">
      <label>Certificate No.</label>
      <div class="val" style="font-family:monospace">${cert.certificate_number}</div>
    </div>
    <div class="ic">
      <label>Verify Online</label>
      <div class="val-sm">${verifyUrl}</div>
    </div>
  </div>

  ${cert.vouchscore_at_time || cert.ai_analysis_score || totalCount > 0 ? `
  <div class="scores">
    ${cert.vouchscore_at_time ? `<div class="sc"><div class="num">${Number(cert.vouchscore_at_time).toFixed(0)}</div><div class="lbl">Agent VouchScore™</div></div>` : ""}
    ${cert.ai_analysis_score ? `<div class="sc"><div class="num">${Number(cert.ai_analysis_score).toFixed(0)}%</div><div class="lbl">AI Analysis Score</div></div>` : ""}
    ${totalCount > 0 ? `<div class="sc"><div class="num">${passCount}/${totalCount}</div><div class="lbl">Checklist Passed</div></div>` : ""}
  </div>` : ""}

  ${checklist.length > 0 ? `
  <div class="cl-title">Verification Checklist</div>
  ${checklist.map((item) => `
  <div class="ci ${item.checked ? "pass" : "fail"}">
    <div class="ci-icon ${item.checked ? "pass" : "fail"}">${item.checked ? "✓" : "✗"}</div>
    <span class="ci-lbl">${item.label}</span>
    <span class="ci-req">${item.required ? "Required" : "Optional"}</span>
  </div>`).join("")}` : ""}

  <div class="footer">
    <div class="ft">
      <strong>Vouch</strong> — Nigeria's Physical Verification Network<br>
      This certificate is tamper-evident and verifiable online.<br>
      Certificate ID: <strong>${cert.certificate_number}</strong><br>
      Issued: ${new Date(cert.created_at).toLocaleDateString()}
    </div>
    <div class="qr">
      <img src="${qrUrl}" alt="QR Code" />
      <p>Scan to verify</p>
    </div>
  </div>
</div>
<script>window.onload=function(){window.print()}</script>
</body>
</html>`;

    const win = window.open("", "_blank", "width=900,height=750");
    if (win) {
      win.document.write(html);
      win.document.close();
    }
  };

  const passCount = cert?.checklist_summary?.filter((i) => i.checked).length ?? 0;
  const totalCount = cert?.checklist_summary?.length ?? 0;

  return (
    <>
      <Button
        onClick={handleGenerate}
        disabled={loading}
        size={size}
        variant="outline"
        className={`gap-2 border-primary text-primary hover:bg-primary/10 ${className ?? ""}`}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Award className="h-4 w-4" />
        )}
        {loading ? "Generating..." : "Download Certificate"}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              Certificate Ready
            </DialogTitle>
          </DialogHeader>

          {cert && (
            <div className="space-y-4">
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Certificate No.
                  </span>
                  <Badge variant="outline" className="font-mono text-xs">
                    {cert.certificate_number}
                  </Badge>
                </div>
                <p className="font-semibold text-sm">{cert.item_title}</p>
                <p className="text-xs text-muted-foreground">📍 {cert.address}</p>
                <p className="text-xs text-muted-foreground">
                  Verified {new Date(cert.verified_at).toLocaleDateString()}
                </p>
                {totalCount > 0 && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                    {passCount}/{totalCount} checklist items passed
                  </div>
                )}
              </div>

              <p className="text-xs text-muted-foreground text-center">
                Click below to open the print dialog — choose <strong>Save as PDF</strong> to download.
              </p>

              <Button onClick={handlePrint} className="w-full gap-2">
                <Download className="h-4 w-4" />
                Print / Save as PDF
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2 text-xs"
                onClick={() => window.open(`/verify/${cert.certificate_number}`, "_blank")}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                View Public Verification Page
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
