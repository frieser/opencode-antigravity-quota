import { 
  ANTIGRAVITY_CLIENT_ID, 
  ANTIGRAVITY_CLIENT_SECRET, 
  GOOGLE_TOKEN_URL, 
  CLOUDCODE_BASE_URL, 
  CLOUDCODE_METADATA 
} from "./constants";
import { 
  Account, 
  TokenResponse, 
  LoadCodeAssistResponse, 
  CloudCodeQuotaResponse, 
  AccountQuotaResult,
  ModelQuotaDisplay
} from "./types";
import { extractProjectId, formatDuration } from "./utils";

export async function refreshAccessToken(refreshToken: string): Promise<string> {
  const params = new URLSearchParams({
    client_id: ANTIGRAVITY_CLIENT_ID,
    client_secret: ANTIGRAVITY_CLIENT_SECRET,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Token failed (${response.status})`);
  }

  const data = (await response.json()) as TokenResponse;
  return data.access_token;
}

export async function loadCodeAssist(accessToken: string): Promise<LoadCodeAssistResponse> {
  const response = await fetch(`${CLOUDCODE_BASE_URL}/v1internal:loadCodeAssist`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "User-Agent": "antigravity",
    },
    body: JSON.stringify({ metadata: CLOUDCODE_METADATA }),
  });

  if (!response.ok) throw new Error(`loadCodeAssist failed (${response.status})`);
  return (await response.json()) as LoadCodeAssistResponse;
}

export async function fetchAvailableModels(accessToken: string, projectId?: string): Promise<CloudCodeQuotaResponse> {
  const payload = projectId ? { project: projectId } : {};
  const response = await fetch(`${CLOUDCODE_BASE_URL}/v1internal:fetchAvailableModels`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "User-Agent": "antigravity",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) throw new Error(`fetchModels failed (${response.status})`);
  return (await response.json()) as CloudCodeQuotaResponse;
}

export async function fetchAccountQuota(account: Account): Promise<AccountQuotaResult> {
  try {
    const accessToken = await refreshAccessToken(account.refreshToken);
    let projectId = account.projectId || account.managedProjectId;
    
    if (!projectId) {
      const codeAssist = await loadCodeAssist(accessToken);
      projectId = extractProjectId(codeAssist.cloudaicompanionProject);
    }

    const quotaResponse = await fetchAvailableModels(accessToken, projectId);
    if (!quotaResponse.models) return { email: account.email, success: true, models: [] };

    const now = Date.now();
    const models: ModelQuotaDisplay[] = [];

    for (const [modelKey, info] of Object.entries(quotaResponse.models)) {
      const quotaInfo = info.quotaInfo;
      if (!quotaInfo) continue;

      const label = info.displayName || modelKey;
      const lowerLabel = label.toLowerCase();
      if (lowerLabel.startsWith("chat_") || 
          lowerLabel.startsWith("rev19") || 
          lowerLabel.includes("gemini 2.5") || 
          lowerLabel.includes("gemini 3 pro image")) {
        continue;
      }

      const remainingFraction = Math.min(1, Math.max(0, quotaInfo.remainingFraction ?? 0));
      let resetTime: Date;
      
      if (quotaInfo.resetTime) {
        const parsed = new Date(quotaInfo.resetTime);
        resetTime = Number.isNaN(parsed.getTime()) ? new Date(now + 86400000) : parsed;
      } else {
        resetTime = new Date(now + 86400000);
      }

      const timeUntilReset = Math.max(0, resetTime.getTime() - now);

      models.push({
        label,
        modelId: info.model || modelKey,
        remainingPercentage: remainingFraction * 100,
        isExhausted: remainingFraction <= 0,
        resetTime,
        resetTimeDisplay: "",
        timeUntilReset,
        timeUntilResetFormatted: formatDuration(timeUntilReset),
        recommended: info.recommended,
        tagTitle: info.tagTitle,
      });
    }

    models.sort((a, b) => a.label.localeCompare(b.label));
    return { email: account.email, success: true, models };
  } catch (error) {
    return {
      email: account.email,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
