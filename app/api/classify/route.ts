import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { classifyPostContent } from "@/lib/services/vultrService";

const classifyRequestSchema = z.object({
  content: z.string().trim().min(1, "content is required").max(5000, "content is too long"),
});

/**
 * POST /api/classify
 * Classifies post text as FACTUAL, OPINION, or DEBATE using Vultr Serverless
 * Inference with a local fallback for demo resilience.
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

    const result = await classifyPostContent(parsed.data.content);

    return NextResponse.json({ category: result.category }, { status: 200 });
  } catch (error) {
    console.error("POST /api/classify failed:", error);
    return NextResponse.json({ error: "Failed to classify post" }, { status: 500 });
  }
}
