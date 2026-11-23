import type {} from "@diplez/ai-steer-ui/react";

export const ok = (
  <>
    <dz-answer-dial text="Hello" dials={["length", "tone"]} settle-delay={200} />
    <dz-answer-dial dials={[{ id: "humor", start: "Serious", end: "Funny", steps: 3 }]} />
    <dz-intent-lens
      intent={{ goal: "Sign-up form", assumptions: [{ text: "React" }] }}
      heading="Plan"
    />
    <dz-intent-lens status="confirmed" />
  </>
);

// @ts-expect-error settle-delay debe ser número
export const badDelay = <dz-answer-dial settle-delay="fast" />;

// @ts-expect-error estado inválido
export const badStatus = <dz-intent-lens status="maybe" />;
