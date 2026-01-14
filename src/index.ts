import { type Plugin, tool } from "@opencode-ai/plugin";
import * as fs from "fs/promises";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { COMMAND_DIR, COMMAND_FILE, COMMAND_CONTENT, CONFIG_PATH } from "./constants";
import { AccountsConfig, AccountQuotaResult, Account } from "./types";
import { fetchAccountQuota } from "./api";
import { delay, formatDuration, shortEmail, progressBar } from "./utils";

// Try to create the command file for OpenCode context
try {
  if (!existsSync(COMMAND_DIR)) {
    mkdirSync(COMMAND_DIR, { recursive: true });
  }
  if (!existsSync(COMMAND_FILE)) {
    writeFileSync(COMMAND_FILE, COMMAND_CONTENT, "utf-8");
  }
} catch (error) {
  console.error("Failed to create command file/directory:", error);
  // Continue execution, as this might not be fatal for the plugin's core function
  // if manually invoked, though it hinders discoverability.
}

async function fetchAllAccountsQuotaSequentially(accounts: Account[]): Promise<AccountQuotaResult[]> {
  const results: AccountQuotaResult[] = [];
  for (let i = 0; i < accounts.length; i++) {
    if (i > 0) await delay(300);
    results.push(await fetchAccountQuota(accounts[i]));
  }
  return results;
}

function getLocalRateLimitInfo(data: AccountsConfig): string {
  const now = Date.now();
  let output = "";

  const categories: Record<string, string[]> = {
    "Antigravity": [],
    "Gemini CLI": [],
  };

  const allModels = new Set<string>();
  data.accounts.forEach((acc) => {
    if (acc.rateLimitResetTimes) {
      Object.keys(acc.rateLimitResetTimes).forEach((k) => allModels.add(k));
    }
  });

  Array.from(allModels).forEach((model) => {
    if (model.startsWith("gemini-antigravity:") || model.includes("claude")) {
      categories["Antigravity"].push(model);
    } else if (model.startsWith("gemini-cli:")) {
      categories["Gemini CLI"].push(model);
    }
  });

  for (const [category, models] of Object.entries(categories)) {
    if (models.length === 0) continue;

    output += `### ${category}\n\n`;

    for (const model of models.sort()) {
      const cleanName = model.split(":").pop() || model;
      output += `#### ${cleanName}\n`;
      output += "```text\n";
      output += "STATUS   RESET TIME       LAST USED        ACCOUNT\n";
      
      const accountStatuses = data.accounts
        .map((acc) => {
          const resetTime = acc.rateLimitResetTimes?.[model] || 0;
          const remaining = resetTime - now;
          const available = resetTime === 0 || remaining <= 0;
          
          let statusText = available ? "READY" : "WAIT";
          
          let resetTimeStr: string;
          let lastUsedStr: string;

          if (resetTime === 0) {
            resetTimeStr = "-";
            lastUsedStr = "Never used";
          } else if (available) {
            resetTimeStr = "Ready";
            lastUsedStr = `${formatDuration(Math.abs(remaining))} ago`;
          } else {
            resetTimeStr = formatDuration(remaining);
            lastUsedStr = "-";
          }

          return { email: shortEmail(acc.email), remaining, statusText, resetTimeStr, lastUsedStr };
        })
        .sort((a, b) => a.remaining - b.remaining);

      for (const acc of accountStatuses) {
        const status = acc.statusText.padEnd(9, " ");
        const reset = acc.resetTimeStr.padEnd(17, " ");
        const last = acc.lastUsedStr.padEnd(17, " ");
        const email = acc.email;
        output += `${status}${reset}${last}${email}\n`;
      }
      output += "```\n\n";
    }
  }

  return output;
}

export const plugin: Plugin = async (ctx) => {
  return {
    tool: {
      antigravity_quota: tool({
        description: "Get antigravity quota for all accounts",
        args: {},
        async execute(args, ctx) {
          try {
            if (!existsSync(CONFIG_PATH)) {
               return `❌ Error: Configuration file not found at ${CONFIG_PATH}.\n\nPlease ensure you have installed and configured 'opencode-antigravity-auth'. This plugin relies on it for account credentials.`;
            }

            const content = await fs.readFile(CONFIG_PATH, "utf-8");
            const data = JSON.parse(content) as AccountsConfig;

            // Handle missing emails by assigning default names
            data.accounts.forEach((acc, index) => {
              if (!acc.email) {
                acc.email = `account-${index + 1}`;
              }
            });

            let output = "# ☁️ Quota Status\n\n";

            const quotaResults = await fetchAllAccountsQuotaSequentially(data.accounts);
            const errors: string[] = [];
            const allApiModels = new Map<string, { label: string; accounts: { email: string; percentage: number; resetIn: string; isExhausted: boolean }[] }>();

            for (const result of quotaResults) {
              if (!result.success || !result.models) {
                errors.push(`${shortEmail(result.email)}: ${result.error || "error"}`);
                continue;
              }

              for (const model of result.models) {
                if (!allApiModels.has(model.modelId)) {
                  allApiModels.set(model.modelId, { label: model.label, accounts: [] });
                }
                allApiModels.get(model.modelId)!.accounts.push({
                  email: result.email,
                  percentage: model.remainingPercentage,
                  resetIn: model.timeUntilResetFormatted,
                  isExhausted: model.isExhausted,
                });
              }
            }

            if (errors.length > 0) {
              output += `⚠️ Errors: ${errors.join(", ")}\n\n`;
            }

            const sortedModels = Array.from(allApiModels.entries()).sort((a, b) =>
              a[1].label.localeCompare(b[1].label)
            );

            const modelGroups = new Map<string, { labels: string[]; accounts: { email: string; percentage: number; resetIn: string; isExhausted: boolean }[] }>();

            for (const [modelId, modelData] of sortedModels) {
              const signature = modelData.accounts
                .map(a => `${a.email}:${a.percentage.toFixed(1)}:${a.resetIn}`)
                .sort()
                .join("|");

              if (modelGroups.has(signature)) {
                modelGroups.get(signature)!.labels.push(modelData.label);
              } else {
                modelGroups.set(signature, { labels: [modelData.label], accounts: modelData.accounts });
              }
            }

            for (const [signature, group] of modelGroups) {
              const title = group.labels.join(" / ");
              output += `### ${title}\n`;
              output += "```text\n";
              output += "QUOTA               RESET IN    ACCOUNT\n";
              
              const sorted = group.accounts.sort((a, b) => b.percentage - a.percentage);
              
              for (const acc of sorted) {
                const bar = progressBar(acc.percentage).padEnd(20, " ");
                const reset = acc.resetIn.padEnd(12, " ");
                const email = shortEmail(acc.email);
                output += `${bar}${reset}${email}\n`;
              }
              output += "```\n\n";
            }
            output += "\n";

            output += "---\n## 💾 Local Cache\n\n";
            output += getLocalRateLimitInfo(data);

            return output;
          } catch (error) {
            return `Error: ${error instanceof Error ? error.message : String(error)}`;
          }
        },
      }),
    },
  };
};

export default plugin;
