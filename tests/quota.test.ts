import { describe, it, expect, mock, beforeEach, afterEach } from "bun:test";
import { AccountQuotaResult } from "../src/types";
import { GOOGLE_TOKEN_URL, CLOUDCODE_BASE_URL } from "../src/constants";

// Mutable state for fs mocks
let mockConfig: any = {};
let mockExists = true;

mock.module("fs/promises", () => ({
  readFile: async () => JSON.stringify(mockConfig),
}));

mock.module("fs", () => ({
  existsSync: () => mockExists,
  mkdirSync: () => {},
  writeFileSync: () => {},
  readFileSync: () => "",
}));

// We do NOT mock src/api.ts anymore to avoid interference with other tests.
// Instead we mock global.fetch.

// Import plugin (will use real api.ts but mocked fs)
const { plugin } = await import("../src/index");

describe("Antigravity Quota Plugin", () => {
    const originalFetch = global.fetch;

    beforeEach(() => {
        mockConfig = {
            accounts: [{ email: "user@test.com", refreshToken: "rt", rateLimitResetTimes: {} }],
            activeIndex: 0
        };
        mockExists = true;

        global.fetch = mock(async (url: string | URL | Request, init?: RequestInit) => {
            const urlString = url.toString();

            // Mock Token Refresh
            if (urlString === GOOGLE_TOKEN_URL) {
                 // Check if we should simulate failure for a specific token
                 // (We can use a simple heuristic or inspect body)
                 if (init?.body && init.body.toString().includes("refresh_token=fail_token")) {
                      return new Response("Unauthorized", { status: 401 });
                 }
                 return Response.json({
                     access_token: "mock_access_token",
                     expires_in: 3600,
                     token_type: "Bearer"
                 });
            }

            // Mock Fetch Models
            if (urlString.includes("fetchAvailableModels")) {
                return Response.json({
                    models: {
                        "gemini-1.5-pro": {
                            displayName: "Gemini 1.5 Pro",
                            model: "gemini-1.5-pro",
                            quotaInfo: {
                                remainingFraction: 1.0,
                                resetTime: new Date(Date.now() + 86400000).toISOString()
                            },
                            recommended: true
                        }
                    }
                });
            }

            // Mock Code Assist (used to get project ID)
            if (urlString.includes("loadCodeAssist")) {
                return Response.json({
                    cloudaicompanionProject: { id: "mock-project-id" }
                });
            }

            return new Response("Not Found", { status: 404 });
        });
    });

    afterEach(() => {
        global.fetch = originalFetch;
    });

    it("should return error if config file is missing", async () => {
        mockExists = false;
        const p = await plugin({} as any);
        const result = await p.tool.antigravity_quota.execute({}, {} as any);
        expect(result).toContain("Error: Configuration file not found");
    });

    it("should handle partial API failures", async () => {
        mockConfig = {
            accounts: [
                { email: "success@test.com", refreshToken: "rt1", rateLimitResetTimes: {} },
                { email: "fail@test.com", refreshToken: "fail_token", rateLimitResetTimes: {} }
            ],
            activeIndex: 0
        };

        const p = await plugin({} as any);
        const result = await p.tool.antigravity_quota.execute({}, {} as any);

        expect(result).toContain("Errors: fail: Token failed (401)");
        expect(result).toContain("success");
        expect(result).toContain("Gemini 1.5 Pro");
    });

    it("should display local cache information", async () => {
         mockConfig = {
            accounts: [
                {
                    email: "user@test.com",
                    refreshToken: "rt",
                    rateLimitResetTimes: {
                        "gemini-antigravity:gemini-1.5-pro": Date.now() + 60000 // 1 minute in future
                    }
                }
            ],
            activeIndex: 0
        };

        const p = await plugin({} as any);
        const result = await p.tool.antigravity_quota.execute({}, {} as any);

        expect(result).toContain("## 💾 Local Cache");
        expect(result).toContain("### Antigravity");
        expect(result).toContain("gemini-1.5-pro");
        expect(result).toContain("WAIT");
        expect(result).toMatch(/\dm/);
    });

    it("should group identical model quotas", async () => {
         mockConfig = {
            accounts: [
                { email: "user1@test.com", refreshToken: "rt1", rateLimitResetTimes: {} },
                { email: "user2@test.com", refreshToken: "rt2", rateLimitResetTimes: {} }
            ],
            activeIndex: 0
        };

        const p = await plugin({} as any);
        const result = await p.tool.antigravity_quota.execute({}, {} as any);

        expect(result.match(/user1/)).toBeTruthy();
        expect(result.match(/user2/)).toBeTruthy();
        expect(result).toContain("### Gemini 1.5 Pro");
    });

    it("should handle missing emails by assigning default names", async () => {
         mockConfig = {
            accounts: [{ refreshToken: "rt", rateLimitResetTimes: {} }], // no email
            activeIndex: 0
        };

        const p = await plugin({} as any);
        const result = await p.tool.antigravity_quota.execute({}, {} as any);

        expect(result).toContain("account-1");
    });
});
