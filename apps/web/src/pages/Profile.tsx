import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { type FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { api, fetchPublicConfig } from "../lib/api.js";
import { ConfirmDialog } from "../components/ConfirmDialog.js";
import { StatsResetSection, type StatsResetTarget } from "../components/StatsResetSection.js";
import { DEFAULT_VIEW_OPTIONS } from "../lib/defaultView.js";
import type { User, UserDefaultSection, UserDefaultView } from "../lib/types.js";
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

const RESET_COPY: Record<StatsResetTarget, { title: string; description: string }> = {
  radio: {
    title: "Reiniciar estadísticas de radio",
    description:
      "Se borrarán tus estadísticas y gráficas de radio de forma permanente. Tu historial, favoritos y emisoras personalizadas no se verán afectados.",
  },
  podcast: {
    title: "Reiniciar estadísticas de podcasts",
    description:
      "Se borrarán tus estadísticas y gráficas de podcasts de forma permanente. Tus suscripciones, favoritos, cola, descargas y progreso de episodios no se verán afectados.",
  },
};

export function Profile() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const queryClient = useQueryClient();
  const [name, setName] = useState(user?.name ?? "");
  const [defaultView, setDefaultView] = useState<UserDefaultView>(user?.defaultView ?? "explorar");
  const [defaultSection, setDefaultSection] = useState<UserDefaultSection>(
    user?.defaultSection ?? "radio",
  );
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [passwordStep, setPasswordStep] = useState(false);
  const [resetTarget, setResetTarget] = useState<StatsResetTarget | null>(null);
  const { data: config } = useQuery({
    queryKey: ["config"],
    queryFn: fetchPublicConfig,
    staleTime: Infinity,
  });
  const podcastsEnabled = Boolean(config?.features?.podcasts);

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

  const updateDefaultView = useMutation({
    mutationFn: () => api.patch<{ user: User }>("/users/me", { defaultView }),
    onSuccess: (data) => {
      setUser(data.user);
      toast.success("Vista por defecto actualizada");
      void queryClient.invalidateQueries();
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "No se pudo guardar la vista por defecto");
    },
  });

  const updateDefaultSection = useMutation({
    mutationFn: () => api.patch<{ user: User }>("/users/me", { defaultSection }),
    onSuccess: (data) => {
      setUser(data.user);
      toast.success("Sección inicial actualizada");
      void queryClient.invalidateQueries();
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "No se pudo guardar la sección inicial");
    },
  });

  const changePassword = useMutation({    mutationFn: () =>
      api.patch<{ ok: true }>("/users/me/password", { currentPassword: current, newPassword: next }),    onSuccess: () => {
      toast.success("Contraseña actualizada");
      setCurrent("");
      setNext("");
      setPasswordStep(false);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "No se pudo cambiar la contraseña");
    },
  });

  const resetRadio = useMutation({
    mutationFn: () => api.delete<{ ok: true }>("/stats/me"),
    onSuccess: () => {
      toast.success("Estadísticas de radio reiniciadas");
      setResetTarget(null);
      void queryClient.invalidateQueries({ queryKey: ["stats"] });
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "No se pudieron reiniciar las estadísticas de radio",
      );
      setResetTarget(null);
    },
  });

  const resetPodcasts = useMutation({
    mutationFn: () => api.delete<{ ok: true }>("/podcasts/stats"),
    onSuccess: () => {
      toast.success("Estadísticas de podcasts reiniciadas");
      setResetTarget(null);
      void queryClient.invalidateQueries({ queryKey: ["podcast-stats"] });
    },
    onError: (err) => {
      toast.error(
        err instanceof Error
          ? err.message
          : "No se pudieron reiniciar las estadísticas de podcasts",
      );
      setResetTarget(null);
    },
  });

  const resetPending = resetRadio.isPending || resetPodcasts.isPending;
  const activeReset = resetTarget ? RESET_COPY[resetTarget] : null;

  const onSubmitName = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    updateName.mutate();
  };

  const onSubmitDefaultView = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    updateDefaultView.mutate();
  };

  const onSubmitDefaultSection = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    updateDefaultSection.mutate();
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
        onSubmit={onSubmitDefaultView}
        className="flex flex-col gap-4 rounded-2xl border border-line bg-surface-raised p-5"
      >
        <div className="flex flex-col gap-1">
          <h2 className="font-semibold text-foreground">Vista inicial por defecto</h2>
          <p className="text-sm text-muted">
            Elige qué vista verás al acceder o abrir la aplicación.
          </p>
        </div>
        <div className="flex flex-col gap-2" role="radiogroup" aria-label="Vista inicial por defecto">
          {DEFAULT_VIEW_OPTIONS.map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer items-center gap-3 rounded-lg border border-line px-3 py-2.5 text-sm text-foreground transition hover:border-pine-500"
            >
              <input
                type="radio"
                name="defaultView"
                value={option.value}
                checked={defaultView === option.value}
                onChange={() => setDefaultView(option.value)}
                className="size-4 accent-pine-600"
              />
              {option.label}
            </label>
          ))}
        </div>
        <button
          type="submit"
          disabled={updateDefaultView.isPending || defaultView === (user.defaultView ?? "explorar")}
          className="self-start rounded-lg bg-pine-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-pine-500 disabled:opacity-50"
        >
          Guardar vista por defecto
        </button>
      </form>

      <form
        onSubmit={onSubmitDefaultSection}
        className="flex flex-col gap-4 rounded-2xl border border-line bg-surface-raised p-5"
      >
        <div className="flex flex-col gap-1">
          <h2 className="font-semibold text-foreground">Sección inicial</h2>
          <p className="text-sm text-muted">
            Elige si al entrar quieres ver la radio o tus podcasts.
          </p>
        </div>
        <div className="flex flex-col gap-2" role="radiogroup" aria-label="Sección inicial">
          {[
            { value: "radio" as const, label: "Radio" },
            { value: "podcasts" as const, label: "Podcasts" },
          ].map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer items-center gap-3 rounded-lg border border-line px-3 py-2.5 text-sm text-foreground transition hover:border-pine-500"
            >
              <input
                type="radio"
                name="defaultSection"
                value={option.value}
                checked={defaultSection === option.value}
                onChange={() => setDefaultSection(option.value)}
                className="size-4 accent-pine-600"
              />
              {option.label}
            </label>
          ))}
        </div>
        <button
          type="submit"
          disabled={
            updateDefaultSection.isPending ||
            defaultSection === (user.defaultSection ?? "radio")
          }
          className="self-start rounded-lg bg-pine-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-pine-500 disabled:opacity-50"
        >
          Guardar sección inicial
        </button>
      </form>

      <StatsResetSection
        podcastsEnabled={podcastsEnabled}
        pending={resetTarget}
        onRequestReset={setResetTarget}
      />

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

      <ConfirmDialog
        open={resetTarget !== null}
        title={activeReset?.title ?? ""}
        description={activeReset?.description ?? ""}
        confirmLabel="Sí, reiniciar"
        destructive
        pending={resetPending}
        onCancel={() => {
          if (!resetPending) setResetTarget(null);
        }}
        onConfirm={() => {
          if (resetTarget === "radio") {
            resetRadio.mutate();
          } else if (resetTarget === "podcast") {
            resetPodcasts.mutate();
          }
        }}
      />
    </section>
  );
}
