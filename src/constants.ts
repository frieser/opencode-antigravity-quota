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



import {
  ANTIGRAVITY_CLIENT_ID as AUTH_CLIENT_ID,
  ANTIGRAVITY_CLIENT_SECRET as AUTH_CLIENT_SECRET,
  ANTIGRAVITY_ENDPOINT_PROD
} from "opencode-antigravity-auth/dist/src/constants";

export const CLOUDCODE_BASE_URL = ANTIGRAVITY_ENDPOINT_PROD;
export const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
export const ANTIGRAVITY_CLIENT_ID = AUTH_CLIENT_ID;
export const ANTIGRAVITY_CLIENT_SECRET = AUTH_CLIENT_SECRET;


export const CLOUDCODE_METADATA = {
  ideType: "ANTIGRAVITY",
  platform: "PLATFORM_UNSPECIFIED",
  pluginType: "GEMINI",
};

export const CONFIG_PATH = path.join(configBase, "antigravity-accounts.json");

// Define data directory for alternative plugin storage (shekohex/opencode-google-antigravity-auth)
// Windows: Same as configBase
// Mac/Linux: $XDG_DATA_HOME/opencode or ~/.local/share/opencode
const xdgData = process.env.XDG_DATA_HOME || path.join(os.homedir(), ".local", "share");
const dataBase = isWindows
  ? configBase
  : path.join(xdgData, "opencode");

export const CONFIG_PATHS = Array.from(new Set([
  CONFIG_PATH,
  path.join(dataBase, "antigravity-accounts.json")
]));
