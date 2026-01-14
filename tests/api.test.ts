import { describe, it, expect, mock, beforeEach, afterEach } from "bun:test";
import {
  refreshAccessToken,
  loadCodeAssist,
  fetchAvailableModels,
  fetchAccountQuota
} from "../src/api";
import { GOOGLE_TOKEN_URL, CLOUDCODE_BASE_URL } from "../src/constants";

describe("API", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = mock();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe("refreshAccessToken", () => {
    it("should return access token on success", async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ access_token: "new-token", expires_in: 3600, token_type: "Bearer" }),
      });

      const token = await refreshAccessToken("refresh-token");
      expect(token).toBe("new-token");
      expect(global.fetch).toHaveBeenCalledWith(GOOGLE_TOKEN_URL, expect.objectContaining({
        method: "POST",
      }));
    });

    it("should throw error on failure", async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => "Bad Request",
      });

      expect(refreshAccessToken("bad-token")).rejects.toThrow("Token failed (400)");
    });
  });

  describe("loadCodeAssist", () => {
    it("should return project info on success", async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ cloudaicompanionProject: { id: "test-project" } }),
      });

      const result = await loadCodeAssist("access-token");
      expect(result.cloudaicompanionProject).toEqual({ id: "test-project" });
      expect(global.fetch).toHaveBeenCalledWith(`${CLOUDCODE_BASE_URL}/v1internal:loadCodeAssist`, expect.anything());
    });

    it("should throw error on failure", async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 500,
      });

      expect(loadCodeAssist("token")).rejects.toThrow("loadCodeAssist failed (500)");
    });
  });

  describe("fetchAvailableModels", () => {
    it("should return quota info", async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ models: { "gemini-pro": {} } }),
      });

      const result = await fetchAvailableModels("token", "project-id");
      expect(result.models).toHaveProperty("gemini-pro");
      expect(global.fetch).toHaveBeenCalledWith(
        `${CLOUDCODE_BASE_URL}/v1internal:fetchAvailableModels`,
        expect.objectContaining({
            body: JSON.stringify({ project: "project-id" })
        })
      );
    });

    it("should handle missing project id", async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      await fetchAvailableModels("token");
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("fetchAvailableModels"),
        expect.objectContaining({
            body: JSON.stringify({})
        })
      );
    });
  });

  describe("fetchAccountQuota", () => {
    it("should return quota models successfully", async () => {
        // Mock chain: refresh -> loadCodeAssist -> fetchAvailableModels
        const mockFetch = global.fetch as any;

        mockFetch
            .mockResolvedValueOnce({ // refreshAccessToken
                ok: true,
                json: async () => ({ access_token: "mock-access-token" }),
            })
            .mockResolvedValueOnce({ // loadCodeAssist (if no project id)
                ok: true,
                json: async () => ({ cloudaicompanionProject: "discovered-project" }),
            })
            .mockResolvedValueOnce({ // fetchAvailableModels
                ok: true,
                json: async () => ({
                    models: {
                        "gemini-1.5-pro": {
                            displayName: "Gemini 1.5 Pro",
                            quotaInfo: {
                                remainingFraction: 0.8,
                                resetTime: new Date(Date.now() + 3600000).toISOString()
                            }
                        },
                        "chat_model": { // Should be filtered out
                            displayName: "chat_model",
                            quotaInfo: { remainingFraction: 1 }
                        }
                    }
                }),
            });

        const account = {
            email: "test@example.com",
            refreshToken: "rt",
            rateLimitResetTimes: {}
        };

        const result = await fetchAccountQuota(account);

        expect(result.success).toBe(true);
        expect(result.email).toBe("test@example.com");
        expect(result.models).toHaveLength(1);
        expect(result.models![0].label).toBe("Gemini 1.5 Pro");
        expect(result.models![0].remainingPercentage).toBe(80);
    });

    it("should handle error during flow", async () => {
        const mockFetch = global.fetch as any;
        mockFetch.mockResolvedValueOnce({ // refreshAccessToken fails
            ok: false,
            status: 401,
            text: async () => "Unauthorized"
        });

        const account = {
            email: "test@example.com",
            refreshToken: "rt",
            rateLimitResetTimes: {}
        };

        const result = await fetchAccountQuota(account);
        expect(result.success).toBe(false);
        expect(result.error).toContain("Token failed (401)");
    });

    it("should use existing project id if provided", async () => {
         const mockFetch = global.fetch as any;

        mockFetch
            .mockResolvedValueOnce({ // refreshAccessToken
                ok: true,
                json: async () => ({ access_token: "mock-access-token" }),
            })
            // Skips loadCodeAssist
            .mockResolvedValueOnce({ // fetchAvailableModels
                ok: true,
                json: async () => ({ models: {} }),
            });

         const account = {
            email: "test@example.com",
            refreshToken: "rt",
            projectId: "existing-project",
            rateLimitResetTimes: {}
        };

        await fetchAccountQuota(account);

        // Verify only 2 calls were made
        expect(mockFetch).toHaveBeenCalledTimes(2);
        // Verify the second call used the existing project id
        expect(mockFetch).toHaveBeenLastCalledWith(
            expect.stringContaining("fetchAvailableModels"),
            expect.objectContaining({
                body: JSON.stringify({ project: "existing-project" })
            })
        );
    });
  });
});
