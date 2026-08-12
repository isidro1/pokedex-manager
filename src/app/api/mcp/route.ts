import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getCurrentUser } from "@/application/auth/get-current-user";
import { executeMcpTool, listMcpTools } from "@/infrastructure/mcp/mcp-server";
import { mcpRequestSchema } from "@/infrastructure/mcp/mcp-tool-schemas";
import {
  ApplicationError,
  AuthenticationError,
} from "@/lib/errors/application-errors";

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      throw new AuthenticationError();
    }

    const rawBody = await request.json();
    const body = mcpRequestSchema.parse(rawBody);

    if (body.action === "list_tools") {
      return NextResponse.json({ tools: listMcpTools() });
    }

    const result = await executeMcpTool({
      userId: currentUser.id,
      toolName: body.toolName,
      args: body.args,
      allowDestructive: body.allowDestructive,
    });

    return NextResponse.json({ result });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { message: "Payload MCP invalido", details: error.flatten() },
        { status: 400 },
      );
    }

    if (error instanceof ApplicationError) {
      const status = error.code === "AUTHENTICATION_ERROR" ? 401 : 400;
      return NextResponse.json({ message: error.message, code: error.code }, { status });
    }

    return NextResponse.json(
      { message: "No se pudo ejecutar la operacion MCP" },
      { status: 500 },
    );
  }
}
