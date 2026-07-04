import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { classifyPostContent } from "@/lib/services/vultrService";

const classifyRequestSchema = z.object({
  content: z.string().trim().min(3, "Content must be at least 3 characters").max(2_000),
});

/**
 * POST /api/classify
 * Uses Vultr Serverless Inference to classify text as FACTUAL, OPINION, or
 * DEBATE. If Vultr is unavailable or unconfigured, the service returns a
 * deterministic local fallback so post creation can keep moving during demos.
 */
export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();
    const parsed = classifyRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: z.flattenError(parsed.error) },
        { status: 400 }
      );
    }

    const category = await classifyPostContent(parsed.data.content);

    return NextResponse.json({ category }, { status: 200 });
  } catch (error) {
    console.error("POST /api/classify failed:", error);
    return NextResponse.json({ error: "Failed to classify post" }, { status: 500 });
  }
}
