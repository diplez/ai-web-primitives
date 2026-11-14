// Punto de entrada con efecto secundario: registra TODOS los componentes con su configuración por defecto.
// Los registros se llaman explícitamente (no con `import "./composition/x/define.js"`): con code
// splitting, un import "vacío" termina apuntando a un chunk compartido que los bundlers descartan por
// `sideEffects`, y el componente no se registraría. Lo verifica `npm run check:side-effects`.
import { defineAll } from "./composition/define-all.js";

defineAll();
