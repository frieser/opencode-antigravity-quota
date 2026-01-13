export interface RateLimitResetTimes {
  [key: string]: number;
}

export interface Account {
  email: string;
  refreshToken: string;
  projectId?: string;
  managedProjectId?: string;
  rateLimitResetTimes: RateLimitResetTimes;
}

export interface AccountsConfig {
  accounts: Account[];
  activeIndex: number;
  activeIndexByFamily?: Record<string, number>;
}

export interface CloudCodeQuotaInfo {
  remainingFraction?: number;
  resetTime?: string;
}

export interface CloudCodeModelInfo {
  displayName?: string;
  model?: string;
  quotaInfo?: CloudCodeQuotaInfo;
  supportsImages?: boolean;
  supportsVideo?: boolean;
  supportsThinking?: boolean;
  recommended?: boolean;
  tagTitle?: string;
}

export interface CloudCodeQuotaResponse {
  models?: Record<string, CloudCodeModelInfo>;
}

export interface LoadCodeAssistResponse {
  currentTier?: { id?: string };
  paidTier?: { id?: string };
  cloudaicompanionProject?: unknown;
}

export interface TokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

export interface ModelQuotaDisplay {
  label: string;
  modelId: string;
  remainingPercentage: number;
  isExhausted: boolean;
  resetTime: Date;
  resetTimeDisplay: string;
  timeUntilReset: number;
  timeUntilResetFormatted: string;
  recommended?: boolean;
  tagTitle?: string;
}

export interface AccountQuotaResult {
  email: string;
  success: boolean;
  error?: string;
  models?: ModelQuotaDisplay[];
}
