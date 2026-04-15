import Fastify from "fastify";
import { z } from "zod";
import { createBridgeBackend, type BridgeBackendType } from "./backends/index.js";

function optionalBoolean(name: string, defaultValue = false) {
  const raw = process.env[name];
  if (!raw) {
    return defaultValue;
  }

  return raw === "1" || raw.toLowerCase() === "true" || raw.toLowerCase() === "yes";
}

function backendTypeFromEnv(value: string | undefined): BridgeBackendType {
  if (value === "file-feed" || value === "bacnet-sdk") {
    return value;
  }

  return "simulated";
}

const apiKey = process.env.AIRWISE_GATEWAY_BRIDGE_API_KEY?.trim() || undefined;
const apiKeyHeader = process.env.AIRWISE_GATEWAY_BRIDGE_API_KEY_HEADER?.trim() || "x-bridge-api-key";
const port = Number(process.env.AIRWISE_GATEWAY_BRIDGE_PORT ?? 8080);
const logCommands = optionalBoolean("AIRWISE_GATEWAY_BRIDGE_LOG_COMMANDS", true);

const backend = await createBridgeBackend(backendTypeFromEnv(process.env.AIRWISE_GATEWAY_BRIDGE_BACKEND), {
  discoveryFile: process.env.AIRWISE_GATEWAY_BRIDGE_DISCOVERY_FILE?.trim() || undefined,
  telemetryFile: process.env.AIRWISE_GATEWAY_BRIDGE_TELEMETRY_FILE?.trim() || undefined,
  sdkModulePath: process.env.AIRWISE_GATEWAY_BRIDGE_SDK_MODULE_PATH?.trim() || undefined,
  sdkExportName: process.env.AIRWISE_GATEWAY_BRIDGE_SDK_EXPORT_NAME?.trim() || undefined,
  sdkConfigJson: process.env.AIRWISE_GATEWAY_BRIDGE_SDK_CONFIG_JSON?.trim() || undefined
});

function maybeAuthorize(headers: Record<string, unknown>) {
  if (!apiKey) {
    return true;
  }

  const headerValue = headers[apiKeyHeader];
  return typeof headerValue === "string" && headerValue.trim() === apiKey;
}

const commandSchema = z.object({
  dispatchId: z.string(),
  commandId: z.string(),
  pointId: z.string(),
  command: z.object({
    assetKey: z.string().nullable().optional(),
    pointKey: z.string().nullable().optional(),
    objectIdentifier: z.string().optional(),
    requestedValue: z.string().optional()
  })
});

const app = Fastify({ logger: true });

app.addHook("onRequest", async (request, reply) => {
  if (!maybeAuthorize(request.headers)) {
    return reply.code(401).send({ error: "Invalid bridge API key" });
  }
});

app.get("/health", async () => ({
  status: "ok",
  service: "airwise-gateway-bridge",
  backend: backend.type,
  metadata: backend.getMetadata()
}));

app.get("/discovery", async () => {
  return backend.getDiscoverySnapshot();
});

app.get("/telemetry", async () => {
  return {
    events: await backend.getTelemetryEvents()
  };
});

app.post("/commands", async (request, reply) => {
  const body = commandSchema.parse(request.body);
  const result = await backend.applyCommand(body);

  if (logCommands) {
    app.log.info(
      {
        dispatchId: body.dispatchId,
        commandId: body.commandId,
        backend: backend.type,
        success: result.success
      },
      "Gateway bridge applied command"
    );
  }

  if (!result.success) {
    return reply.code(400).send(result);
  }

  return result;
});

await app.listen({
  host: "0.0.0.0",
  port
});
