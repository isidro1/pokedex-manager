export interface AIInteractionOperationCount {
  operation: string;
  count: number;
}

export interface AIModelUsageCount {
  model: string;
  count: number;
}

export interface AIInteractionOverview {
  totalRuns: number;
  successRuns: number;
  failedRuns: number;
  successRate: number;
  averageLatencyMs: number | null;
  totalToolCalls: number;
  topOperations: AIInteractionOperationCount[];
  modelUsage: AIModelUsageCount[];
}
