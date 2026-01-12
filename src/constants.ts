import * as path from "path";
import * as os from "os";

const isWindows = os.platform() === "win32";

// Define base configuration directory based on OS
// Windows: %APPDATA%/opencode (e.g., C:\Users\User\AppData\Roaming\opencode)
// Mac/Linux: ~/.config/opencode
const configBase = isWindows
  ? path.join(os.homedir(), "AppData", "Roaming", "opencode")
  : path.join(os.homedir(), ".config", "opencode");

export const COMMAND_DIR = path.join(configBase, "command");
export const COMMAND_FILE = path.join(COMMAND_DIR, "antigravity-quota.md");
export const COMMAND_CONTENT = `---
description: Check Antigravity quota status for all configured Google accounts
model: opencode/grok-code
---

Use the \`antigravity_quota\` tool to check the current quota status.

This will show:
- API quota remaining for each model (Gemini 3 Pro, Flash, Claude via Antigravity)
- Per-account breakdown with visual progress bars
- Time until quota reset
- Local rate limit cache status

Just call the tool directly:
\`\`\`
antigravity_quota()
\`\`\`

IMPORTANT: Display the tool output EXACTLY as it is returned. Do not summarize, reformat, or modify the output in any way.
`;

export const CLOUDCODE_BASE_URL = "https://cloudcode-pa.googleapis.com";
export const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
export const ANTIGRAVITY_CLIENT_ID = "1071006060591-tmhssin2h21lcre235vtolojh4g403ep.apps.googleusercontent.com";
export const ANTIGRAVITY_CLIENT_SECRET = "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";

export const CLOUDCODE_METADATA = {
  ideType: "ANTIGRAVITY",
  platform: "PLATFORM_UNSPECIFIED",
  pluginType: "GEMINI",
};

export const CONFIG_PATH = path.join(configBase, "antigravity-accounts.json");
