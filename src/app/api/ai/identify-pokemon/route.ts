import { NextResponse } from "next/server";
import { getCurrentUser } from "@/application/auth/get-current-user";
import { identifyPokemonFromImage } from "@/application/image-identification/identify-pokemon-from-image";
import {
  AIProviderError,
  AuthenticationError,
  ExternalApiError,
  NotFoundError,
  ValidationError,
} from "@/lib/errors/application-errors";
import { imageUploadConstraints } from "@/schemas/ai-schemas";

function validateImageFile(file: File): void {
  if (!imageUploadConstraints.allowedMimeTypes.includes(file.type as (typeof imageUploadConstraints.allowedMimeTypes)[number])) {
    throw new ValidationError("Formato no permitido. Usa JPG, PNG o WEBP.");
  }

  if (file.size <= 0) {
    throw new ValidationError("No se recibio una imagen valida.");
  }

  if (file.size > imageUploadConstraints.maxSizeBytes) {
    throw new ValidationError("La imagen excede el tamano maximo permitido de 5MB.");
  }
}

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new AuthenticationError();
    }

    const formData = await request.formData();
    const imageFile = formData.get("image");

    if (!(imageFile instanceof File)) {
      throw new ValidationError("Debes adjuntar una imagen.");
    }

    validateImageFile(imageFile);

    const imageArrayBuffer = await imageFile.arrayBuffer();
    const imageBase64 = Buffer.from(imageArrayBuffer).toString("base64");

    const result = await identifyPokemonFromImage({
      mimeType: imageFile.type,
      base64Image: imageBase64,
    });

    return NextResponse.json({
      pokemon: result.pokemon,
      confidence: result.confidence,
      reasoning: result.reasoning,
    });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ message: error.message }, { status: 401 });
    }

    if (error instanceof ValidationError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    if (error instanceof NotFoundError) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }

    if (error instanceof AIProviderError || error instanceof ExternalApiError) {
      return NextResponse.json({ message: error.message }, { status: 502 });
    }

    return NextResponse.json(
      { message: "No se pudo procesar la imagen en este momento." },
      { status: 500 },
    );
  }
}
