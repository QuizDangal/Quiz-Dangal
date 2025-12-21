// Minimal Deno & remote module type stubs for local TypeScript satisfaction
// These are ONLY for editor IntelliSense; Supabase Edge runs in Deno runtime.

// Global Deno env stub
declare const Deno: {
  env: { get(name: string): string | undefined };
  exit(code?: number): never;
  serve(handler: (req: Request) => Response | Promise<Response>): void;
};

// Deno-specific ImportMeta extension
interface ImportMeta {
  main: boolean;
  url: string;
}

// Remote std server module stub
declare module "https://deno.land/std@0.224.0/http/server.ts" {
  export function serve(handler: (req: Request) => Response | Promise<Response>): void;
}

// Older std version used by some edge functions
declare module "https://deno.land/std@0.168.0/http/server.ts" {
  export function serve(handler: (req: Request) => Response | Promise<Response>): void;
}

// JSR Supabase module stub
declare module "jsr:@supabase/supabase-js@2" {
  export interface SupabaseClient {
    from(table: string): QueryBuilder;
    rpc(fn: string, params?: Record<string, any>): Promise<{ data: any; error: any }>;
  }
  
  interface QueryBuilder {
    eq(column: string, value: any): QueryBuilder & Promise<{ data: any; error: any; count?: number }>;
    in(column: string, values: any[]): QueryBuilder & Promise<{ data: any; error: any; count?: number }>;
    lte(column: string, value: any): QueryBuilder & Promise<{ data: any; error: any; count?: number }>;
    gte(column: string, value: any): QueryBuilder & Promise<{ data: any; error: any; count?: number }>;
    limit(count: number): QueryBuilder & Promise<{ data: any; error: any; count?: number }>;
    select(columns?: string, options?: { head?: boolean; count?: 'exact' | 'planned' | 'estimated' }): QueryBuilder & Promise<{ data: any; error: any; count?: number }>;
    update(values: Record<string, any>): QueryBuilder & Promise<{ data: any; error: any }>;
    insert(values: Record<string, any> | Record<string, any>[]): Promise<{ data: any; error: any }>;
    delete(): QueryBuilder & Promise<{ data: any; error: any }>;
  }
  
  export function createClient(
    supabaseUrl: string,
    supabaseKey: string,
    options?: {
      auth?: {
        autoRefreshToken?: boolean;
        persistSession?: boolean;
      };
    }
  ): SupabaseClient;
}

// Supabase JS client stub for ESM imports
declare module "https://esm.sh/@supabase/supabase-js@2" {
  export interface SupabaseClient {
    from(table: string): QueryBuilder;
    rpc(fn: string, params?: Record<string, any>): Promise<{ data: any; error: any }>;
    auth: {
      getUser(): Promise<{ data: { user: any | null } | null; error: any }>;
    };
  }

  type QueryResult = { data: any; error: any; count?: number };

  interface QueryBuilder extends PromiseLike<QueryResult> {
    eq(column: string, value: any): QueryBuilder;
    lte(column: string, value: any): QueryBuilder;
    gte(column: string, value: any): QueryBuilder;
    select(columns?: string, options?: { head?: boolean; count?: 'exact' | 'planned' | 'estimated' }): QueryBuilder;
    single(): Promise<{ data: any; error: any }>;
    update(values: Record<string, any>): QueryBuilder;
    insert(values: Record<string, any> | Record<string, any>[]): Promise<{ data: any; error: any }>;
    delete(): QueryBuilder;
  }
  
  export function createClient(
    supabaseUrl: string,
    supabaseKey: string,
    options?: {
      global?: {
        headers?: Record<string, string>;
      };
      auth?: {
        autoRefreshToken?: boolean;
        persistSession?: boolean;
      };
    }
  ): SupabaseClient;
}

// web-push URL import stub (used in Edge functions)
declare module "https://esm.sh/web-push@3.6.7?target=deno" {
  export interface WebPushSubscription {
    endpoint: string;
    keys?: { p256dh?: string; auth?: string };
    expirationTime?: number | null;
    [k: string]: unknown;
  }

  export interface WebPush {
    setVapidDetails(contact: string, publicKey: string, privateKey: string): void;
    sendNotification(subscription: WebPushSubscription, payload: string): Promise<void>;
  }

  const mod: WebPush;
  export default mod;
}
