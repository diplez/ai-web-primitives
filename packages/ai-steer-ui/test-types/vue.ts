import type {} from "@diplez/ai-steer-ui/vue";
import type { GlobalComponents } from "vue";

type AnswerDialProps = InstanceType<GlobalComponents["dz-answer-dial"]>["$props"];

export const dial: AnswerDialProps = { text: "Hello", dials: ["length"] };

// @ts-expect-error text debe ser string
export const badText: AnswerDialProps = { text: 42 };

type IntentLensProps = InstanceType<GlobalComponents["dz-intent-lens"]>["$props"];
export const lens: IntentLensProps = { intent: { goal: "Sign-up form" }, status: "review" };

// @ts-expect-error estado inválido
export const badLens: IntentLensProps = { status: "maybe" };
