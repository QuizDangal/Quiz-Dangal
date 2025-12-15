// Minimal Deno & remote module type stubs for local TypeScript satisfaction
// These are ONLY for editor IntelliSense; Supabase Edge runs in Deno runtime.

// Global Deno env stub
declare const Deno: {
  env: { get(name: string): string | undefined };
};

// Remote std server module stub
declare module "https://deno.land/std@0.224.0/http/server.ts" {
  export function serve(handler: (req: Request) => Response | Promise<Response>): void;
}
