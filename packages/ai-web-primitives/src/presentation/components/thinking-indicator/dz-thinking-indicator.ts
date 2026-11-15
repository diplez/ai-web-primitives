import { LitElement, html } from "lit";
import { property } from "lit/decorators.js";
import type { GetThinkingStatus } from "../../../application/use-cases/thinking/get-thinking-status.js";
import type { ThinkingPhase } from "../../../domain/thinking/thinking-phase.js";
import { thinkingIndicatorStyles } from "./dz-thinking-indicator.styles.js";

/** Dependencias que la capa de composición inyecta en el componente. */
export interface ThinkingIndicatorDependencies {
  readonly getThinkingStatus: Pick<GetThinkingStatus, "execute">;
}

/**
 * Indicador accesible de la fase de pensamiento de un modelo de lenguaje.
 *
 * No se registra solo: lo registra `defineThinkingIndicator()` (capa de composición),
 * que además le inyecta sus dependencias.
 *
 * @tag dz-thinking-indicator
 * @slot - Etiqueta personalizada. Si no se usa, se muestra `label` o la etiqueta por defecto de la fase.
 * @csspart indicator - Contenedor del estado (`role="status"`). Expone `data-phase` con la fase normalizada.
 * @cssprop [--dz-thinking-color=currentColor] - Color del texto del indicador.
 */
export class DzThinkingIndicator extends LitElement {
  static dependencies?: ThinkingIndicatorDependencies;

  static override styles = thinkingIndicatorStyles;

  /** Fase actual del modelo. Se refleja como atributo para poder estilizarla con CSS. */
  @property({ reflect: true }) phase: ThinkingPhase = "idle";

  /** Etiqueta legible personalizada. Por defecto se deriva de `phase`. */
  @property() label?: string;

  protected override render() {
    const status = this.getDependencies().getThinkingStatus.execute({
      phase: this.phase,
      customLabel: this.label,
    });

    return html`<div
      part="indicator"
      role="status"
      aria-live="polite"
      aria-busy=${String(status.busy)}
      data-phase=${status.phase}
    >
      <slot>${status.label}</slot>
    </div>`;
  }

  private getDependencies(): ThinkingIndicatorDependencies {
    const { dependencies } = this.constructor as typeof DzThinkingIndicator;
    if (!dependencies) {
      throw new Error(
        `<${this.localName}> has no dependencies. Register it with defineThinkingIndicator().`,
      );
    }
    return dependencies;
  }
}
