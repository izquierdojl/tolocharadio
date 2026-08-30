import { CheckCircle2, Radio } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuthStore } from "../stores/auth.js";

function SierraIllustration() {
  return (
    <svg
      viewBox="0 0 640 360"
      className="w-full max-w-2xl"
      role="img"
      aria-label="Sierra de Tolocha con ondas de radio"
    >
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--art-sky-a)" />
          <stop offset="100%" stopColor="var(--art-sky-b)" />
        </linearGradient>
        <linearGradient id="ridge" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--art-ridge-a)" />
          <stop offset="100%" stopColor="var(--art-ridge-b)" />
        </linearGradient>
        <linearGradient id="mine" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--art-mine-a)" />
          <stop offset="100%" stopColor="var(--art-mine-b)" />
        </linearGradient>
        <path id="pine" d="M12 2 L22 22 L15 22 L15 34 L9 34 L9 22 L2 22 Z" />
      </defs>

      <rect width="640" height="360" fill="url(#sky)" />
      <circle cx="520" cy="64" r="30" fill="var(--art-sun)" opacity="0.9" />

      {/* montaña trasera */}
      <path d="M0 360 L180 120 L320 260 L420 150 L640 330 L640 360 Z" fill="url(#ridge)" />
      {/* montaña principal Tolocha */}
      <path d="M0 360 L260 80 L520 360 Z" fill="url(#mine)" />
      <path d="M120 290 L260 130 L400 290 Z" fill="var(--art-mine-face)" opacity="0.6" />
      {/* nieve en la cumbre */}
      <path d="M244 112 L260 80 L276 112 L260 90 Z" fill="var(--art-snow)" opacity="0.9" />

      {/* bosque de pinos */}
      <use href="#pine" transform="translate(60, 190) scale(5)" fill="var(--art-pine-a)" />
      <use href="#pine" transform="translate(24, 258) scale(3)" fill="var(--art-pine-b)" />
      <use href="#pine" transform="translate(230, 258) scale(3)" fill="var(--art-pine-b)" />
      <use href="#pine" transform="translate(558, 222) scale(4)" fill="var(--art-pine-a)" opacity="0.85" />
      <use href="#pine" transform="translate(160, 300) scale(1.5)" fill="var(--art-pine-c)" opacity="0.6" />
      <use href="#pine" transform="translate(330, 300) scale(1.6)" fill="var(--art-pine-c)" opacity="0.6" />
      <use href="#pine" transform="translate(450, 312) scale(1.2)" fill="var(--art-pine-c)" opacity="0.5" />
    </svg>
  );
}

const FEATURE_ROWS = ["Explorar catálogo RadioBrowser", "Búsqueda por nombre, país, idioma, etiquetas", "Guardar favoritos", "Historial de reproducción", "Autoalojable", "Código abierto / libre"] as const;

const PERMITS = [
  "Explorar el catálogo de RadioBrowser mediante navegación por categorías.",
  "Buscar emisoras por nombre, país, idioma o etiquetas.",
  "Guardar emisoras favoritas en una lista personal.",
  "Gestionar el historial de reproducción para recuperar sintonías anteriores.",
];

export function Home() {
  const status = useAuthStore((s) => s.status);
  const authenticated = status === "authenticated";

  return (
    <div className="flex flex-col gap-12 pb-6 pt-4">
      <section className="flex flex-col items-center gap-10 text-center lg:flex-row lg:text-left">
        <div className="flex-1">
          <h1 className="text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl">
            Tolocha<span className="text-brand">Radio</span>
          </h1>
          <p className="mt-3 text-xl font-medium text-foreground">Exploración radiofónica libre y autoalojada.</p>
          <p className="mt-5 max-w-xl text-soft">
            TolochaRadio es un cliente web para la exploración y reproducción de emisoras de radio en
            línea. Se apoya en la base de datos pública de RadioBrowser, lo que le otorga acceso a un
            catálogo extenso y actualizado de emisoras de todo el mundo.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
            {authenticated ? (
              <Link
                to="/explorar"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-ochre-500 px-6 py-3 text-sm font-semibold text-pine-950 transition hover:bg-ochre-400"
              >
                <Radio className="size-4" />
                Explorar emisoras
              </Link>
            ) : (
              <>
                <Link
                  to="/registro"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-ochre-500 px-6 py-3 text-sm font-semibold text-pine-950 transition hover:bg-ochre-400"
                >
                  Crear cuenta
                </Link>
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-line-strong px-6 py-3 text-sm font-medium text-foreground transition hover:bg-surface-soft"
                >
                  Iniciar sesión
                </Link>
              </>
            )}
          </div>
          {authenticated ? (
            <p className="mt-3 text-sm text-faint">O entra en tu perfil para gestionar tus favoritos.</p>
          ) : (
            <p className="mt-3 text-sm text-faint">
              Regístrate gratis para guardar favoritas, repasar tu historial y disfrutar de la radio sin interrupciones.
            </p>
          )}
        </div>
        <div className="flex-1">
          <SierraIllustration />
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-surface-raised p-6">
        <h2 className="text-lg font-semibold text-foreground">La aplicación permite:</h2>
        <ul className="mt-3 flex flex-col gap-2 text-soft">
          {PERMITS.map((permit) => (
            <li key={permit} className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-ochre-400" />
              <span>{permit}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="max-w-3xl">
        <p className="text-soft">
          TolochaRadio es completamente autoalojable y de código abierto, lo que garantiza control total
          sobre los datos y la privacidad del usuario. Sin dependencias de servicios externos más allá
          de la propia base de datos pública que consume.
        </p>
        <p className="mt-5 text-lg font-medium text-ochre-300">Sin seguimiento. Sin intermediarios.</p>
        <p className="mt-5 text-sm uppercase tracking-widest text-muted">
          TolochaRadio — radio libre, datos tuyos, control total.
        </p>
      </section>

      <section className="overflow-hidden rounded-2xl border border-line">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">Resumen de funciones declaradas</caption>
          <thead>
            <tr className="bg-surface-soft text-left text-foreground">
              <th scope="col" className="px-4 py-3 font-semibold">
                Función
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                Estado
              </th>
            </tr>
          </thead>
          <tbody>
            {FEATURE_ROWS.map((feature) => (
              <tr key={feature} className="border-t border-line">
                <td className="px-4 py-2.5 text-soft">{feature}</td>
                <td className="px-4 py-2.5">
                  <CheckCircle2 className="size-4 text-moss-400" aria-label="Disponible" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}