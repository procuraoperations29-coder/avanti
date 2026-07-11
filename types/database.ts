/**
 * Database types.
 *
 * This is a stub. Once the Phase 3 schema is applied to a real Supabase
 * project (Slice 2), run:
 *
 *   pnpm dlx supabase gen types typescript --project-id <ref> > types/database.ts
 *
 * to overwrite this with generated types. Everything downstream is typed
 * against `Database`, so a proper generated file makes the whole app
 * type-safe against the schema.
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
