import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import * as path from "path";
import * as os from "os";

describe("Constants", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Clear the module cache for constants.ts to ensure fresh evaluation
    // In Bun, we can use delete require.cache, but for ESM it's trickier.
    // However, we can use dynamic imports with a cache-busting query parameter.
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("should use default paths when OPENCODE_CONFIG_DIR is NOT set", async () => {
    delete process.env.OPENCODE_CONFIG_DIR;
    
    // Use a cache-busting query to force re-evaluation of the module
    const constants = await import(`../src/constants.ts?update=${Date.now()}`);
    
    const isWindows = os.platform() === "win32";
    const expectedConfigBase = isWindows
      ? path.join(os.homedir(), "AppData", "Roaming", "opencode")
      : path.join(os.homedir(), ".config", "opencode");
    
    expect(constants.CONFIG_PATH).toBe(path.join(expectedConfigBase, "antigravity-accounts.json"));
    
    const expectedCommandBase = path.join(os.homedir(), ".config", "opencode");
    expect(constants.COMMAND_DIR).toBe(path.join(expectedCommandBase, "command"));
  });

  it("should use OPENCODE_CONFIG_DIR when it IS set", async () => {
    const customDir = "/tmp/custom-opencode-config";
    process.env.OPENCODE_CONFIG_DIR = customDir;
    
    const constants = await import(`../src/constants.ts?update=${Date.now() + 1}`);
    
    expect(constants.CONFIG_PATH).toBe(path.join(customDir, "antigravity-accounts.json"));
    expect(constants.COMMAND_DIR).toBe(path.join(customDir, "command"));
    
    // Check CONFIG_PATHS contains the custom path
    expect(constants.CONFIG_PATHS).toContain(path.join(customDir, "antigravity-accounts.json"));
    // Since all bases are the same, it should be deduplicated to just one path
    expect(constants.CONFIG_PATHS.length).toBe(1);
  });
});
