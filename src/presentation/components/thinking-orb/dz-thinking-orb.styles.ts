import { css } from "lit";

export const thinkingOrbStyles = css`
  :host {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5em;
    vertical-align: middle;
  }

  :host([hidden]) {
    display: none;
  }

  .orb {
    width: var(--dz-orb-size, 96px);
    height: var(--dz-orb-size, 96px);
  }

  canvas {
    display: block;
    width: 100%;
    height: 100%;
  }

  .label {
    color: var(--dz-orb-label-color, currentColor);
  }

  .color-probe {
    display: none;
  }

  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    margin: -1px;
    padding: 0;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
    border: 0;
  }
`;
