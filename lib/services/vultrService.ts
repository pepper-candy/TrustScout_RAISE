import { z } from "zod";

import { getVultrEnv } from "@/lib/env";
import type { PostCategory } from "@/types/database";

const VULTR_CHAT_COMPLETIONS_URL = "https://api.vultrinference.com/v1/chat/completions";

const classificationSchema = z.enum(["FACTUAL", "OPINION", "DEBATE"]);

const vultrChatResponseSchema = z.object({
  choices: z
    .array(
      z.object({
        message: z.object({
          content: z.string(),
        }),
      })
    )
    .min(1),
});

type ClassificationSource = "vultr" | "fallback";

export type ClassificationResult = {
  category: PostCategory;
  source: ClassificationSource;
};

function buildClassificationPrompt(content: string): string {
  return `Classify this post into EXACTLY one category:
- FACTUAL: Claims a verifiable event, statistic, or attribution. Contains references to specific people, places, times, or numbers.
- OPINION: Subjective preference, ethical judgment, or review. No objective verification possible.
- DEBATE: Open-ended discussion question or prompt. No objective right or wrong answer.

Post: "${content}"

Output ONLY the category name: FACTUAL / OPINION / DEBATE`;
}

function parseCategory(rawContent: string): PostCategory | null {
  const match = rawContent.toUpperCase().match(/\b(FACTUAL|OPINION|DEBATE)\b/);
  if (!match) return null;

  const parsed = classificationSchema.safeParse(match[1]);
  return parsed.success ? parsed.data : null;
}

function fallbackClassify(content: string): PostCategory {
  const normalized = content.trim().toLowerCase();

  if (
    /\?$/.test(normalized) &&
    /\b(should|would|could|can|do you|what do you think|is it okay|agree|disagree)\b/.test(
      normalized
    )
  ) {
    return "DEBATE";
  }

  if (
    /\b(best|worst|favorite|prefer|think|believe|feel|love|hate|beautiful|ugly|ethical|moral|better)\b/.test(
      normalized
    )
  ) {
    return "OPINION";
  }

  return "FACTUAL";
}

/**
 * Classifies text with Vultr Serverless Inference when configured.
 * Falls back locally so demo post creation/classification remains available.
 */
export async function classifyPostContent(content: string): Promise<ClassificationResult> {
  let env: ReturnType<typeof getVultrEnv>;

  try {
    env = getVultrEnv();
  } catch (error) {
    console.error("Vultr classification env validation failed:", error);
    return { category: fallbackClassify(content), source: "fallback" };
  }

  if (!env.VULTR_API_KEY) {
    return { category: fallbackClassify(content), source: "fallback" };
  }

  try {
    const response = await fetch(VULTR_CHAT_COMPLETIONS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.VULTR_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: env.VULTR_MODEL,
        messages: [
          {
            role: "user",
            content: buildClassificationPrompt(content),
          },
        ],
        max_tokens: 8,
        temperature: 0,
      }),
    });

    if (!response.ok) {
      throw new Error(`Vultr classification failed with status ${response.status}`);
    }

    const payload: unknown = await response.json();
    const parsedPayload = vultrChatResponseSchema.safeParse(payload);

    if (!parsedPayload.success) {
      throw new Error("Vultr classification response did not match expected shape");
    }

    const category = parseCategory(parsedPayload.data.choices[0].message.content);

    if (!category) {
      throw new Error("Vultr classification response did not include a valid category");
    }

    return { category, source: "vultr" };
  } catch (error) {
    console.error("Vultr classification failed; using fallback:", error);
    return { category: fallbackClassify(content), source: "fallback" };
  }
}
