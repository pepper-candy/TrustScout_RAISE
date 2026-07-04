import { z } from "zod";

import { getVultrEnv } from "@/lib/env";
import type { PostCategory } from "@/types/database";

const postCategorySchema = z.enum(["FACTUAL", "OPINION", "DEBATE"]);

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

const CLASSIFICATION_SYSTEM_PROMPT = [
  "Classify the user's post into EXACTLY one category:",
  "- FACTUAL: Claims a verifiable event, statistic, or attribution. Contains references to specific people, places, times, or numbers.",
  "- OPINION: Subjective preference, ethical judgment, or review. No objective verification possible.",
  "- DEBATE: Open-ended discussion question or prompt. No objective right or wrong answer.",
  "Output ONLY the category name: FACTUAL / OPINION / DEBATE",
].join("\n");

function parseCategory(rawOutput: string): PostCategory | null {
  const normalized = rawOutput.trim().toUpperCase();
  const exact = postCategorySchema.safeParse(normalized);
  if (exact.success) return exact.data;

  const match = normalized.match(/\b(FACTUAL|OPINION|DEBATE)\b/);
  if (!match) return null;

  const matchedCategory = postCategorySchema.safeParse(match[1]);
  return matchedCategory.success ? matchedCategory.data : null;
}

function classifyWithFallback(content: string): PostCategory {
  const normalized = content.trim().toLowerCase();

  if (
    normalized.endsWith("?") ||
    /\b(should|would you|what do you think|do you agree|debate)\b/.test(normalized)
  ) {
    return "DEBATE";
  }

  if (
    /\b(i think|i believe|in my opinion|best|worst|love|hate|beautiful|terrible|amazing|awful|favorite)\b/.test(
      normalized
    )
  ) {
    return "OPINION";
  }

  return "FACTUAL";
}

export async function classifyPostContent(content: string): Promise<PostCategory> {
  const fallbackCategory = classifyWithFallback(content);

  try {
    const env = getVultrEnv();
    if (!env.inferenceApiKey) {
      return fallbackCategory;
    }

    const response = await fetch(env.inferenceUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.inferenceApiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        model: env.inferenceModel,
        messages: [
          {
            role: "system",
            content: CLASSIFICATION_SYSTEM_PROMPT,
          },
          {
            role: "user",
            content,
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
    const parsed = vultrChatResponseSchema.safeParse(payload);
    if (!parsed.success) {
      throw new Error("Vultr classification returned an unexpected response shape");
    }

    return parseCategory(parsed.data.choices[0].message.content) ?? fallbackCategory;
  } catch (error) {
    console.error("Vultr classification unavailable; using local fallback:", error);
    return fallbackCategory;
  }
}
