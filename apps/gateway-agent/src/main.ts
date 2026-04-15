import { defaultAppEnv } from "@airwise/config";
import { createGatewayAdapter, type GatewayAdapterType } from "./adapters/index.js";
import { delay, nextDelayMs } from "./lib/shared.js";
import type { GatewayDispatchRecord, GatewayPollResponse, GatewayRuntimeResponse } from "./types.js";

type AgentConfig = {
  apiBaseUrl: string;
  gatewayId: string;
  gatewayToken: string;
  agentVersion: string;
  heartbeatIntervalMs: number;
  defaultPollIntervalMs: number;
  disableDiscovery: boolean;
  disableTelemetry: boolean;
  adapterType: GatewayAdapterType;
  discoveryFile?: string;
  telemetryFile?: string;
  bridgeBaseUrl?: string;
  bridgeApiKey?: string;
  bridgeApiKeyHeader?: string;
  bridgeDiscoveryPath?: string;
  bridgeTelemetryPath?: string;
  bridgeCommandPath?: string;
};

function requireEnv(name: string) {
  const value = process.env[name];

  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value.trim();
}

function optionalNumber(name: string, defaultValue: number) {
  const raw = process.env[name];
  if (!raw) {
    return defaultValue;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : defaultValue;
}

function optionalBoolean(name: string, defaultValue = false) {
  const raw = process.env[name];
  if (!raw) {
    return defaultValue;
  }

  return raw === "1" || raw.toLowerCase() === "true" || raw.toLowerCase() === "yes";
}

function adapterTypeFromEnv(value: string | undefined): GatewayAdapterType {
  if (value === "snapshot-file" || value === "bacnet-bridge") {
    return value;
  }

  return "simulated";
}

class GatewayAgent {
  private readonly config: AgentConfig;
  private readonly adapter;
  private heartbeatTimer?: ReturnType<typeof setInterval>;
  private pollTimer?: ReturnType<typeof setTimeout>;
  private stopped = false;
  private discoveryPublished = false;

  constructor(config: AgentConfig) {
    this.config = config;
    this.adapter = createGatewayAdapter(this.config.adapterType, {
      discoveryFile: this.config.discoveryFile,
      telemetryFile: this.config.telemetryFile,
      bridgeBaseUrl: this.config.bridgeBaseUrl,
      bridgeApiKey: this.config.bridgeApiKey,
      bridgeApiKeyHeader: this.config.bridgeApiKeyHeader,
      bridgeDiscoveryPath: this.config.bridgeDiscoveryPath,
      bridgeTelemetryPath: this.config.bridgeTelemetryPath,
      bridgeCommandPath: this.config.bridgeCommandPath
    });
  }

  async start() {
    const runtime = await this.getRuntime();
    console.log(
      `Gateway agent connected to ${this.config.apiBaseUrl} for gateway ${runtime.gatewayId} (${runtime.name}) in ${defaultAppEnv.environment}.`
    );
    console.log(`Gateway adapter: ${this.adapter.type}`);

    await this.sendHeartbeat("healthy");
    if (!this.config.disableDiscovery) {
      await this.publishDiscovery();
    }

    this.heartbeatTimer = setInterval(() => {
      void this.sendHeartbeat("healthy").catch((error) => {
        console.error("Gateway heartbeat failed:", error);
      });
    }, this.config.heartbeatIntervalMs);

    const initialDelay = nextDelayMs(runtime.nextPollDueAt, this.config.defaultPollIntervalMs);
    this.schedulePoll(initialDelay);
  }

  stop() {
    this.stopped = true;
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
    }
  }

  private async request<T>(path: string, init?: RequestInit) {
    const response = await fetch(`${this.config.apiBaseUrl}${path}`, {
      ...init,
      headers: {
        "content-type": "application/json",
        "x-airwise-gateway-token": this.config.gatewayToken,
        ...(init?.headers ?? {})
      }
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Gateway request failed ${response.status} ${response.statusText}: ${text}`);
    }

    return (await response.json()) as T;
  }

  private async getRuntime() {
    return this.request<GatewayRuntimeResponse>(`/api/gateways/${this.config.gatewayId}/runtime`);
  }

  private async sendHeartbeat(status: string) {
    const metadata = this.adapter.getMetadata();

    return this.request(`/api/gateways/${this.config.gatewayId}/runtime/heartbeat`, {
      method: "POST",
      body: JSON.stringify({
        observedAt: new Date().toISOString(),
        status,
        agentVersion: this.config.agentVersion,
        queueDepth: 0,
        telemetryLagSeconds: 0,
        metadata: {
          discoveryPublished: this.discoveryPublished,
          ...metadata
        }
      })
    });
  }

  private async publishDiscovery() {
    const observedAt = new Date().toISOString();
    const snapshot = await this.adapter.getDiscoverySnapshot();
    const result = await this.request<{ pointCount?: number }>(`/api/gateways/${this.config.gatewayId}/runtime/discovery`, {
      method: "POST",
      body: JSON.stringify({
        observedAt,
        assets: snapshot.assets
      })
    });
    this.discoveryPublished = true;
    console.log(`Published discovery snapshot at ${observedAt}.`);
    return result.pointCount ?? 0;
  }

  private async publishTelemetry() {
    if (this.config.disableTelemetry) {
      return { acceptedCount: 0, ignoredCount: 0 };
    }

    const observedAt = new Date().toISOString();
    const events = await this.adapter.collectTelemetry();

    return this.request<{ acceptedCount: number; ignoredCount: number }>(
      `/api/gateways/${this.config.gatewayId}/runtime/telemetry`,
      {
        method: "POST",
        body: JSON.stringify({
          observedAt,
          events
        })
      }
    );
  }

  private async acknowledgeDispatch(dispatchId: string, result: Awaited<ReturnType<typeof this.adapter.applyCommand>>) {
    return this.request(`/api/gateways/${this.config.gatewayId}/runtime/commands/${dispatchId}/ack`, {
      method: "POST",
      body: JSON.stringify({
        success: result.success,
        appliedValue: result.success ? result.appliedValue : undefined,
        errorMessage: result.success ? undefined : result.errorMessage,
        responseJson:
          result.responseJson ??
          JSON.stringify({
            adapterType: this.adapter.type,
            appliedValue: result.success ? result.appliedValue ?? null : null
          })
      })
    });
  }

  private async handleDispatches(dispatches: GatewayDispatchRecord[]) {
    for (const dispatch of dispatches) {
      try {
        const result = await this.adapter.applyCommand(dispatch);
        await this.acknowledgeDispatch(dispatch.id, result);
        if (result.success) {
          console.log(`Acknowledged dispatch ${dispatch.id} with value ${result.appliedValue ?? "unknown"}.`);
        } else {
          console.error(`Dispatch ${dispatch.id} failed: ${result.errorMessage}`);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await this.acknowledgeDispatch(dispatch.id, {
          success: false,
          errorMessage: message
        });
        console.error(`Dispatch ${dispatch.id} failed:`, message);
      }
    }
  }

  private schedulePoll(delayMs: number) {
    if (this.stopped) {
      return;
    }

    this.pollTimer = setTimeout(() => {
      void this.runPollCycle();
    }, delayMs);
  }

  private async runPollCycle() {
    if (this.stopped) {
      return;
    }

    try {
      const observedAt = new Date().toISOString();
      const poll = await this.request<GatewayPollResponse>(`/api/gateways/${this.config.gatewayId}/runtime/poll`, {
        method: "POST",
        body: JSON.stringify({
          observedAt,
          reason: "scheduled",
          includeCommands: true
        })
      });

      let discoveryAssetCount = 0;
      if (!this.config.disableDiscovery && (poll.shouldPollDiscovery || !this.discoveryPublished)) {
        const snapshot = await this.adapter.getDiscoverySnapshot();
        await this.publishDiscovery();
        discoveryAssetCount = snapshot.assets.length;
      }

      const telemetry = poll.shouldPollTelemetry ? await this.publishTelemetry() : { acceptedCount: 0, ignoredCount: 0 };
      await this.handleDispatches(poll.commands);

      const completed = await this.request<GatewayRuntimeResponse>(
        `/api/gateways/${this.config.gatewayId}/runtime/poll/complete`,
        {
          method: "POST",
          body: JSON.stringify({
            observedAt: new Date().toISOString(),
            telemetryAcceptedCount: telemetry.acceptedCount,
            telemetryIgnoredCount: telemetry.ignoredCount,
            discoveryAssetCount,
            notes: `Processed ${poll.commands.length} command dispatch(es) via ${this.adapter.type}.`
          })
        }
      );

      const nextDelay = nextDelayMs(completed.nextPollDueAt, this.config.defaultPollIntervalMs);
      this.schedulePoll(nextDelay);
    } catch (error) {
      console.error("Gateway poll cycle failed:", error);
      await delay(250);
      this.schedulePoll(this.config.defaultPollIntervalMs);
    }
  }
}

const config: AgentConfig = {
  apiBaseUrl: (process.env.AIRWISE_GATEWAY_API_BASE_URL ?? `http://localhost:${defaultAppEnv.apiPort}`).replace(/\/$/, ""),
  gatewayId: requireEnv("AIRWISE_GATEWAY_ID"),
  gatewayToken: requireEnv("AIRWISE_GATEWAY_TOKEN"),
  agentVersion: process.env.AIRWISE_GATEWAY_AGENT_VERSION?.trim() || "local-gateway-agent/0.1.0",
  heartbeatIntervalMs: optionalNumber("AIRWISE_GATEWAY_HEARTBEAT_INTERVAL_MS", 30_000),
  defaultPollIntervalMs: optionalNumber("AIRWISE_GATEWAY_DEFAULT_POLL_INTERVAL_MS", 60_000),
  disableDiscovery: optionalBoolean("AIRWISE_GATEWAY_DISABLE_DISCOVERY", false),
  disableTelemetry: optionalBoolean("AIRWISE_GATEWAY_DISABLE_TELEMETRY", false),
  adapterType: adapterTypeFromEnv(process.env.AIRWISE_GATEWAY_ADAPTER),
  discoveryFile: process.env.AIRWISE_GATEWAY_DISCOVERY_FILE?.trim() || undefined,
  telemetryFile: process.env.AIRWISE_GATEWAY_TELEMETRY_FILE?.trim() || undefined,
  bridgeBaseUrl: process.env.AIRWISE_GATEWAY_BRIDGE_BASE_URL?.trim() || undefined,
  bridgeApiKey: process.env.AIRWISE_GATEWAY_BRIDGE_API_KEY?.trim() || undefined,
  bridgeApiKeyHeader: process.env.AIRWISE_GATEWAY_BRIDGE_API_KEY_HEADER?.trim() || undefined,
  bridgeDiscoveryPath: process.env.AIRWISE_GATEWAY_BRIDGE_DISCOVERY_PATH?.trim() || undefined,
  bridgeTelemetryPath: process.env.AIRWISE_GATEWAY_BRIDGE_TELEMETRY_PATH?.trim() || undefined,
  bridgeCommandPath: process.env.AIRWISE_GATEWAY_BRIDGE_COMMAND_PATH?.trim() || undefined
};

const agent = new GatewayAgent(config);

process.on("SIGINT", () => {
  agent.stop();
  process.exit(0);
});

process.on("SIGTERM", () => {
  agent.stop();
  process.exit(0);
});

await agent.start();
