export type PostCategory = "FACTUAL" | "OPINION" | "DEBATE";

export type VoteType = "TRUE" | "PARTIAL" | "FALSE";

export interface ProfileRow extends Record<string, unknown> {
  id: string;
  username: string;
  accuracy_score: number;
  total_votes: number;
  correct_votes: number;
  incorrect_votes: number;
  created_at: string;
}

export interface PostRow extends Record<string, unknown> {
  id: string;
  content: string;
  category: PostCategory;
  trust_score: number;
  total_votes: number;
  consensus_version: number;
  created_at: string;
}

export interface VoteRow extends Record<string, unknown> {
  id: string;
  post_id: string;
  user_id: string;
  vote_type: VoteType;
  is_witness: boolean;
  weight: number;
  vote_timestamp: string;
  consensus_version_at_vote: number;
}

export type ProfileInsert = Omit<ProfileRow, "created_at"> & {
  created_at?: string;
} & Record<string, unknown>;

export type ProfileUpdate = Partial<Omit<ProfileRow, "id" | "created_at">> & Record<string, unknown>;

export type PostInsert = Pick<PostRow, "content" | "category"> &
  Partial<Pick<PostRow, "id" | "trust_score" | "total_votes" | "consensus_version" | "created_at">> &
  Record<string, unknown>;

export type PostUpdate = Partial<Omit<PostRow, "id" | "created_at">> & Record<string, unknown>;

export type VoteInsert = Omit<VoteRow, "id"> & {
  id?: string;
} & Record<string, unknown>;

export type VoteUpdate = Partial<Omit<VoteRow, "id">> & Record<string, unknown>;

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: ProfileInsert;
        Update: ProfileUpdate;
        Relationships: [];
      };
      posts: {
        Row: PostRow;
        Insert: PostInsert;
        Update: PostUpdate;
        Relationships: [];
      };
      votes: {
        Row: VoteRow;
        Insert: VoteInsert;
        Update: VoteUpdate;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export interface TrustScoreDisplay {
  color: string;
  label: string;
  percentage: number;
}

export interface DemoUser {
  id: string;
  username: string;
  accuracy_score: number;
}

export interface FeedPost extends PostRow {
  color_code: string;
  color_label: string;
}

export interface PostsApiResponse {
  posts: FeedPost[];
  demoUsers: DemoUser[];
  error?: string;
}

export interface VoteApiResponse {
  post: FeedPost;
  vote: Pick<VoteRow, "id" | "vote_type" | "is_witness" | "weight">;
}
