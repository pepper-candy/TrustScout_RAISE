import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { findSimilarTexts } from "@/lib/services/vultrService";
import { createServiceRoleClient } from "@/lib/supabase/server";
import type { PostRow } from "@/types/database";

const paramsSchema = z.object({ id: z.uuid() });

/**
 * GET /api/posts/:id/similar
 * Ranks every other post by semantic similarity to this one's content using
 * Vultr's Vector Store search (see `findSimilarTexts` — Vultr Serverless
 * Inference has no raw embeddings endpoint, so this is the real mechanism
 * behind "Semantic Similarity Analysis (via Vultr Embeddings)" from
 * PROJECT_PLAN.md Section 5, applied to post content since the MVP schema
 * has no free-text comments to compare votes against.
 *
 * Returns 404 if Vultr isn't configured, so the UI can treat this as an
 * optional bonus feature rather than a hard error.
 */
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const params = paramsSchema.safeParse(await context.params);
    if (!params.success) {
      return NextResponse.json({ error: "Invalid post id" }, { status: 400 });
    }

    const supabase = createServiceRoleClient();
    const { data: posts, error } = await supabase
      .from("posts")
      .select("*")
      .overrideTypes<PostRow[], { merge: false }>();

    if (error) throw error;

    const targetPost = (posts ?? []).find((post) => post.id === params.data.id);
    if (!targetPost) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const otherPosts = (posts ?? []).filter((post) => post.id !== targetPost.id);
    const postByContent = new Map(otherPosts.map((post) => [post.content, post]));

    const matches = await findSimilarTexts(
      targetPost.content,
      otherPosts.map((post) => post.content)
    );

    if (!matches) {
      return NextResponse.json({ error: "Semantic similarity is not configured" }, { status: 404 });
    }

    const similar = matches
      .map((match) => postByContent.get(match.content))
      .filter((post): post is PostRow => post !== undefined)
      .map((post) => ({ id: post.id, content: post.content, category: post.category }));

    return NextResponse.json({ similar }, { status: 200 });
  } catch (error) {
    console.error("GET /api/posts/[id]/similar failed:", error);
    return NextResponse.json({ error: "Failed to compute similarity" }, { status: 500 });
  }
}
