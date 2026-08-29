"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  cambiarPlanUsuarioAction,
  cambiarRolUsuarioAction,
  reactivarUsuarioAction,
  suspenderUsuarioAction,
} from "@/app/(dashboard)/administracion/actions";
import type { AdminUsuarioDetalle, PlanCatalogoItem } from "@/types/admin";
import { USER_ROLE_LABELS, USER_ROLES, type UserRole } from "@/types/roles";

type AdminUsuarioDetalleProps = {
  usuario: AdminUsuarioDetalle;
  planes: PlanCatalogoItem[];
  callerEsAdmin: boolean;
};

function formatearFecha(iso: string | null): string {
  if (!iso) {
    return "—";
  }

  const fecha = new Date(iso);

  if (Number.isNaN(fecha.getTime())) {
    return "—";
  }

  return fecha.toLocaleString("es-CO", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function rolesDisponibles(
  usuario: AdminUsuarioDetalle,
  callerEsAdmin: boolean
): UserRole[] {
  if (callerEsAdmin) {
    return [...USER_ROLES];
  }

  if (usuario.rol === "admin") {
    return [];
  }

  return ["user", "coadmin"];
}

export default function AdminUsuarioDetalle({
  usuario,
  planes,
  callerEsAdmin,
}: AdminUsuarioDetalleProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [planId, setPlanId] = useState(usuario.plan_id);
  const [rol, setRol] = useState<UserRole>(usuario.rol);
  const [mensaje, setMensaje] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  const puedeModificarAdmin = callerEsAdmin || usuario.rol !== "admin";
  const opcionesRol = rolesDisponibles(usuario, callerEsAdmin);

  function refrescar() {
    router.refresh();
  }

  function guardarPlan() {
    startTransition(async () => {
      setMensaje(null);
      const resultado = await cambiarPlanUsuarioAction(usuario.user_id, planId);

      if (!resultado.success) {
        setMensaje({ type: "error", text: resultado.error });
        return;
      }

      setMensaje({ type: "success", text: "Plan actualizado correctamente." });
      refrescar();
    });
  }

  function guardarRol() {
    startTransition(async () => {
      setMensaje(null);
      const resultado = await cambiarRolUsuarioAction(usuario.user_id, rol);

      if (!resultado.success) {
        setMensaje({ type: "error", text: resultado.error });
        return;
      }

      setMensaje({ type: "success", text: "Rol actualizado correctamente." });
      refrescar();
    });
  }

  function suspender() {
    if (!window.confirm(`¿Suspender la cuenta de ${usuario.email}?`)) {
      return;
    }

    startTransition(async () => {
      setMensaje(null);
      const resultado = await suspenderUsuarioAction(usuario.user_id);

      if (!resultado.success) {
        setMensaje({ type: "error", text: resultado.error });
        return;
      }

      setMensaje({ type: "success", text: "Usuario suspendido." });
      refrescar();
    });
  }

  function reactivar() {
    startTransition(async () => {
      setMensaje(null);
      const resultado = await reactivarUsuarioAction(usuario.user_id);

      if (!resultado.success) {
        setMensaje({ type: "error", text: resultado.error });
        return;
      }

      setMensaje({ type: "success", text: "Usuario reactivado." });
      refrescar();
    });
  }

  return (
    <div className="space-y-6">
      {mensaje ? (
        <p
          className={`text-sm ${mensaje.type === "success" ? "text-emerald-700" : "text-red-600"}`}
        >
          {mensaje.text}
        </p>
      ) : null}

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-900">Resumen</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">Plan</dt>
            <dd className="mt-1 text-sm font-medium text-zinc-900">
              {usuario.plan_efectivo_nombre}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">Rol</dt>
            <dd className="mt-1 text-sm font-medium text-zinc-900">
              {USER_ROLE_LABELS[usuario.rol]}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Suscripción
            </dt>
            <dd className="mt-1 text-sm font-medium capitalize text-zinc-900">
              {usuario.estado_suscripcion}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Registrado
            </dt>
            <dd className="mt-1 text-sm text-zinc-900">{formatearFecha(usuario.registrado_en)}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-900">Features efectivas</h2>
        {usuario.features_efectivas.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-600">
            Sin features activas (suscripción suspendida o cancelada).
          </p>
        ) : (
          <ul className="mt-3 flex flex-wrap gap-2">
            {usuario.features_efectivas.map((feature) => (
              <li
                key={feature}
                className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-800"
              >
                {feature}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-900">Contratos ({usuario.total_contratos})</h2>
        {usuario.contratos.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-600">Sin contratos registrados.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {usuario.contratos.map((contrato) => (
              <li
                key={contrato.id}
                className="rounded-lg border border-zinc-200 px-4 py-3 text-sm text-zinc-800"
              >
                <p className="font-medium text-zinc-900">{contrato.nombre}</p>
                <p className="text-xs text-zinc-600">
                  {contrato.entidad}
                  {contrato.alias ? ` · ${contrato.alias}` : ""} · {contrato.estado}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm space-y-6">
        <h2 className="text-lg font-semibold text-zinc-900">Acciones</h2>

        <div className="space-y-2">
          <label htmlFor="plan-usuario" className="block text-sm font-medium text-zinc-700">
            Cambiar plan
          </label>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <select
              id="plan-usuario"
              value={planId}
              onChange={(event) => setPlanId(event.target.value)}
              disabled={isPending || !puedeModificarAdmin}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 sm:max-w-xs"
            >
              {planes.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.nombre}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={guardarPlan}
              disabled={isPending || !puedeModificarAdmin || planId === usuario.plan_id}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              Guardar plan
            </button>
          </div>
          {!puedeModificarAdmin ? (
            <p className="text-xs text-zinc-500">
              Solo un administrador puede modificar cuentas con rol admin.
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label htmlFor="rol-usuario" className="block text-sm font-medium text-zinc-700">
            Cambiar rol
          </label>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <select
              id="rol-usuario"
              value={rol}
              onChange={(event) => setRol(event.target.value as UserRole)}
              disabled={isPending || opcionesRol.length === 0}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 sm:max-w-xs"
            >
              {opcionesRol.map((opcion) => (
                <option key={opcion} value={opcion}>
                  {USER_ROLE_LABELS[opcion]}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={guardarRol}
              disabled={isPending || opcionesRol.length === 0 || rol === usuario.rol}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              Guardar rol
            </button>
          </div>
          {!callerEsAdmin && usuario.rol !== "admin" ? (
            <p className="text-xs text-zinc-500">
              Como co-administrador no puedes asignar el rol admin.
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-3 border-t border-zinc-200 pt-4">
          {usuario.estado_suscripcion === "activa" ? (
            <button
              type="button"
              onClick={suspender}
              disabled={isPending || !puedeModificarAdmin}
              className="rounded-lg border border-amber-300 px-4 py-2 text-sm font-medium text-amber-900 hover:bg-amber-50 disabled:opacity-60"
            >
              Suspender usuario
            </button>
          ) : (
            <button
              type="button"
              onClick={reactivar}
              disabled={isPending || !puedeModificarAdmin}
              className="rounded-lg border border-emerald-300 px-4 py-2 text-sm font-medium text-emerald-900 hover:bg-emerald-50 disabled:opacity-60"
            >
              Reactivar usuario
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
