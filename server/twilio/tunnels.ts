// Ways to give this computer a public HTTPS address for Twilio's callback.
// We never run the tunnel ourselves from the server: the person starts it in a
// terminal (or their own service manager), which keeps credentials theirs, and
// pastes back the address it prints.
import { execFile } from "node:child_process";

export type TunnelProvider = "cloudflare" | "tailscale" | "ngrok";

export interface TunnelOption {
  id: TunnelProvider;
  /** The command to paste into a terminal on this computer. */
  command: string;
  installed: boolean;
  docs: string;
}

const COMMANDS: Record<TunnelProvider, (port: number) => string> = {
  cloudflare: (port) => `cloudflared tunnel --url http://localhost:${port}`,
  tailscale: (port) => `tailscale funnel --bg ${port}`,
  ngrok: (port) => `ngrok http ${port}`,
};

const DOCS: Record<TunnelProvider, string> = {
  cloudflare: "https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/get-started/create-local-tunnel/",
  tailscale: "https://tailscale.com/kb/1223/funnel",
  ngrok: "https://ngrok.com/docs/getting-started/",
};

const BINARY: Record<TunnelProvider, string> = {
  cloudflare: "cloudflared",
  tailscale: "tailscale",
  ngrok: "ngrok",
};

/** Whether a tunnel client is on this computer's PATH. Never throws. */
async function installed(binary: string): Promise<boolean> {
  return new Promise((resolve) => {
    execFile("sh", ["-lc", `command -v ${binary}`], { timeout: 5000 }, (error) => resolve(!error));
  });
}

export async function detectTunnels(port: number): Promise<TunnelOption[]> {
  const ids: TunnelProvider[] = ["cloudflare", "tailscale", "ngrok"];
  return Promise.all(ids.map(async (id) => ({
    id,
    command: COMMANDS[id](port),
    installed: await installed(BINARY[id]),
    docs: DOCS[id],
  })));
}
