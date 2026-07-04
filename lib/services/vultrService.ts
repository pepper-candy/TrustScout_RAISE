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
    if (!env.apiKey) {
      return fallbackCategory;
    }

    const response = await fetch(env.inferenceUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.apiKey}`,
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

/**
 * Vultr Serverless Inference has no standalone "give me a vector" endpoint
 * (confirmed against https://api.vultrinference.com/ — embeddings are only
 * exposed via the Vector Store API: create a collection, add text items,
 * then search it semantically). We use that flow as the "Vultr Embeddings"
 * building block for bias/bot detection (PROJECT_PLAN.md Section 5) —
 * e.g. flagging near-duplicate post content, since the MVP schema has no
 * free-text comments to run astroturfing checks against.
 */
const vultrCollectionResponseSchema = z.object({
  collection: z.object({ id: z.string() }),
});

const vultrSearchResponseSchema = z.object({
  results: z.array(
    z.object({
      id: z.string(),
      content: z.string(),
    })
  ),
});

async function vultrFetch(url: string, apiKey: string, init?: RequestInit): Promise<Response> {
  return fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...init?.headers,
    },
  });
}

export interface SimilarTextMatch {
  content: string;
  similarityRank: number;
}

/**
 * Ranks `candidateTexts` by semantic similarity to `targetText` using a
 * throwaway Vultr Vector Store collection (created, queried, then deleted).
 * Returns `null` (fails soft) if Vultr isn't configured or unreachable,
 * since this is a bonus/P2 feature per the project plan.
 */
export async function findSimilarTexts(
  targetText: string,
  candidateTexts: string[]
): Promise<SimilarTextMatch[] | null> {
  if (candidateTexts.length === 0) return [];

  const env = getVultrEnv();
  if (!env.apiKey) return null;

  let collectionId: string | null = null;

  try {
    const createResponse = await vultrFetch(env.vectorStoreUrl, env.apiKey, {
      method: "POST",
      body: JSON.stringify({ name: `truthscout-similarity-${Date.now()}` }),
    });
    if (!createResponse.ok) {
      throw new Error(`Vultr vector store collection creation failed with status ${createResponse.status}`);
    }
    const createPayload = vultrCollectionResponseSchema.parse(await createResponse.json());
    collectionId = createPayload.collection.id;

    await Promise.all(
      candidateTexts.map((content) =>
        vultrFetch(`${env.vectorStoreUrl}/${collectionId}/items`, env.apiKey!, {
          method: "POST",
          body: JSON.stringify({ content }),
        })
      )
    );

    const searchResponse = await vultrFetch(`${env.vectorStoreUrl}/${collectionId}/search`, env.apiKey, {
      method: "POST",
      body: JSON.stringify({ input: targetText }),
    });
    if (!searchResponse.ok) {
      throw new Error(`Vultr vector store search failed with status ${searchResponse.status}`);
    }
    const searchPayload = vultrSearchResponseSchema.parse(await searchResponse.json());

    return searchPayload.results.map((result, index) => ({
      content: result.content,
      similarityRank: index,
    }));
  } catch (error) {
    console.error("Vultr semantic similarity unavailable:", error);
    return null;
  } finally {
    if (collectionId) {
      await vultrFetch(`${env.vectorStoreUrl}/${collectionId}`, env.apiKey, { method: "DELETE" }).catch(() => {});
    }
  }
}
