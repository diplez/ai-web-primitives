import type {} from "@diplez/ai-web-primitives/vue";
import type { GlobalComponents } from "vue";

type OrbProps = InstanceType<GlobalComponents["dz-thinking-orb"]>["$props"];
export const orb: OrbProps = { phase: "searching", showLabel: true };

// @ts-expect-error fase inválida
export const badOrb: OrbProps = { phase: "dreaming" };
