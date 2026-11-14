import {
  normalizeReasoningSteps,
  reasoningProgress,
  type ReasoningState,
  type ReasoningStatus,
  type ReasoningStep,
} from "../../../domain/reasoning/reasoning-step.js";
import { formatMessage } from "../../../domain/shared/template.js";
import type { UiMessages } from "../../ports/ui-messages.js";

export interface ReasoningStepView extends ReasoningStep {
  /** Estado en palabras, para lectores de pantalla. */
  readonly statusLabel: string;
}

export interface ReasoningViewDto {
  readonly state: ReasoningState;
  readonly steps: readonly ReasoningStepView[];
  readonly completed: number;
  readonly total: number;
  readonly currentId: string | null;
  /** Titular del resumen: "Pensando…", "Pensó durante 4 s", … */
  readonly headline: string;
  /** "2 de 5 pasos" */
  readonly progressLabel: string;
}

export interface DescribeReasoningInput {
  /** Pasos tal como los entregó el consumidor (se normalizan en el dominio). */
  readonly steps: unknown;
  /** Segundos transcurridos desde que empezó a razonar. */
  readonly elapsedSeconds: number;
}

/** Caso de uso: arma la vista de un panel de razonamiento con sus textos traducidos. */
export class DescribeReasoning {
  constructor(private readonly messages: UiMessages["reasoning"]) {}

  execute(input: DescribeReasoningInput): ReasoningViewDto {
    const steps = normalizeReasoningSteps(input.steps);
    const progress = reasoningProgress(steps);
    const statusLabels: Record<ReasoningStatus, string> = {
      pending: this.messages.statusPending,
      running: this.messages.statusRunning,
      done: this.messages.statusDone,
      error: this.messages.statusError,
    };

    return {
      state: progress.state,
      steps: steps.map((step) => ({ ...step, statusLabel: statusLabels[step.status] })),
      completed: progress.completed,
      total: progress.total,
      currentId: progress.current?.id ?? null,
      headline: this.headline(progress.state, input.elapsedSeconds),
      progressLabel:
        progress.total === 0
          ? ""
          : formatMessage(this.messages.progress, {
              completed: progress.completed,
              total: progress.total,
            }),
    };
  }

  private headline(state: ReasoningState, seconds: number): string {
    switch (state) {
      case "idle":
        return this.messages.empty;
      case "running":
        return this.messages.thinking;
      case "error":
        return this.messages.failed;
      case "done":
        return seconds > 0
          ? formatMessage(this.messages.thoughtFor, { seconds })
          : this.messages.finished;
    }
  }
}
