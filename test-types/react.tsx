import type {} from "@diplez/ai-web-primitives/react";

export const ok = (
  <>
    <dz-thinking-orb phase="generating" show-label class="orb" />
    <dz-thinking-orb phase="done" showLabel />
    <dz-markdown content="# Hola" streaming />
    <dz-reasoning steps={["Leer", { title: "Buscar", status: "running" }]} open />
    <dz-approval heading="Borrar" timeout={10} timeout-action="approve" tone="danger" />
    <dz-citation index="1" href="https://example.com" confidence={0.9} />
  </>
);

// @ts-expect-error fase inválida
export const badPhase = <dz-thinking-orb phase="dreaming" />;

// @ts-expect-error tono inválido
export const badTone = <dz-approval tone="loud" />;
