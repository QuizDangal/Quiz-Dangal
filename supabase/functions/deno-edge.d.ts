// Minimal Deno & remote module type stubs for local TypeScript satisfaction
// These are ONLY for editor IntelliSense; Supabase Edge runs in Deno runtime.

// Global Deno env stub
declare const Deno: {
  env: { get(name: string): string | undefined };
  exit(code?: number): never;
};

// Remote std server module stub
declare module "https://deno.land/std@0.224.0/http/server.ts" {
  export function serve(handler: (req: Request) => Response | Promise<Response>): void;
}

// Supabase JS client stub for ESM imports
declare module "https://esm.sh/@supabase/supabase-js@2" {
  interface QueryBuilder {
    eq(column: string, value: any): QueryBuilder & Promise<{ data: any; error: any; count?: number }>;
    lte(column: string, value: any): QueryBuilder & Promise<{ data: any; error: any; count?: number }>;
    gte(column: string, value: any): QueryBuilder & Promise<{ data: any; error: any; count?: number }>;
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
  ): {
    from(table: string): QueryBuilder;
    rpc(fn: string, params?: Record<string, any>): Promise<{ data: any; error: any }>;
  };
}
