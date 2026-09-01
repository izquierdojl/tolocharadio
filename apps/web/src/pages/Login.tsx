import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { fetchPublicConfig } from "../lib/api.js";
import { useAuthStore } from "../stores/auth.js";

async function handleAuth(
  e: FormEvent<HTMLFormElement>,
  fn: (email: string, password: string, name?: string) => Promise<void>,
  navigate: (path: string) => void,
  invalidate: () => void,
): Promise<void> {
  e.preventDefault();
  const form = e.currentTarget;
  const data = new FormData(form);
  const email = String(data.get("email") ?? "").trim();
  const password = String(data.get("password") ?? "");
  const name = String(data.get("name") ?? "").trim() || undefined;
  try {
    await fn(email, password, name);
    toast.success(userGreeting(name ?? email));
    invalidate();
    navigate("/");
  } catch (err) {
    toast.error(err instanceof Error ? err.message : "No se pudo completar la operación");
  }
}

function userGreeting(nameOrEmail: string): string {
  return `Bienvenido, ${nameOrEmail.split("@")[0]}`;
}

function useRegistrationEnabled(): boolean {
  const { data } = useQuery({
    queryKey: ["config"],
    queryFn: fetchPublicConfig,
    staleTime: Infinity,
  });
  return data?.registrationEnabled ?? true;
}

const inputClass =
  "w-full rounded-lg border border-line-strong bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-faint focus:border-pine-500 focus:outline-none";

export function Login() {
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setLoading(true);
    try {
      await handleAuth(
        e,
        async (email, password) => {
          await login(email, password);
        },
        navigate,
        () => void queryClient.invalidateQueries(),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md py-10">
      <div className="rounded-2xl border border-line bg-surface-raised p-6">
        <h1 className="text-xl font-bold text-foreground">Iniciar sesión</h1>
        <p className="mt-1 text-sm text-muted">
          Accede a tus favoritos e historial mientras exploras.
        </p>
        <form onSubmit={(e) => void onSubmit(e)} className="mt-5 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm text-foreground">
            Correo electrónico
            <input name="email" type="email" required autoComplete="email" className={inputClass} placeholder="tuyo@correo.com" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm text-foreground">
            Contraseña
            <input name="password" type="password" required autoComplete="current-password" className={inputClass} placeholder="••••••••" />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-lg bg-ochre-500 px-4 py-2.5 text-sm font-semibold text-pine-950 transition hover:bg-ochre-400 disabled:opacity-60"
          >
            {loading && <Loader2 className="size-4 animate-spin" />}
            Entrar
          </button>
        </form>
        <RegisterHint />
      </div>
    </div>
  );
}

function RegisterHint() {
  const registrationEnabled = useRegistrationEnabled();
  return (
    <p className="mt-4 text-center text-sm text-muted">
      {registrationEnabled ? (
        <>
          ¿No tienes cuenta?{" "}
          <Link to="/registro" className="font-medium text-ochre-300 hover:underline">
            Regístrate
          </Link>
        </>
      ) : (
        <>El registro está deshabilitado actualmente.</>
      )}
    </p>
  );
}

export default Login;