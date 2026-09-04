import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Loader2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { fetchPublicConfig } from "../lib/api.js";
import { defaultViewPath } from "../lib/defaultView.js";
import { useAuthStore } from "../stores/auth.js";

const inputClass =
  "w-full rounded-lg border border-line-strong bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-faint focus:border-pine-500 focus:outline-none";

export function Register() {
  const register = useAuthStore((s) => s.register);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  void queryClient.prefetchQuery({ queryKey: ["config"], queryFn: fetchPublicConfig, staleTime: Infinity });

  const onSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("La contraseña debe tener al menos 8 caracteres");
      return;
    }
    setLoading(true);
    try {
      await register(email, password, name || undefined);
      toast.success(`Bienvenido, ${(name || email).split("@")[0]}`);
      void queryClient.invalidateQueries();
      navigate(defaultViewPath(useAuthStore.getState().user?.defaultView));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "No se pudo completar el registro";
      toast.error(msg);
      if (err instanceof Error && err.message.includes("deshabilitado")) {
        setDisabled(true);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md py-10">
      <div className="rounded-2xl border border-line bg-surface-raised p-6">
        <h1 className="text-xl font-bold text-foreground">Crear tu cuenta</h1>
        <p className="mt-1 text-sm text-muted">
          Guárdate las emisoras que más te gusten.
        </p>

        {disabled && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-ochre-700/50 bg-ochre-900/30 p-3 text-sm text-ochre-200">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>
              El registro está deshabilitado por el administrador. Contacta con él o inicia sesión si ya tienes
              cuenta.
            </span>
          </div>
        )}

        <form onSubmit={(e) => void onSubmit(e)} className="mt-5 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm text-foreground">
            Nombre (opcional)
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
              placeholder="Tu nombre o apodo"
              autoComplete="name"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm text-foreground">
            Correo electrónico
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              type="email"
              required
              autoComplete="email"
              placeholder="tuyo@correo.com"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm text-foreground">
            Contraseña
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="Mínimo 8 caracteres"
            />
          </label>
          <button
            type="submit"
            disabled={loading || disabled}
            className="flex items-center justify-center gap-2 rounded-lg bg-ochre-500 px-4 py-2.5 text-sm font-semibold text-pine-950 transition hover:bg-ochre-400 disabled:opacity-60"
          >
            {loading && <Loader2 className="size-4 animate-spin" />}
            Crear cuenta
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-muted">
          ¿Ya tienes cuenta?{" "}
          <Link to="/login" className="font-medium text-ochre-300 hover:underline">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  );
}