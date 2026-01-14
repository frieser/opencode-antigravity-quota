import { describe, it, expect, mock } from "bun:test";
import { AccountQuotaResult } from "../src/types";
import { resolve } from "path";

// Mock fs/promises to return our test config
mock.module("fs/promises", () => {
  return {
    readFile: async () => JSON.stringify({
      accounts: [
        {
          // Missing email
          refreshToken: "token1",
          rateLimitResetTimes: {}
        }
      ],
      activeIndex: 0
    }),
  };
});

// Mock fs to pass existence checks
mock.module("fs", () => {
  return {
    existsSync: () => true,
    mkdirSync: () => {},
    writeFileSync: () => {},
  };
});

// Mock api to avoid network calls
// We need to resolve the absolute path to ensure the mock hits the right module
// regardless of how it's imported (e.g. "./api" inside "src/index.ts")
const apiPath = resolve(process.cwd(), "src/api.ts");
mock.module(apiPath, () => {
  return {
    fetchAccountQuota: async (account: any): Promise<AccountQuotaResult> => {
      console.log("Mock fetchAccountQuota called for", account.email);
      return {
        email: account.email,
        success: true,
        models: [
            {
                label: "Test Model",
                modelId: "test-model",
                remainingPercentage: 50,
                isExhausted: false,
                resetTime: new Date(),
                resetTimeDisplay: "tomorrow",
                timeUntilReset: 1000,
                timeUntilResetFormatted: "1h",
                recommended: true
            }
        ]
      };
    }
  };
});

// Import plugin after mocking
const { plugin } = await import("../src/index");

describe("Antigravity Quota Plugin", () => {
  it("should handle missing emails by assigning default names", async () => {
    const p = await plugin({} as any);
    const tool = p.tool.antigravity_quota;

    const result = await tool.execute({}, {} as any);

    console.log("Result:", result);
    expect(result).not.toContain("Error: undefined is not an object");
    expect(result).toContain("account-1");
    // Ensure we don't see the "Token failed" error which implies network call
    expect(result).not.toContain("Token failed");
    expect(result).toContain("Test Model");
  });
});
