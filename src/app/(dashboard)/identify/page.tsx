import { ImageIdentificationForm } from "@/components/ai/image-identification-form";

export default function IdentifyPage() {
  return (
    <section className="space-y-6">
      <header className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50 via-sky-50 to-emerald-50 p-4">
        <p className="text-xs font-medium tracking-[0.18em] text-slate-600 uppercase">Gemini Vision</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">Image Identification</h1>
        <p className="mt-2 text-slate-600">
          Identifica Pokemon desde imagen, revisa nivel de confianza y confirma antes de agregar a tu coleccion.
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Flujo sugerido: cargar imagen, validar resultado y guardar solo si coincide con tu criterio.
        </p>
      </header>

      <ImageIdentificationForm />
    </section>
  );
}
