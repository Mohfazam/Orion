import { OrionState } from "./types";

export type AgentNode = (state: OrionState) => Promise<OrionState>;

export interface PipelineResult {
  state: OrionState;
  success: boolean;
  error?: string;
}

export const runPipeline = async (
  initialState: OrionState,
  nodes: AgentNode[],
  onNodeStart?: (name: string) => void,
  onNodeComplete?: (name: string, state: OrionState) => void
): Promise<PipelineResult> => {
  let state = initialState;

  for (const node of nodes) {
    const nodeName = node.name || "unknown_node";

    try {
      onNodeStart?.(nodeName);
      state = await node(state);
      onNodeComplete?.(nodeName, state);
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      console.error(`[pipeline] node '${nodeName}' failed:`, error);
      return {
        state: { ...state, error, currentNode: nodeName },
        success: false,
        error,
      };
    }
  }

  return { state, success: true };
};