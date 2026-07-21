import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function generateCertNumber(): string {
  const year = new Date().getFullYear();
  const random = Math.random().toString(36).substr(2, 8).toUpperCase();
  return `VCH-${year}-${random}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user JWT
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Service role client bypasses RLS
    const admin = createClient(supabaseUrl, serviceRoleKey);

    const { task_id } = await req.json();
    if (!task_id) {
      return new Response(JSON.stringify({ error: "task_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch task
    const { data: task, error: taskError } = await admin
      .from("tasks")
      .select("*")
      .eq("id", task_id)
      .single();

    if (taskError || !task) {
      return new Response(JSON.stringify({ error: "Task not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only requester or assigned voucher can generate cert
    if (task.requester_id !== user.id && task.voucher_id !== user.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (task.status !== "completed") {
      return new Response(
        JSON.stringify({ error: "Task must be completed before generating a certificate" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Return existing cert if already generated (idempotent)
    const { data: existing } = await admin
      .from("certificates")
      .select("*")
      .eq("task_id", task_id)
      .maybeSingle();

    if (existing) {
      const { data: voucherProfile } = await admin
        .from("profiles")
        .select("full_name, avatar_url, vouchscore")
        .eq("id", task.voucher_id)
        .maybeSingle();
      return new Response(
        JSON.stringify({ certificate: existing, voucher: voucherProfile }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch latest verification record
    const { data: verification } = await admin
      .from("verifications")
      .select("*")
      .eq("task_id", task_id)
      .order("submitted_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Fetch voucher profile
    const { data: voucherProfile } = await admin
      .from("profiles")
      .select("full_name, avatar_url, vouchscore")
      .eq("id", task.voucher_id)
      .maybeSingle();

    // Build checklist summary
    const checklist: Array<{ id: number; label: string; required: boolean }> = task.checklist || [];
    const completedChecklist: Array<{ id: number; checked: boolean; notes?: string }> =
      verification?.completed_checklist || [];

    const checklistSummary = checklist.map((item) => {
      const done = completedChecklist.find((c) => c.id === item.id);
      return {
        label: item.label,
        required: item.required,
        checked: done?.checked ?? false,
        notes: done?.notes ?? null,
      };
    });

    const certNumber = generateCertNumber();

    const { data: newCert, error: insertError } = await admin
      .from("certificates")
      .insert({
        task_id,
        voucher_id: task.voucher_id,
        requester_id: task.requester_id,
        certificate_number: certNumber,
        item_title: task.title,
        category: task.category,
        address: task.address,
        gps_latitude: verification?.gps_latitude ?? null,
        gps_longitude: verification?.gps_longitude ?? null,
        verified_at: verification?.submitted_at ?? new Date().toISOString(),
        vouchscore_at_time: voucherProfile?.vouchscore ?? null,
        ai_analysis_score: verification?.ai_analysis_score ?? null,
        checklist_summary: checklistSummary,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Certificate insert error:", insertError);
      return new Response(JSON.stringify({ error: "Failed to create certificate" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ certificate: newCert, voucher: voucherProfile }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unhandled error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
