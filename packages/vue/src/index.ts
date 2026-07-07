/**
 * @plugger/vue — Vue 3 bindings for a Plugger host. Uses render functions only,
 * so no template compiler is required at runtime.
 */
import {
  defineComponent,
  h,
  inject,
  onBeforeUnmount,
  onMounted,
  provide,
  ref,
  shallowRef,
  watch,
  type InjectionKey,
  type PropType,
  type Ref,
} from "vue";
import { renderSlot } from "@plugger/vanilla";
import type { PluginHost, PluginRecord, RegisteredCommand } from "@plugger/core";

export const PluggerKey: InjectionKey<PluginHost> = Symbol("plugger-host");

/** Provide a host to descendant components. Call in a parent `setup()`. */
export function providePlugger(host: PluginHost<never, never> | PluginHost): void {
  provide(PluggerKey, host as PluginHost);
}

export function usePluggerHost<
  API extends object = Record<string, unknown>,
  S extends object = Record<string, unknown>,
>(): PluginHost<API, S> {
  const host = inject(PluggerKey, null);
  if (!host) throw new Error("usePluggerHost must be called under a component that provided a host.");
  return host as unknown as PluginHost<API, S>;
}

/** `<PluggerSlot name="sidebar" />` — renders every contribution for a slot. */
export const PluggerSlot = defineComponent({
  name: "PluggerSlot",
  props: {
    name: { type: String, required: true },
    host: { type: Object as PropType<PluginHost>, default: undefined },
    as: { type: String, default: "div" },
    tag: { type: String, default: "div" },
    slotProps: { type: Object as PropType<Record<string, unknown>>, default: () => ({}) },
  },
  setup(props) {
    const container = ref<HTMLElement | null>(null);
    const injected = inject(PluggerKey, null);
    let handle: ReturnType<typeof renderSlot> | null = null;

    onMounted(() => {
      const host = (props.host ?? injected) as PluginHost | null;
      if (!host) throw new Error("<PluggerSlot> needs a host prop or a provided host.");
      if (!container.value) return;
      handle = renderSlot(host, props.name, container.value, {
        props: props.slotProps,
        tagName: props.tag,
      });
      watch(
        () => props.slotProps,
        (next) => handle?.setProps(next ?? {}),
        { deep: true },
      );
    });

    onBeforeUnmount(() => handle?.dispose());

    return () =>
      h(props.as, { ref: container, "data-plugger-slot-container": props.name });
  },
});

/** Reactive slice of host state. */
export function usePluginStore<S extends object, T>(
  selector: (state: S) => T,
  isEqual: (a: T, b: T) => boolean = Object.is,
): Readonly<Ref<T>> {
  const host = usePluggerHost<Record<string, unknown>, S>();
  const value = shallowRef<T>(selector(host.store.getState() as S));
  const off = host.store.subscribe((state) => {
    const next = selector(state as S);
    if (!isEqual(next, value.value)) value.value = next;
  });
  onBeforeUnmount(off);
  return value;
}

/** Reactive list of registered plugins. */
export function usePlugins(host?: PluginHost): Readonly<Ref<PluginRecord[]>> {
  const h = (host ?? inject(PluggerKey, null)) as PluginHost;
  const list = shallowRef<PluginRecord[]>(h.list());
  const events = [
    "plugin:loaded",
    "plugin:activated",
    "plugin:deactivated",
    "plugin:removed",
    "plugin:error",
  ];
  const offs = events.map((e) => h.on(e, () => (list.value = h.list())));
  onBeforeUnmount(() => offs.forEach((o) => o()));
  return list;
}

/** Reactive list of registered commands. */
export function useCommands(host?: PluginHost): Readonly<Ref<RegisteredCommand[]>> {
  const h = (host ?? inject(PluggerKey, null)) as PluginHost;
  const list = shallowRef<RegisteredCommand[]>(h.commands.list());
  const off = h.commands.onChange(() => (list.value = h.commands.list()));
  onBeforeUnmount(off);
  return list;
}
