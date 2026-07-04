import { NextRequest } from "next/server";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { decoratePost } from "@/lib/trustScore";
import type { PostCategory, PostInsert, PostsApiResponse } from "@/types/truthscout";

const categorySchema = z.enum(["FACTUAL", "OPINION", "DEBATE"]);

const createPostSchema = z.object({
  content: z.string().trim().min(8).max(500),
});

function parsePositiveInteger(value: string | null, fallback: number, maximum: number) {
  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue) || parsedValue < 1) {
    return fallback;
  }

  return Math.min(parsedValue, maximum);
}

export async function GET(request: NextRequest) {
  const supabase = createSupabaseServerClient();

  if (!supabase) {
    const response: PostsApiResponse = {
      posts: [],
      demoUsers: [],
      error: "Supabase is not configured for this deployment.",
    };

    return Response.json(response);
  }

  try {
    const page = parsePositiveInteger(request.nextUrl.searchParams.get("page"), 1, 100);
    const limit = parsePositiveInteger(request.nextUrl.searchParams.get("limit"), 8, 24);
    const categoryResult = categorySchema.safeParse(request.nextUrl.searchParams.get("category"));
    const category: PostCategory | null = categoryResult.success ? categoryResult.data : null;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let postsQuery = supabase
      .from("posts")
      .select("id, content, category, trust_score, total_votes, consensus_version, created_at")
      .order("created_at", { ascending: false })
      .range(from, to);

    if (category) {
      postsQuery = postsQuery.eq("category", category);
    }

    const { data: posts, error: postsError } = await postsQuery;

    if (postsError) {
      throw postsError;
    }

    const { data: demoUsers, error: demoUsersError } = await supabase
      .from("profiles")
      .select("id, username, accuracy_score")
      .order("accuracy_score", { ascending: false });

    if (demoUsersError) {
      throw demoUsersError;
    }

    const response: PostsApiResponse = {
      posts: (posts ?? []).map(decoratePost),
      demoUsers: demoUsers ?? [],
    };

    return Response.json(response);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unable to fetch posts.";
    const response: PostsApiResponse = {
      posts: [],
      demoUsers: [],
      error: message,
    };

    return Response.json(response);
  }
}

export async function POST(request: Request) {
  const supabase = createSupabaseServerClient();

  if (!supabase) {
    return Response.json({ error: "Supabase is not configured for this deployment." }, { status: 503 });
  }

  try {
    const payload: unknown = await request.json();
    const parsedPayload = createPostSchema.safeParse(payload);

    if (!parsedPayload.success) {
      return Response.json({ error: "Post content must be 8-500 characters." }, { status: 400 });
    }

    const postInsert: PostInsert = {
      content: parsedPayload.data.content,
      category: "FACTUAL",
      trust_score: 0.5,
      total_votes: 0,
      consensus_version: 0,
    };

    const { data: post, error: insertError } = await supabase
      .from("posts")
      .insert(postInsert)
      .select("id, content, category, trust_score, total_votes, consensus_version, created_at")
      .single();

    if (insertError) {
      throw insertError;
    }

    return Response.json({ post: decoratePost(post) }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unable to create post.";

    return Response.json({ error: message }, { status: 500 });
  }
}
