type LogLevel = "info" | "warn" | "error";

type LogPayload = {
  operation: string;
  message: string;
  requestId?: string;
  durationMs?: number;
  details?: Record<string, unknown>;
};

function writeLog(level: LogLevel, payload: LogPayload): void {
  const event = {
    level,
    timestamp: new Date().toISOString(),
    ...payload,
  };

  const output = JSON.stringify(event);

  if (level === "error") {
    console.error(output);
    return;
  }

  if (level === "warn") {
    console.warn(output);
    return;
  }

  console.info(output);
}

export const logger = {
  info(payload: LogPayload): void {
    writeLog("info", payload);
  },
  warn(payload: LogPayload): void {
    writeLog("warn", payload);
  },
  error(payload: LogPayload): void {
    writeLog("error", payload);
  },
};