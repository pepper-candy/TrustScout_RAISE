/**
 * Types mirroring the EXISTING Supabase schema (profiles, posts, votes).
 * These tables already exist with seed data — do not alter their shape here
 * without also updating the real database schema.
 */

export type PostCategory = "FACTUAL" | "OPINION" | "DEBATE";
export type VoteType = "TRUE" | "PARTIAL" | "FALSE";
export type TrustColorCode = "dark-green" | "light-green" | "gray" | "orange" | "red";

/**
 * Matches Supabase codegen relationship metadata (empty array = no FK joins).
 *
 * NOTE: these are declared with `type`, not `interface`. TypeScript's
 * structural checker does not consider `interface` declarations to satisfy
 * index-signature types like `Record<string, unknown>` in conditional-type
 * "extends" checks (even though they're structurally identical to an
 * equivalent `type` object literal). supabase-js's `GenericTable` constraint
 * relies on `Row`/`Insert`/`Update` extending `Record<string, unknown>`, so
 * using `interface` here silently makes every table resolve to `never`,
 * which is why `.insert()`/`.update()` calls below failed with
 * "may only specify known properties ... type 'never[]'".
 */
type DbRelationship = {
  foreignKeyName: string;
  columns: string[];
  isOneToOne?: boolean;
  referencedRelation: string;
  referencedColumns: string[];
};

export type ProfileRow = {
  id: string;
  username: string;
  accuracy_score: number;
  total_votes: number;
  correct_votes: number;
  incorrect_votes: number;
  created_at: string;
};

export type PostRow = {
  id: string;
  content: string;
  category: PostCategory;
  trust_score: number;
  total_votes: number;
  consensus_version: number;
  created_at: string;
};

export type VoteRow = {
  id: string;
  post_id: string;
  user_id: string;
  vote_type: VoteType;
  is_witness: boolean;
  weight: number;
  vote_timestamp: string;
  consensus_version_at_vote: number;
};

/** A post enriched with a client-facing trust color, computed in the app layer. */
export type PostWithColor = PostRow & {
  color_code: TrustColorCode | null;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: Partial<ProfileRow> & Pick<ProfileRow, "username">;
        Update: Partial<ProfileRow>;
        Relationships: DbRelationship[];
      };
      posts: {
        Row: PostRow;
        Insert: Partial<PostRow> & Pick<PostRow, "content" | "category">;
        Update: Partial<PostRow>;
        Relationships: DbRelationship[];
      };
      votes: {
        Row: VoteRow;
        Insert: Omit<VoteRow, "id" | "vote_timestamp"> & {
          id?: string;
          vote_timestamp?: string;
        };
        Update: Partial<VoteRow>;
        Relationships: DbRelationship[];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: {
      post_category: PostCategory;
      vote_type: VoteType;
    };
    CompositeTypes: { [_ in never]: never };
  };
};
