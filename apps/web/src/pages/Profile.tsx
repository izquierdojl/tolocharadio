import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { type FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api.js";
import type { User } from "../lib/types.js";
import { useAuthStore } from "../stores/auth.js";

const inputClass =
  "w-full rounded-lg border border-line-strong bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-faint focus:border-pine-500 focus:outline-none";

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function Profile() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const queryClient = useQueryClient();
  const [name, setName] = useState(user?.name ?? "");
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [passwordStep, setPasswordStep] = useState(false);

  const updateName = useMutation({
    mutationFn: () => api.patch<{ user: User }>("/users/me", { name: name.trim() || null }),
    onSuccess: (data) => {
      setUser(data.user);
      toast.success("Perfil actualizado");
      void queryClient.invalidateQueries();
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "No se pudo actualizar el perfil");
    },
  });

  const changePassword = useMutation({
    mutationFn: () =>
      api.patch<{ ok: true }>("/users/me/password", { currentPassword: current, newPassword: next }),
    onSuccess: () => {
      toast.success("Contraseña actualizada");
      setCurrent("");
      setNext("");
      setPasswordStep(false);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "No se pudo cambiar la contraseña");
    },
  });

  const onSubmitName = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    updateName.mutate();
  };

  const onSubmitPassword = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    if (next.length < 8) {
      toast.error("La nueva contraseña debe tener al menos 8 caracteres");
      return;
    }
    changePassword.mutate();
  };

  if (!user) return null;

  return (
    <section className="mx-auto flex max-w-2xl flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Tu perfil</h1>
        <p className="text-sm text-muted">
          Miembro desde {formatDate(user.createdAt)} · <span className="text-soft">{user.email}</span>
        </p>
      </div>

      <form
        onSubmit={onSubmitName}
        className="flex flex-col gap-4 rounded-2xl border border-line bg-surface-raised p-5"
      >
        <h2 className="font-semibold text-foreground">Nombre visible</h2>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputClass}
          placeholder="Tu nombre o apodo"
        />
        <button
          type="submit"
          disabled={updateName.isPending || name === (user.name ?? "")}
          className="self-start rounded-lg bg-pine-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-pine-500 disabled:opacity-50"
        >
          Guardar cambios
        </button>
      </form>

      <form
        onSubmit={onSubmitPassword}
        className="flex flex-col gap-4 rounded-2xl border border-line bg-surface-raised p-5"
      >
        <h2 className="font-semibold text-foreground">Contraseña</h2>
        {passwordStep ? (
          <>
            <label className="flex flex-col gap-1.5 text-sm text-foreground">
              Contraseña actual
              <input
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                className={inputClass}
                type="password"
                required
                autoComplete="current-password"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm text-foreground">
              Nueva contraseña
              <input
                value={next}
                onChange={(e) => setNext(e.target.value)}
                className={inputClass}
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
              />
            </label>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={changePassword.isPending}
                className="rounded-lg bg-ochre-500 px-4 py-2 text-sm font-medium text-pine-950 hover:bg-ochre-400 disabled:opacity-50"
              >
                Actualizar contraseña
              </button>
              <button
                type="button"
                onClick={() => setPasswordStep(false)}
                className="rounded-lg border border-line-strong px-4 py-2 text-sm text-soft hover:bg-surface-soft"
              >
                Cancelar
              </button>
            </div>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setPasswordStep(true)}
            className="self-start rounded-lg border border-line-strong px-4 py-2 text-sm text-foreground hover:border-pine-500"
          >
            Cambiar contraseña
          </button>
        )}
      </form>

      <p className="text-center text-xs text-faint">
        ¿Prefieres revisar tus emisoras? Visita tus{" "}
        <Link to="/favoritos" className="text-soft hover:underline">
          favoritos
        </Link>{" "}
        o tu{" "}
        <Link to="/historial" className="text-soft hover:underline">
          historial
        </Link>
        .
      </p>
    </section>
  );
}