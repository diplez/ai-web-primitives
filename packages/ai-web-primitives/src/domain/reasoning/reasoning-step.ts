export const REASONING_STATUSES = ["pending", "running", "done", "error"] as const;

export type ReasoningStatus = (typeof REASONING_STATUSES)[number];

export interface ReasoningStep {
  readonly id: string;
  readonly title: string;
  readonly status: ReasoningStatus;
  /** Texto libre con el detalle del paso (puede ir llegando en streaming). */
  readonly detail: string;
}

/** Forma flexible que acepta el componente: objetos parciales o simples strings. */
export type ReasoningStepInput =
  | string
  | {
      readonly id?: string | undefined;
      readonly title?: string | undefined;
      readonly status?: string | undefined;
      readonly detail?: string | undefined;
    };

export type ReasoningState = "idle" | "running" | "done" | "error";

export interface ReasoningProgress {
  readonly state: ReasoningState;
  readonly completed: number;
  readonly total: number;
  /** Paso en curso (o el próximo pendiente), si lo hay. */
  readonly current: ReasoningStep | null;
}

const isStatus = (value: unknown): value is ReasoningStatus =>
  typeof value === "string" && (REASONING_STATUSES as readonly string[]).includes(value);

/** Normaliza la entrada del consumidor: ids estables, estado válido y textos definidos. */
export function normalizeReasoningSteps(input: unknown): ReasoningStep[] {
  if (!Array.isArray(input)) return [];
  return input.map((raw: unknown, index): ReasoningStep => {
    if (typeof raw === "string") {
      return { id: `step-${index}`, title: raw, status: "done", detail: "" };
    }
    const step = (typeof raw === "object" && raw !== null ? raw : {}) as Exclude<
      ReasoningStepInput,
      string
    >;
    return {
      id: step.id ?? `step-${index}`,
      title: step.title ?? "",
      status: isStatus(step.status) ? step.status : "pending",
      detail: step.detail ?? "",
    };
  });
}

/** Estado global del razonamiento a partir de sus pasos. */
export function reasoningProgress(steps: readonly ReasoningStep[]): ReasoningProgress {
  const total = steps.length;
  const completed = steps.filter((step) => step.status === "done").length;
  const current =
    steps.find((step) => step.status === "running") ??
    steps.find((step) => step.status === "pending") ??
    null;

  let state: ReasoningState;
  if (total === 0) state = "idle";
  else if (steps.some((step) => step.status === "error")) state = "error";
  else if (completed === total) state = "done";
  else state = "running";

  return { state, completed, total, current };
}

/** Segundos transcurridos, redondeados, a partir de instantes en milisegundos. */
export function elapsedSeconds(
  startedAt: number | null,
  endedAt: number | null,
  now: number,
): number {
  if (startedAt === null) return 0;
  return Math.max(0, Math.round(((endedAt ?? now) - startedAt) / 1000));
}
