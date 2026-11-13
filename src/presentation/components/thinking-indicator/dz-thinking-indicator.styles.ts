import { css } from "lit";

export const thinkingIndicatorStyles = css`
  :host {
    display: inline-block;
    color: var(--dz-thinking-color, currentColor);
  }

  :host([hidden]) {
    display: none;
  }
`;
