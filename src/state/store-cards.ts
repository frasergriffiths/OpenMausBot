export interface ConnectorCardData {
  slug: string;
  label: string;
  description: string;
  status: "required" | "authorizing" | "connected" | "failed";
  resumeKey: string;
  alias?: string;
  error?: string;
  dismissed?: boolean;
  resumed?: boolean;
  stopped?: boolean;
}

export interface SecretRequestCardData {
  target: import("../../shared/credential-request").CredentialTargetId;
  label: string;
  description: string;
  placeholder: string;
  helpUrl: string;
  requestKey: string;
  provided?: boolean;
  dismissed?: boolean;
  superseded?: boolean;
  resumed?: boolean;
  error?: string;
  stopped?: boolean;
}

export type ComputerControlState = { held: boolean; helpReason: string | null; help?: import("../../shared/wire").ComputerHelpRef | null };
