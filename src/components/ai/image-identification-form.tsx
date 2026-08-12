"use client";

import Image from "next/image";
import {
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { addCollectionItemAction } from "@/app/(dashboard)/collection/actions";
import { imageUploadConstraints } from "@/schemas/ai-schemas";

type IdentificationResponse = {
  pokemon: {
    id: number;
    name: string;
    types: string[];
    spriteUrl: string | null;
  };
  confidence: number;
  reasoning: string;
};

type ConfidenceStyle = {
  label: string;
  accentClass: string;
  trackClass: string;
};

function getErrorMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  if ("message" in payload && typeof payload.message === "string") {
    return payload.message;
  }

  return null;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function validateClientFile(file: File): string | null {
  if (!imageUploadConstraints.allowedMimeTypes.includes(file.type as (typeof imageUploadConstraints.allowedMimeTypes)[number])) {
    return "Formato no permitido. Usa JPG, PNG o WEBP.";
  }

  if (file.size <= 0) {
    return "No se recibio una imagen valida.";
  }

  if (file.size > imageUploadConstraints.maxSizeBytes) {
    return "La imagen excede el tamano maximo permitido de 5MB.";
  }

  return null;
}

function getConfidenceStyle(confidence: number): ConfidenceStyle {
  if (confidence >= 0.85) {
    return {
      label: "Alta",
      accentClass: "text-emerald-800 bg-emerald-100 border-emerald-200",
      trackClass: "bg-emerald-500",
    };
  }

  if (confidence >= 0.6) {
    return {
      label: "Media",
      accentClass: "text-amber-800 bg-amber-100 border-amber-200",
      trackClass: "bg-amber-500",
    };
  }

  return {
    label: "Baja",
    accentClass: "text-rose-800 bg-rose-100 border-rose-200",
    trackClass: "bg-rose-500",
  };
}

export function ImageIdentificationForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<IdentificationResponse | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const confidenceLabel = useMemo(() => {
    if (!result) return null;
    return `${Math.round(result.confidence * 100)}%`;
  }, [result]);

  const confidencePercent = result ? Math.max(0, Math.min(100, Math.round(result.confidence * 100))) : 0;
  const confidenceStyle = result ? getConfidenceStyle(result.confidence) : null;

  const previewUrl = useMemo(
    () => (selectedFile ? URL.createObjectURL(selectedFile) : null),
    [selectedFile],
  );

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  useEffect(() => {
    if (!selectedFile && fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [selectedFile]);

  function updateSelectedFile(file: File | null) {
    if (!file) {
      setSelectedFile(null);
      return;
    }

    const validationError = validateClientFile(file);
    if (validationError) {
      setError(validationError);
      setSelectedFile(null);
      return;
    }

    setError(null);
    setResult(null);
    setSelectedFile(file);
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] ?? null;
    updateSelectedFile(nextFile);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);

    const nextFile = event.dataTransfer.files?.[0] ?? null;
    updateSelectedFile(nextFile);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedFile) {
      setError("Debes adjuntar una imagen.");
      return;
    }

    setIsLoading(true);
    setError(null);
    const formData = new FormData();
    formData.set("image", selectedFile);

    try {
      const response = await fetch("/api/ai/identify-pokemon", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as unknown;

      if (!response.ok) {
        setResult(null);
        setError(getErrorMessage(payload) ?? "No fue posible identificar la imagen.");
        return;
      }

      setResult(payload as IdentificationResponse);
    } catch {
      setResult(null);
      setError("Ocurrio un error de red al procesar la imagen.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="space-y-5">
      <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Identificar desde imagen</h2>
            <p className="mt-2 text-sm text-slate-600">
              Arrastra una imagen o selecciona archivo. El analisis usa Gemini Vision y la imagen no se almacena.
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
            Limite: 5MB · Formatos: JPG, PNG, WEBP
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          name="image"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleInputChange}
        />

        <div
          onDragEnter={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            setIsDragging(false);
          }}
          onDrop={handleDrop}
          className={`mt-4 rounded-2xl border-2 border-dashed p-4 transition-colors ${
            isDragging
              ? "border-indigo-400 bg-indigo-50"
              : "border-slate-300 bg-slate-50/60"
          }`}
        >
          {previewUrl ? (
            <div className="flex flex-wrap items-start gap-4">
              <Image
                src={previewUrl}
                alt="Preview de imagen seleccionada"
                width={160}
                height={160}
                unoptimized
                className="h-32 w-32 rounded-xl border border-slate-200 bg-white object-cover"
              />
              <div className="min-w-0 flex-1 space-y-2">
                <p className="text-sm font-medium text-slate-900">Imagen lista para analizar</p>
                <p className="text-xs text-slate-600 break-all">{selectedFile?.name}</p>
                <p className="text-xs text-slate-500">{selectedFile ? formatBytes(selectedFile.size) : ""}</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                  >
                    Cambiar imagen
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null);
                      setResult(null);
                      setError(null);
                    }}
                    className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50"
                  >
                    Limpiar
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-6 text-center">
              <p className="text-sm font-medium text-slate-800">Arrastra y suelta tu imagen aqui</p>
              <p className="mt-1 text-xs text-slate-600">o selecciona un archivo manualmente</p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-3 rounded-xl bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-700"
              >
                Seleccionar imagen
              </button>
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="submit"
            disabled={isLoading || !selectedFile}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? "Analizando con Gemini Vision..." : "Analizar imagen"}
          </button>
          <p className="text-xs text-slate-600">
            Paso 1: carga imagen · Paso 2: revisa resultado · Paso 3: confirma en coleccion
          </p>
        </div>

        {isLoading ? (
          <div className="mt-3 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm text-indigo-900">
            Gemini Vision esta evaluando rasgos visuales del Pokemon.
          </div>
        ) : null}

        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      </form>

      {result ? (
        <article className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-base font-semibold text-emerald-900">Resultado sugerido</h3>
            {confidenceStyle ? (
              <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${confidenceStyle.accentClass}`}>
                Confianza {confidenceStyle.label}
              </span>
            ) : null}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-4">
            {result.pokemon.spriteUrl ? (
              <Image
                src={result.pokemon.spriteUrl}
                alt={`Sprite de ${result.pokemon.name}`}
                className="h-20 w-20 rounded-lg border border-emerald-200 bg-white object-contain"
                width={80}
                height={80}
                unoptimized
              />
            ) : null}

            <div>
              <p className="text-lg font-semibold text-emerald-950 capitalize">
                #{result.pokemon.id} {result.pokemon.name}
              </p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {result.pokemon.types.map((type) => (
                  <span
                    key={type}
                    className="rounded-full border border-emerald-200 bg-white px-2 py-0.5 text-xs font-medium text-emerald-900"
                  >
                    {type}
                  </span>
                ))}
              </div>
              <p className="mt-2 text-sm text-emerald-900">Confianza estimada: {confidenceLabel}</p>
              <div className="mt-1 h-2 w-full max-w-56 overflow-hidden rounded-full bg-emerald-100">
                <div
                  className={`h-full ${confidenceStyle?.trackClass ?? "bg-emerald-500"}`}
                  style={{ width: `${confidencePercent}%` }}
                />
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-emerald-200 bg-white/75 p-3">
            <p className="text-xs font-semibold tracking-wide text-emerald-900 uppercase">Razonamiento del modelo</p>
            <p className="mt-1 text-sm text-emerald-900">{result.reasoning}</p>
          </div>

          <form action={addCollectionItemAction} className="mt-4 flex flex-wrap items-end gap-3">
            <input type="hidden" name="pokemonId" value={result.pokemon.id} />
            <input type="hidden" name="source" value="IMAGE" />

            <label className="block text-sm">
              <span className="mb-1 block text-emerald-900">Cantidad</span>
              <input
                type="number"
                name="quantity"
                min={1}
                defaultValue={1}
                required
                className="w-full rounded-xl border border-emerald-300 px-3 py-2"
              />
            </label>

            <button
              type="submit"
              className="w-full rounded-xl bg-emerald-700 px-4 py-2 text-sm font-medium text-white sm:w-auto"
            >
              Confirmar y agregar
            </button>

            <button
              type="button"
              onClick={() => setResult(null)}
              className="w-full rounded-xl border border-emerald-300 px-4 py-2 text-sm font-medium text-emerald-900 hover:bg-emerald-100 sm:w-auto"
            >
              Analizar otra imagen
            </button>
          </form>
        </article>
      ) : null}
    </section>
  );
}
