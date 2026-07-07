import type { Permission, PermissionPolicy } from "./types.js";

export class PermissionError extends Error {
  override name = "PermissionError";
  constructor(
    public readonly permission: Permission,
    public readonly plugin: string,
  ) {
    super(
      `Plugin "${plugin}" attempted to use "${permission}" without permission. ` +
        `Grant it via the plugin's \`permissions\` or the host permission policy.`,
    );
  }
}

/** A resolved, immutable set of permissions granted to a single plugin. */
export class PermissionSet {
  private readonly granted: Set<Permission>;

  constructor(
    granted: Iterable<Permission>,
    public readonly plugin: string,
  ) {
    this.granted = new Set(granted);
  }

  has(permission: Permission): boolean {
    if (this.granted.has(permission)) return true;
    // Wildcard `api:*` grants every `api:<name>`.
    if (permission.startsWith("api:") && this.granted.has("api:*" as Permission)) {
      return true;
    }
    return false;
  }

  /** Throw if the permission is not granted. */
  assert(permission: Permission): void {
    if (!this.has(permission)) {
      throw new PermissionError(permission, this.plugin);
    }
  }

  list(): Permission[] {
    return [...this.granted];
  }
}

/**
 * Compute the effective permissions for a plugin by combining:
 *  1. the policy default grants,
 *  2. per-plugin grants from the policy,
 *  3. explicit grants passed to `load`,
 *  4. the plugin's own requested permissions, each run through
 *     `policy.onRequest` when not already granted.
 */
export async function resolvePermissions(
  pluginName: string,
  requested: Permission[],
  explicitGrants: Permission[],
  policy: PermissionPolicy | undefined,
): Promise<PermissionSet> {
  const granted = new Set<Permission>();

  for (const p of policy?.default ?? []) granted.add(p);
  for (const p of policy?.grants?.[pluginName] ?? []) granted.add(p);
  for (const p of explicitGrants) granted.add(p);

  for (const p of requested) {
    if (granted.has(p)) continue;
    if (policy?.onRequest) {
      const ok = await policy.onRequest(p, pluginName);
      if (ok) granted.add(p);
    } else {
      // Default policy: trust the plugin's declared requirements.
      granted.add(p);
    }
  }

  return new PermissionSet(granted, pluginName);
}
