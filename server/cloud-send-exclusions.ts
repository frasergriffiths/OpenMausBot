// Paths that never travel between workspaces: device identity, live leases, caches and anything rebuilt on start.
import { ephemeralWorkspaceTokenPath, excludedWorkspaceAuthPath, liveDataEnginePath, redownloadedOrgLibraryPath } from "./workspace-backup-policy.ts";

const EXCLUDED = new Set([
  ".backups", "tools", "browser", "agent-browser-profiles", "cache", ".cache", "tmp", ".tmp", "dist-native", "tunnel-runtime", "evidence",
  ".openmausbot-server-child", "environment-id", "sessions.json", "tunnel-account.json",
  "team-computers.json",
  "openmausbot-server.lease", "box-create-requests.lock", "messages.db-wal", "messages.db-shm",
  "runtime.db-wal", "runtime.db-shm",
  "decider-log",
  "cloud-owner.json",
  "sync",
  "claude-user-skills",
  "box",
  "engine-homes",
]);

function excluded(name: string): boolean {
  return EXCLUDED.has(name) || excludedWorkspaceAuthPath(name) || name.startsWith("openmausbot-server.lease.") || name.startsWith("box-create-requests.lock.") || /^perm-[A-Za-z0-9_-]+\.sock$/.test(name);
}

export function omittedFromWorkspaceBackup(path: string): boolean {
  return excluded(path.split("/")[0]) || excludedWorkspaceAuthPath(path) || ephemeralWorkspaceTokenPath(path) || redownloadedOrgLibraryPath(path) || liveDataEnginePath(path);
}
