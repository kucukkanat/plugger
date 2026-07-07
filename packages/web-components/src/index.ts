/**
 * @plugger/web-components — a `<plugger-slot>` custom element so any app (or
 * any framework) can drop plugin UI into the page declaratively.
 *
 * ```html
 * <plugger-slot name="sidebar"></plugger-slot>
 * <script type="module">
 *   import { definePluggerElements, setDefaultHost } from "@plugger/web-components";
 *   setDefaultHost(host);
 *   definePluggerElements();
 * </script>
 * ```
 */
import { renderSlot, type SlotHandle } from "@plugger/vanilla";
import type { PluginHost } from "@plugger/core";

let defaultHost: PluginHost | null = null;

/** Set the host used by `<plugger-slot>` elements that have no `.host` property. */
export function setDefaultHost(host: PluginHost<never, never> | PluginHost): void {
  defaultHost = host as PluginHost;
}

export function getDefaultHost(): PluginHost | null {
  return defaultHost;
}

/**
 * The `<plugger-slot>` custom element. Renders contributions for `name` using
 * either its `.host` property or the module-level default host. Light-DOM by
 * design so host application styles cascade into plugin UI.
 */
export class PluggerSlotElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return ["name"];
  }

  private handle: SlotHandle | null = null;
  private _host: PluginHost | null = null;
  private _props: Record<string, unknown> = {};

  /** Imperatively assign a host (takes precedence over the default host). */
  set host(value: PluginHost | null) {
    this._host = value;
    if (this.isConnected) this.mount();
  }
  get host(): PluginHost | null {
    return this._host ?? defaultHost;
  }

  /** Props forwarded to every contribution. */
  set props(value: Record<string, unknown>) {
    this._props = value ?? {};
    this.handle?.setProps(this._props);
  }
  get props(): Record<string, unknown> {
    return this._props;
  }

  connectedCallback(): void {
    this.mount();
  }

  disconnectedCallback(): void {
    this.handle?.dispose();
    this.handle = null;
  }

  attributeChangedCallback(attr: string, _old: string | null, _next: string | null): void {
    if (attr === "name" && this.isConnected) this.mount();
  }

  private mount(): void {
    this.handle?.dispose();
    this.handle = null;
    const host = this.host;
    const name = this.getAttribute("name");
    if (!host || !name) return;
    this.handle = renderSlot(host, name, this, { props: this._props });
  }
}

/** Register the custom element(s). Safe to call more than once. */
export function definePluggerElements(tagName = "plugger-slot"): void {
  if (typeof customElements === "undefined") return;
  if (!customElements.get(tagName)) {
    customElements.define(tagName, PluggerSlotElement);
  }
}
