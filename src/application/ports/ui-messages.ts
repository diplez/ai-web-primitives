/**
 * Textos de interfaz de los componentes (i18n). Los marcadores `{nombre}` se reemplazan con
 * `formatMessage` del dominio. Las implementaciones (inglés, español, …) viven en infraestructura.
 */
export interface UiMessages {
  readonly markdown: {
    readonly copy: string;
    readonly copied: string;
  };
  readonly reasoning: {
    readonly empty: string;
    readonly thinking: string;
    /** `{seconds}` */
    readonly thoughtFor: string;
    readonly finished: string;
    readonly failed: string;
    /** `{completed}`, `{total}` */
    readonly progress: string;
    readonly statusPending: string;
    readonly statusRunning: string;
    readonly statusDone: string;
    readonly statusError: string;
  };
  readonly approval: {
    readonly approve: string;
    readonly deny: string;
    /** `{seconds}` */
    readonly autoDenyIn: string;
    /** `{seconds}` */
    readonly autoApproveIn: string;
    readonly paused: string;
    readonly approved: string;
    readonly denied: string;
    readonly approvedAutomatically: string;
    readonly deniedAutomatically: string;
  };
  readonly citation: {
    readonly source: string;
    /** `{percent}` */
    readonly confidence: string;
    readonly open: string;
  };
}
