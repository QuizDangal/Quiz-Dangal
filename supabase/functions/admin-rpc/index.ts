// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type AdminRpcBody = {
  action?: string;
  params?: Record<string, unknown>;
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  ?? Deno.env.get("SUPABASE_SERVICE_ROLE")
  ?? "";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("VITE_SUPABASE_ANON_KEY") ?? "";

const DEFAULT_ORIGINS = "https://quizdangal.com,http://localhost:5173,http://localhost:5174";
const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") ?? Deno.env.get("ALLOWED_ORIGIN") ?? DEFAULT_ORIGINS)
  .split(",")
  .map((entry) => entry.trim())
  .filter(Boolean);

const ACTIONS: Record<string, string> = {
  approveRedemption: "admin_approve_redemption",
  rejectRedemption: "admin_reject_redemption",
  seedQuizDayMulti: "admin_seed_quiz_day_multi",
  seedQuizDaySingle: "admin_seed_quiz_day_single",
  updateCorrectAnswers: "admin_update_correct_answers",
  finalizePredictionQuiz: "admin_finalize_prediction_quiz",
  deleteQuiz: "admin_delete_quiz",
};

function makeCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  const isLocal = origin.startsWith("http://localhost");
  const allowed = ALLOWED_ORIGINS.includes("*")
    || ALLOWED_ORIGINS.includes(origin)
    || (isLocal && ALLOWED_ORIGINS.some((value) => value.startsWith("http://localhost")));
  return {
    "Access-Control-Allow-Origin": allowed ? origin : (ALLOWED_ORIGINS[0] ?? "https://quizdangal.com"),
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function json(data: unknown, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

async function ensureAdmin(authHeader: string) {
  if (!SUPABASE_URL || !ANON_KEY || !SERVICE_ROLE_KEY) {
    return { ok: false as const, status: 500, error: "server_not_configured" };
  }
  if (!authHeader) {
    return { ok: false as const, status: 401, error: "missing_authorization" };
  }

  // Strip optional "Bearer " prefix and pass the raw JWT explicitly to getUser().
  // supabase-js v2 does NOT reliably read the JWT from a globally-set
  // Authorization header during auth.getUser() - it must be passed as an arg.
  const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!jwt) {
    return { ok: false as const, status: 401, error: "missing_token" };
  }

  // We can use the admin client to verify JWTs via service_role - this avoids
  // any ambiguity around session storage in the user client.
  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const { data: userResp, error: userErr } = await adminClient.auth.getUser(jwt);
  const user = userResp?.user;
  if (userErr || !user?.id) {
    return { ok: false as const, status: 401, error: userErr?.message || "unauthorized" };
  }

  const { data: profile, error: profileErr } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileErr || String(profile?.role || "").toLowerCase() !== "admin") {
    return { ok: false as const, status: 403, error: "forbidden" };
  }

  return { ok: true as const, userId: user.id, adminClient };
}

Deno.serve(async (req: Request) => {
  const corsHeaders = makeCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "method_not_allowed" }, 405, corsHeaders);
  }

  try {
    const admin = await ensureAdmin(req.headers.get("Authorization") ?? "");
    if (!admin.ok) {
      return json({ error: admin.error }, admin.status, corsHeaders);
    }

    const body = (await req.json().catch(() => ({}))) as AdminRpcBody;
    const rpcName = ACTIONS[String(body.action || "")];
    if (!rpcName) {
      return json({ error: "invalid_action" }, 400, corsHeaders);
    }

    const params = body.params && typeof body.params === "object" ? body.params : {};
    const { data, error } = await admin.adminClient.rpc(rpcName, params);
    if (error) {
      console.error("admin-rpc failed", { action: body.action, rpcName, message: error.message });
      return json({ error: error.message || "rpc_failed" }, 400, corsHeaders);
    }

    return json({ ok: true, data: data ?? null }, 200, corsHeaders);
  } catch (error) {
    console.error("admin-rpc error", error instanceof Error ? error.message : String(error));
    return json({ error: "internal_error" }, 500, corsHeaders);
  }
});
