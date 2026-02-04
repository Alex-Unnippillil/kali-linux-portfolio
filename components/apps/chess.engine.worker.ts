import { suggestMoves } from "../../games/chess/engine/wasmEngine";

type SuggestRequest = {
  type: "suggest";
  channel: "ai" | "analysis";
  fen: string;
  depth: number;
  maxSuggestions: number;
  requestId: number;
};

type SuggestResponse = {
  type: "result" | "error";
  channel: "ai" | "analysis";
  requestId: number;
  suggestions?: ReturnType<typeof suggestMoves>;
  message?: string;
};

const ctx: DedicatedWorkerGlobalScope = self as DedicatedWorkerGlobalScope;

ctx.addEventListener("message", (event: MessageEvent<SuggestRequest>) => {
  const payload = event.data;
  if (!payload || payload.type !== "suggest") return;
  const { fen, depth, maxSuggestions, requestId, channel } = payload;
  try {
    const suggestions = suggestMoves(fen, depth, maxSuggestions);
    const response: SuggestResponse = {
      type: "result",
      channel,
      requestId,
      suggestions,
    };
    ctx.postMessage(response);
  } catch (error) {
    const response: SuggestResponse = {
      type: "error",
      channel,
      requestId,
      message: error instanceof Error ? error.message : "Engine error",
    };
    ctx.postMessage(response);
  }
});
