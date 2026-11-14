export type ApprovalStatus = "pending" | "approved" | "denied";
export type ApprovalDecision = Exclude<ApprovalStatus, "pending">;
/** Quién tomó la decisión: la persona o el vencimiento del tiempo. */
export type ApprovalReason = "user" | "timeout";
export type TimeoutAction = "deny" | "approve";
/** Nivel de riesgo de la acción: cambia el énfasis visual de la tarjeta. */
export type ApprovalTone = "neutral" | "warning" | "danger";

/** Por seguridad, ante un valor desconocido el vencimiento deniega. */
export const toTimeoutAction = (value: unknown): TimeoutAction =>
  value === "approve" ? "approve" : "deny";

export const toApprovalTone = (value: unknown): ApprovalTone =>
  value === "warning" || value === "danger" ? value : "neutral";

export const decisionOnTimeout = (action: TimeoutAction): ApprovalDecision =>
  action === "approve" ? "approved" : "denied";

/** Segundos de espera válidos: números finitos positivos; cualquier otro valor desactiva el tiempo. */
export const toTimeoutSeconds = (value: unknown): number => {
  const seconds = typeof value === "string" ? Number.parseFloat(value) : Number(value);
  return Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
};

/** Cuenta regresiva pausable. Inmutable; los tiempos están en milisegundos. */
export interface Countdown {
  readonly durationMs: number;
  /** Tiempo restante en el último instante en que se pausó (o al crearla). */
  readonly remainingMs: number;
  /** Instante desde el que corre, o `null` si está en pausa. */
  readonly runningSince: number | null;
}

export const createCountdown = (durationMs: number): Countdown =>
  Object.freeze({ durationMs, remainingMs: durationMs, runningSince: null });

export function remainingAt(countdown: Countdown, now: number): number {
  if (countdown.runningSince === null) return countdown.remainingMs;
  return Math.max(0, countdown.remainingMs - (now - countdown.runningSince));
}

export function resumeCountdown(countdown: Countdown, now: number): Countdown {
  if (countdown.runningSince !== null) return countdown;
  return Object.freeze({ ...countdown, runningSince: now });
}

export function pauseCountdown(countdown: Countdown, now: number): Countdown {
  if (countdown.runningSince === null) return countdown;
  return Object.freeze({
    ...countdown,
    remainingMs: remainingAt(countdown, now),
    runningSince: null,
  });
}
