import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { synthesizeSpeech } from "@/lib/services/gradiumService";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { buildTrustSummaryText, toPostWithColor } from "@/lib/trustScore";
import type { PostRow } from "@/types/database";

const querySchema = z.object({
  post_id: z.uuid(),
});

/**
 * GET /api/tts?post_id=...
 * Reads a post's content + trust score aloud via Gradium TTS (Section 10 of
 * PROJECT_PLAN.md — the "🔊 Listen" button). Non-blocking/optional by
 * design: if `GRADIUM_API_KEY` isn't configured, returns 404 so the client
 * can hide the button instead of showing a broken feature.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse({ post_id: searchParams.get("post_id") ?? undefined });

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid or missing `post_id`" }, { status: 400 });
    }

    const supabase = createServiceRoleClient();
    const { data: post, error } = await supabase
      .from("posts")
      .select("*")
      .eq("id", parsed.data.post_id)
      .single()
      .overrideTypes<PostRow, { merge: false }>();

    if (error || !post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const summaryText = buildTrustSummaryText(toPostWithColor(post));
    const audio = await synthesizeSpeech(summaryText);

    if (!audio) {
      return NextResponse.json({ error: "Text-to-speech is not configured" }, { status: 404 });
    }

    return new NextResponse(new Uint8Array(audio), {
      status: 200,
      headers: {
        "Content-Type": "audio/wav",
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (error) {
    console.error("GET /api/tts failed:", error);
    return NextResponse.json({ error: "Failed to generate audio" }, { status: 500 });
  }
}
