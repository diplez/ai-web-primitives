// Punto de entrada con efecto secundario: registra TODOS los componentes con su configuración por defecto.
// Cada registro se llama aquí explícitamente (no con `import "./composition/x/define.js"`): con code
// splitting, un import "vacío" termina apuntando a un chunk compartido que los bundlers descartan por
// `sideEffects`, y el componente no se registraría. Lo verifica `npm run check:side-effects`.
import { defineThinkingIndicator } from "./composition/thinking-indicator/define-thinking-indicator.js";
import { defineThinkingOrb } from "./composition/thinking-orb/define-thinking-orb.js";

defineThinkingIndicator();
defineThinkingOrb();
