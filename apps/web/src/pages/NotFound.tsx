import { Mountain } from "lucide-react";
import { Link } from "react-router-dom";

export function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
      <span className="flex size-16 items-center justify-center rounded-2xl bg-pine-800 text-pine-300">
        <Mountain className="size-8" />
      </span>
      <h1 className="text-3xl font-bold text-pine-100">Página no encontrada</h1>
      <p className="max-w-sm text-sm text-pine-400">
        Esta ruta no existe o el enlace es incorrecto. Vuelve a la cima del catálogo.
      </p>
      <Link
        to="/"
        className="rounded-lg bg-ochre-500 px-4 py-2 text-sm font-medium text-pine-950 hover:bg-ochre-400"
      >
        Volver al inicio
      </Link>
    </div>
  );
}