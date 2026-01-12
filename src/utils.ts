export function formatDuration(ms: number): string {
  const absMs = Math.abs(ms);
  const seconds = Math.floor(absMs / 1000);
  const d = Math.floor(seconds / (24 * 3600));
  const h = Math.floor((seconds % (24 * 3600)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);

  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function shortEmail(email: string): string {
  return email.split("@")[0];
}

export function progressBar(percent: number): string {
  const width = 10;
  const filled = Math.round((percent / 100) * width);
  const empty = width - filled;
  
  const bar = "█".repeat(filled) + "░".repeat(empty);
  return `[${bar}] ${percent.toFixed(0)}%`;
}

export function extractProjectId(project: unknown): string | undefined {
  if (typeof project === "string" && project) return project;
  if (project && typeof project === "object" && "id" in project) {
    const id = (project as { id?: string }).id;
    if (id) return id;
  }
  return undefined;
}

export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
