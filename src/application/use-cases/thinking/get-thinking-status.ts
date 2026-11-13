import { toThinkingPhase } from "../../../domain/thinking/thinking-phase.js";
import { createThinkingStatus } from "../../../domain/thinking/thinking-status.js";
import type { ThinkingStatusDto } from "../../dtos/thinking-status-dto.js";
import type { ThinkingLabelProvider } from "../../ports/thinking-label-provider.js";

export interface GetThinkingStatusInput {
  /** Valor crudo recibido (p. ej. desde un atributo HTML). Se normaliza en el dominio. */
  readonly phase: unknown;
  /** Etiqueta personalizada; si viene vacía se usa la del proveedor de etiquetas. */
  readonly customLabel?: string | undefined;
}

/** Caso de uso: resuelve el estado visible del indicador de pensamiento. */
export class GetThinkingStatus {
  constructor(private readonly labelProvider: ThinkingLabelProvider) {}

  execute(input: GetThinkingStatusInput): ThinkingStatusDto {
    const status = createThinkingStatus(toThinkingPhase(input.phase));
    const customLabel = input.customLabel?.trim();
    return {
      phase: status.phase,
      busy: status.busy,
      label: customLabel || this.labelProvider.getLabel(status.phase),
    };
  }
}
