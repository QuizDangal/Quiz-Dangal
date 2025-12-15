import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// Defer web-push import to request time to avoid startup errors on preflight
// Typed as minimal interface required for sending notifications.
interface IWebPush {
  setVapidDetails(contact: string, publicKey: string, privateKey: string): void;
  sendNotification(subscription: WebPushSubscription, payload: string): Promise<void>;
}

// Minimal shape for browser push subscription used by web-push
interface WebPushSubscription {
  endpoint: string;
  keys?: { p256dh?: string; auth?: string };
  expirationTime?: number | null;
  [k: string]: unknown;
}
let webpush: IWebPush | null = null;

// Incoming POST body shape
interface NotificationRequestBody {
  message?: string;
  title?: string;
  type?: string;
  url?: string;
  segment?: string;
  quizId?: string;
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
  ?? Deno.env.get("PROJECT_SUPABASE_URL")
  ?? "";
const SUPABASE_SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  || Deno.env.get("SUPABASE_SERVICE_ROLE")
  || Deno.env.get("PROJECT_SERVICE_ROLE_KEY")
  || "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("VITE_SUPABASE_ANON_KEY") || "";

const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY") || Deno.env.get("VITE_VAPID_PUBLIC_KEY");
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY") || Deno.env.get("VITE_VAPID_PRIVATE_KEY");
// Support both CONTACT_EMAIL and legacy VAPID_CONTACT_EMAIL env names
const VAPID_CONTACT =
  Deno.env.get("CONTACT_EMAIL") ||
  Deno.env.get("VAPID_CONTACT_EMAIL") ||
  "mailto:notify@example.com"; // configure in project settings

const HAS_VAPID = Boolean(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);
if (!HAS_VAPID) {
  console.warn("VAPID keys are not set in environment variables. Push delivery will be skipped.");
}

// CORS: support multiple origins (comma-separated). Default to production.
const DEFAULT_ORIGINS = "https://quizdangal.com,http://localhost:5173,http://localhost:5174";
const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS")
  || Deno.env.get("ALLOWED_ORIGIN")
  || DEFAULT_ORIGINS)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

function makeCorsHeaders(req: Request): Record<string, string> {
  const reqOrigin = req.headers.get("Origin") || "";
  const isLocal = reqOrigin.startsWith("http://localhost");
  const isAllowed = ALLOWED_ORIGINS.includes("*")
    || ALLOWED_ORIGINS.includes(reqOrigin)
    || (isLocal && ALLOWED_ORIGINS.some((o) => o.startsWith("http://localhost")));
  const allowOrigin = isAllowed ? reqOrigin : (ALLOWED_ORIGINS[0] || "https://quizdangal.com");
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Vary": "Origin",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    // Allow GET so clients can retrieve public config like VAPID key
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  };
}

// Helper to build JSON responses with consistent headers
function json(data: unknown, init?: { status?: number; headers?: Record<string,string> }): Response {
  const status = init?.status ?? 200;
  const headers = { 'Content-Type': 'application/json', ...(init?.headers || {}) };
  return new Response(JSON.stringify(data), { status, headers });
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight FIRST, before any try-catch
  if (req.method === 'OPTIONS') {
    const corsHeaders = {
      "Access-Control-Allow-Origin": req.headers.get("Origin") || "https://quizdangal.com",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      // Mirror allowed methods here
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Vary": "Origin",
    };
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Public GET endpoint to expose non-sensitive config (e.g., VAPID public key)
  if (req.method === 'GET') {
    const body = {
      vapidPublicKey: VAPID_PUBLIC_KEY || '',
      allowedOrigins: ALLOWED_ORIGINS,
    };
    return json(body, { status: 200, headers: makeCorsHeaders(req) });
  }
  
  try {
    // Only POST is allowed beyond this point
    if (req.method !== 'POST') {
      return new Response("Method Not Allowed", { status: 405, headers: { ...makeCorsHeaders(req) } });
    }
    const body: NotificationRequestBody = await req.json().catch(() => ({}));
    const { message, title, type, url, segment, quizId } = body;

    const missingCoreConfig: string[] = [];
    if (!SUPABASE_URL) missingCoreConfig.push('SUPABASE_URL');
    if (!SUPABASE_SERVICE_ROLE) missingCoreConfig.push('SUPABASE_SERVICE_ROLE_KEY');
    if (!HAS_VAPID) missingCoreConfig.push('VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY');
    if (!SUPABASE_ANON_KEY) missingCoreConfig.push('SUPABASE_ANON_KEY');

    if (missingCoreConfig.length > 0) {
      const detail = `Missing required environment variables: ${missingCoreConfig.join(', ')}`;
      console.error(detail);
      const status = missingCoreConfig.includes('VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY') ? 503 : 500;
      return json({ error: detail }, { status, headers: makeCorsHeaders(req) });
    }

    // Authenticate caller and ensure they are admin
    const authHeader = req.headers.get('Authorization');
    const supabaseUserClient: SupabaseClient = createClient(
      SUPABASE_URL,
      SUPABASE_ANON_KEY,
      { global: { headers: { Authorization: authHeader ?? '' } } }
    );
    const userResp = await supabaseUserClient.auth.getUser();
    const userErr = userResp.error; const user = userResp.data?.user ?? null;
    if (userErr || !user) {
      return json({ error: 'Unauthorized' }, { status: 401, headers: makeCorsHeaders(req) });
    }

    if (!message || !title) {
      return json({ error: "Message and title are required." }, { status: 400, headers: makeCorsHeaders(req) });
    }

    const supabaseAdmin: SupabaseClient = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE,
      { auth: { persistSession: false } }
    );

    // Verify admin role from profiles table
    const { data: profile, error: profErr } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (profErr || !profile || profile.role !== 'admin') {
      return json({ error: 'Forbidden' }, { status: 403, headers: makeCorsHeaders(req) });
    }

    // Determine audience based on optional segment value.
    // Supported:
    //  - undefined or 'all' => broadcast to all subscribers
    //  - 'participants:<quiz_uuid>' => only users who joined that quiz
    type SubscriptionRow = { subscription_object: WebPushSubscription };
    let subscriptions: SubscriptionRow[] = [];
    let fetchError: Error | null = null;

    const seg = typeof segment === 'string' ? segment.trim() : '';
    const segMatch = /^participants\s*:\s*([0-9a-fA-F-]{36})$/.exec(seg || '');

    if (segMatch) {
      const segQuizId = segMatch[1];
      // Efficiently fetch subscriptions via view join
      const { data, error: qerr } = await supabaseAdmin
        .from('v_quiz_subscriptions')
        .select('subscription_object')
        .eq('quiz_id', segQuizId);
      subscriptions = (data || []) as SubscriptionRow[];
      fetchError = qerr as Error | null;
    } else {
      const { data, error: berr } = await supabaseAdmin
        .from('push_subscriptions')
        .select('subscription_object');
      subscriptions = (data || []) as SubscriptionRow[];
      fetchError = berr as Error | null;
    }

    if (fetchError) {
      console.error("Error fetching subscriptions:", fetchError);
      return json({ error: fetchError.message }, { status: 500, headers: makeCorsHeaders(req) });
    }

    const payloadQuizId = typeof quizId === 'string' ? quizId : (segMatch ? segMatch[1] : undefined);
    // Derive URL if missing and quizId exists
    let finalUrl = typeof url === 'string' ? url : undefined;
    if (!finalUrl && payloadQuizId) {
      if (type === 'start_soon') finalUrl = `/quiz/${payloadQuizId}`;
      else if (type === 'result') finalUrl = `/results/${payloadQuizId}`;
    }

    const notificationPayload = JSON.stringify({
      title: title || '',
      body: message || '',
      icon: "/android-chrome-192x192.png",
      type: typeof type === 'string' ? type : undefined,
      url: finalUrl,
      quizId: payloadQuizId,
    });

    // Dynamically import and configure web-push only when needed
    if (HAS_VAPID && !webpush) {
      const mod = await import("https://esm.sh/web-push@3.6.7?target=deno");
      const candidate = (mod.default || mod) as Partial<IWebPush>;
      if (candidate && typeof candidate.setVapidDetails === 'function' && typeof candidate.sendNotification === 'function') {
        webpush = candidate as IWebPush;
        webpush.setVapidDetails(
          VAPID_CONTACT,
          VAPID_PUBLIC_KEY!,
          VAPID_PRIVATE_KEY!
        );
      } else {
        console.error('web-push module shape unexpected; push disabled');
      }
    }

    const sendPromises = subscriptions.map(async (sub) => {
      const endpoint = sub.subscription_object?.endpoint;
      try {
        if (webpush) {
          await webpush.sendNotification(sub.subscription_object, notificationPayload);
        }
      } catch (err: unknown) {
        const status = typeof (err as any)?.statusCode === 'number' ? (err as any).statusCode : undefined;
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`Failed to send notification${endpoint ? ` to ${endpoint}` : ''}. Status: ${status}. Error: ${msg}`);
        if ((status === 404 || status === 410) && endpoint) {
          console.log(`Cleaning up expired subscription for endpoint: ${endpoint}`);
          const { error: delErr } = await supabaseAdmin
            .from('push_subscriptions')
            .delete()
            .eq('endpoint', endpoint);
          if (delErr) {
            console.error(`Failed to delete expired subscription for ${endpoint}:`, delErr.message);
          }
        }
      }
    });

    await Promise.all(sendPromises);

    // Log this broadcast once for admin activity view
    // Log this push once for admin activity view
    try {
      await supabaseAdmin
        .from('notifications')
        .insert({
          title: title,
          message: message,
          type: typeof type === 'string' ? type : 'broadcast_push',
          segment: typeof segment === 'string' ? segment : null,
          created_by: user?.id ?? null,
        });
    } catch (logErr) {
      console.error('Failed to log push:', logErr);
    }

    return json({ message: "Notifications sent successfully." }, { status: 200, headers: makeCorsHeaders(req) });
  } catch (e: unknown) {
    console.error("Main error:", e);
    // Avoid leaking stack traces or sensitive error details in responses
    console.error('Unhandled error in send-notifications');
    return json({ ok: false, error: 'internal_error' }, { status: 500, headers: makeCorsHeaders(req) });
  }
});