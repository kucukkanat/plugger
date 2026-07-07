import { describe, expect, it, vi } from "vitest";
import {
  PermissionError,
  PermissionSet,
  resolvePermissions,
} from "../src/permissions.js";

describe("PermissionSet", () => {
  it("reports granted permissions", () => {
    const set = new PermissionSet(["state:read", "ui:render"], "p");
    expect(set.has("state:read")).toBe(true);
    expect(set.has("state:write")).toBe(false);
  });

  it("api:* is a wildcard for any api:<name>", () => {
    const set = new PermissionSet(["api:*"], "p");
    expect(set.has("api:save")).toBe(true);
    expect(set.has("api:anything")).toBe(true);
    expect(set.has("state:read")).toBe(false);
  });

  it("assert throws a PermissionError for missing permissions", () => {
    const set = new PermissionSet([], "my-plugin");
    expect(() => set.assert("state:write")).toThrow(PermissionError);
    try {
      set.assert("state:write");
    } catch (e) {
      expect(e).toBeInstanceOf(PermissionError);
      expect((e as PermissionError).permission).toBe("state:write");
      expect((e as PermissionError).plugin).toBe("my-plugin");
    }
  });

  it("list returns all grants", () => {
    const set = new PermissionSet(["state:read", "ui:render"], "p");
    expect(set.list().sort()).toEqual(["state:read", "ui:render"]);
  });
});

describe("resolvePermissions", () => {
  it("with no policy, grants exactly what the plugin requests", async () => {
    const set = await resolvePermissions("p", ["state:read", "ui:render"], [], undefined);
    expect(set.has("state:read")).toBe(true);
    expect(set.has("ui:render")).toBe(true);
    expect(set.has("state:write")).toBe(false);
  });

  it("includes policy defaults and per-plugin grants", async () => {
    const set = await resolvePermissions("p", [], [], {
      default: ["state:read"],
      grants: { p: ["ui:render"] },
    });
    expect(set.has("state:read")).toBe(true);
    expect(set.has("ui:render")).toBe(true);
  });

  it("includes explicit grants passed to load", async () => {
    const set = await resolvePermissions("p", [], ["storage"], undefined);
    expect(set.has("storage")).toBe(true);
  });

  it("consults onRequest for requested-but-not-granted permissions", async () => {
    const onRequest = vi.fn(async (permission) => permission === "state:read");
    const set = await resolvePermissions("p", ["state:read", "network"], [], {
      onRequest,
    });
    expect(set.has("state:read")).toBe(true);
    expect(set.has("network")).toBe(false);
    expect(onRequest).toHaveBeenCalledTimes(2);
  });

  it("does not call onRequest for already-granted permissions", async () => {
    const onRequest = vi.fn(() => true);
    await resolvePermissions("p", ["state:read"], ["state:read"], { onRequest });
    expect(onRequest).not.toHaveBeenCalled();
  });
});
