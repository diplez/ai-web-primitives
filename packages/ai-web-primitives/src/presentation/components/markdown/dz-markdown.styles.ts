import { css } from "lit";

export const markdownStyles = css`
  :host {
    display: block;
    color: var(--_text);
    line-height: 1.6;
    overflow-wrap: anywhere;
  }

  .document > :first-child {
    margin-top: 0;
  }
  .document > :last-child {
    margin-bottom: 0;
  }

  p,
  ul,
  ol,
  blockquote,
  .table-wrap,
  .code-block {
    margin: 0 0 0.9em;
  }

  h1,
  h2,
  h3,
  h4,
  h5,
  h6 {
    margin: 1.3em 0 0.5em;
    line-height: 1.25;
    font-weight: 650;
    text-wrap: balance;
  }
  h1 {
    font-size: 1.6em;
  }
  h2 {
    font-size: 1.35em;
  }
  h3 {
    font-size: 1.15em;
  }
  h4,
  h5,
  h6 {
    font-size: 1em;
  }

  a {
    color: var(--_accent);
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  .pending-link {
    color: var(--_accent);
  }

  ul,
  ol {
    padding-left: 1.4em;
  }
  li + li {
    margin-top: 0.25em;
  }
  li > ul,
  li > ol {
    margin: 0.25em 0 0;
  }
  li.task {
    list-style: none;
    margin-left: -1.3em;
  }
  li.task input {
    margin: 0 0.45em 0 0;
    accent-color: var(--_accent);
    vertical-align: -0.1em;
  }

  blockquote {
    padding: 0.1em 0 0.1em 1em;
    border-left: 3px solid var(--_border);
    color: var(--_muted);
  }

  hr {
    border: 0;
    border-top: 1px solid var(--_border);
    margin: 1.5em 0;
  }

  code {
    font-family: var(--_font-mono);
    font-size: 0.9em;
  }

  .inline-code {
    background: var(--_code-bg);
    border: 1px solid var(--_border);
    border-radius: 5px;
    padding: 0.05em 0.35em;
  }

  .code-block {
    border: 1px solid var(--_border);
    border-radius: var(--_radius);
    background: var(--_code-bg);
    overflow: hidden;
  }

  .code-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 6px 8px 6px 14px;
    border-bottom: 1px solid var(--_border);
    font-size: 0.78em;
    color: var(--_muted);
  }

  .language {
    font-family: var(--_font-mono);
    text-transform: lowercase;
  }

  .copy {
    font: inherit;
    color: inherit;
    background: transparent;
    border: 1px solid var(--_border);
    border-radius: 6px;
    padding: 2px 10px;
    cursor: pointer;
  }
  .copy:hover {
    color: var(--_text);
    border-color: var(--_muted);
  }
  .copy[data-state="copied"] {
    color: var(--_success);
    border-color: currentColor;
  }

  pre {
    margin: 0;
    padding: 12px 14px;
    overflow-x: auto;
    line-height: 1.5;
    tab-size: 2;
  }

  .table-wrap {
    overflow-x: auto;
    border: 1px solid var(--_border);
    border-radius: var(--_radius);
  }
  table {
    border-collapse: collapse;
    width: 100%;
    font-size: 0.95em;
  }
  th,
  td {
    padding: 8px 12px;
    border-bottom: 1px solid var(--_border);
    text-align: left;
    vertical-align: top;
  }
  th {
    background: var(--_surface-raised);
    font-weight: 600;
  }
  tbody tr:last-child td {
    border-bottom: 0;
  }

  .caret {
    display: inline-block;
    width: 0.5em;
    height: 1.1em;
    margin-left: 2px;
    vertical-align: -0.2em;
    border-radius: 2px;
    background: var(--_accent);
    animation: blink 1s steps(1) infinite;
  }

  @keyframes blink {
    50% {
      opacity: 0;
    }
  }
`;
