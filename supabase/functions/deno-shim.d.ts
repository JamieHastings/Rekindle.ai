/**
 * Ambient typings so the repo's TypeScript (Node/Vite settings) can typecheck
 * Supabase Edge Functions. Deno still runs npm:/jsr: specifiers at deploy time.
 */

declare module "jsr:@supabase/functions-js/edge-runtime.d.ts";

declare const Deno: {
  env: { get(key: string): string | undefined };
  serve: (
    handler: (request: Request) => Response | Promise<Response>
  ) => void;
};
