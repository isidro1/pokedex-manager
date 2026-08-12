import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AUTH_SESSION_COOKIE_NAME } from "@/application/auth/get-current-user";
import { upsertUserByFirebaseIdentity } from "@/infrastructure/database/repositories/user-repository";
import { verifyFirebaseToken } from "@/infrastructure/firebase/firebase-server-auth";
import { AuthenticationError } from "@/lib/errors/application-errors";
import { logger } from "@/lib/logging/logger";
import { createSessionSchema } from "@/schemas/auth-schemas";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 5;

export async function POST(request: Request) {
  const startedAt = Date.now();

  try {
    const body = await request.json();
    const { idToken } = createSessionSchema.parse(body);
    const identity = await verifyFirebaseToken(idToken);

    await upsertUserByFirebaseIdentity(identity);

    const cookieStore = await cookies();
    cookieStore.set(AUTH_SESSION_COOKIE_NAME, idToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });

    logger.info({
      operation: "auth.create_session",
      message: "Sesion creada correctamente",
      durationMs: Date.now() - startedAt,
      details: {
        firebaseUid: identity.firebaseUid,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          message: "Payload invalido",
          code: "SESSION_PAYLOAD_INVALID",
          details: error.flatten(),
        },
        { status: 400 },
      );
    }

    if (error instanceof AuthenticationError) {
      logger.warn({
        operation: "auth.create_session",
        message: "Token Firebase no valido en creacion de sesion",
        durationMs: Date.now() - startedAt,
      });

      return NextResponse.json(
        { message: error.message, code: "SESSION_TOKEN_INVALID" },
        { status: 401 },
      );
    }

    logger.error({
      operation: "auth.create_session",
      message: "Fallo inesperado al crear sesion",
      durationMs: Date.now() - startedAt,
      details: {
        errorName: error instanceof Error ? error.name : "UnknownError",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      },
    });

    return NextResponse.json(
      { message: "No se pudo crear la sesion", code: "SESSION_CREATE_FAILED" },
      { status: 500 },
    );
  }
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_SESSION_COOKIE_NAME);
  return NextResponse.json({ success: true });
}