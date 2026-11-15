import type {} from "@diplez/ai-agent-ui/react";

export const ok = (
  <>
    <dz-tool-call name="search_docs" status="running" args='{"query":"x"}' open />
    <dz-tool-call name="read_file" status="success" duration={1200} />
    <dz-agent-timeline events={[{ kind: "tool", title: "Buscar" }, "Responder"]} forkable />
    <dz-agent-timeline replay-interval={500} />
  </>
);

// @ts-expect-error estado inválido
export const badStatus = <dz-tool-call status="sleeping" />;
