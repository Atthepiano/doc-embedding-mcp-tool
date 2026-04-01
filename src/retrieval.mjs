import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";

const EMBEDDING_MODEL = "gemini-embedding-2-preview";
const EMBEDDING_DIMENSIONS = 768;
const DEFAULT_TOP_K = 5;
const DEFAULT_THRESHOLD = 0.5;

let aiClient;
let supabaseClient;

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

function getAiClient() {
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey: requireEnv("GEMINI_API_KEY") });
  }
  return aiClient;
}

function getSupabaseClient() {
  if (!supabaseClient) {
    supabaseClient = createClient(
      requireEnv("SUPABASE_URL"),
      requireEnv("SUPABASE_KEY")
    );
  }
  return supabaseClient;
}

export function normalizeTopK(value, fallback = DEFAULT_TOP_K) {
  return typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= 20
    ? value
    : fallback;
}

export function normalizeThreshold(value, fallback = DEFAULT_THRESHOLD) {
  return typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 1
    ? value
    : fallback;
}

export async function embedQuery(query) {
  const ai = getAiClient();
  const embeddingResult = await ai.models.embedContent({
    model: EMBEDDING_MODEL,
    contents: query,
    config: {
      taskType: "RETRIEVAL_QUERY",
      outputDimensionality: EMBEDDING_DIMENSIONS,
    },
  });

  const embedding = embeddingResult.embeddings?.[0]?.values;
  if (!embedding || embedding.length === 0) {
    throw new Error("Failed to generate embedding");
  }

  return embedding;
}

export async function searchDocuments({
  query,
  topK = DEFAULT_TOP_K,
  threshold = DEFAULT_THRESHOLD,
}) {
  if (!query || query.trim().length === 0) {
    throw new Error("Missing query");
  }

  const queryEmbedding = await embedQuery(query);
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc("match_documents", {
    query_embedding: queryEmbedding,
    match_count: normalizeTopK(topK),
    match_threshold: normalizeThreshold(threshold),
  });

  if (error) {
    throw new Error(`Vector search failed: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    file_path: row.file_path,
    content: row.content,
    similarity: row.similarity,
  }));
}

export async function getDocumentByPath(filePath) {
  if (!filePath) {
    throw new Error("Missing path");
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("documents")
    .select("id, file_path, chunk_index, content")
    .eq("file_path", filePath)
    .order("chunk_index");

  if (error) {
    throw new Error(`Document lookup failed: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return null;
  }

  return {
    id: data[0].id,
    file_path: data[0].file_path,
    content: data.map((row) => row.content).join("\n\n"),
  };
}

export async function listFilePaths() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("documents")
    .select("file_path")
    .order("file_path");

  if (error) {
    throw new Error(`Failed to fetch file list: ${error.message}`);
  }

  return [...new Set((data ?? []).map((row) => row.file_path))];
}
