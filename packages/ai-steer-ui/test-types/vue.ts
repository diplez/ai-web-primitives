import type {} from "@diplez/ai-steer-ui/vue";
import type { GlobalComponents } from "vue";

type AnswerDialProps = InstanceType<GlobalComponents["dz-answer-dial"]>["$props"];

export const dial: AnswerDialProps = { text: "Hello", dials: ["length"] };

// @ts-expect-error text debe ser string
export const badText: AnswerDialProps = { text: 42 };
