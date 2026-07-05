import { NextResponse } from "next/server";

import { synthesizeSpeech } from "@/lib/services/gradiumService";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { buildPopularBriefingText, toPostWithColor } from "@/lib/trustScore";
import type { PostRow } from "@/types/database";

const BRIEFING_POST_LIMIT = 5;

/**
 * GET /api/tts/briefing
 * Reads the top popular posts aloud via Gradium TTS (header "Briefing" control).
 */
export async function GET() {
  try {
    const supabase = createServiceRoleClient();
    const { data: posts, error } = await supabase
      .from("posts")
      .select("*")
      .order("total_votes", { ascending: false })
      .limit(BRIEFING_POST_LIMIT)
      .overrideTypes<PostRow[], { merge: false }>();

    if (error) throw error;

    if (!posts?.length) {
      return NextResponse.json({ error: "No posts available for briefing" }, { status: 404 });
    }

    const summaryText = buildPopularBriefingText(posts.map((post) => toPostWithColor(post)));
    const audio = await synthesizeSpeech(summaryText);

    if (!audio) {
      return NextResponse.json({ error: "Text-to-speech is not configured" }, { status: 404 });
    }

    return new NextResponse(new Uint8Array(audio), {
      status: 200,
      headers: {
        "Content-Type": "audio/wav",
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (error) {
    console.error("GET /api/tts/briefing failed:", error);
    return NextResponse.json({ error: "Failed to generate briefing audio" }, { status: 500 });
  }
}
