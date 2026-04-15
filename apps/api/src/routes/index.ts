import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  autoMatchPublicBuildingRecord,
  getPublicSourceWorkspaceByBuildingId,
  importPublicBuildingRecords,
  listBasPointsByBuildingId,
  listControlCommands,
  listTelemetryEventsByBuildingId,
  updateBasPointMapping
} from "@airwise/database";
import { createPortfolio, importBuildings, listPortfolios } from "../modules/portfolios/portfolio.service.js";
import { getBuildingById } from "../modules/buildings/building.service.js";
import { resolveCoverage } from "../modules/coverage/coverage.service.js";
import { generateRequirements, getComplianceSummary } from "../modules/compliance/compliance.service.js";
import { getDocumentWorkspace, linkDocumentEvidence, uploadDocument } from "../modules/documents/document.service.js";
import {
  acknowledgeGatewayCommandDispatch,
  completeGatewayPollCycle,
  getBacnetGateway,
  getMonitoringIssues,
  heartbeatGatewayRuntime,
  ingestBacnetGatewayDiscoverySnapshot,
  ingestBacnetGatewayTelemetry,
  ingestSensorReading,
  listBacnetGateways,
  listPendingGatewayCommandDispatches,
  processPendingGatewayCommandDispatches,
  refreshGatewayRuntimeHealth,
  registerBacnetGateway,
  startGatewayPollCycle,
  startDiscoveryRun
} from "../modules/monitoring/monitoring.service.js";
import { createCommand, approveCommand } from "../modules/commands/command.service.js";
import {
  createRecommendationActionRecord,
  getRecommendations,
  updateRecommendationActionRecord
} from "../modules/recommendations/recommendation.service.js";

export async function registerRoutes(app: FastifyInstance) {
  function requireGatewayTokenHeader(request: { headers: Record<string, unknown> }) {
    const token = request.headers["x-airwise-gateway-token"];

    if (typeof token !== "string" || token.trim().length === 0) {
      throw new Error("Missing x-airwise-gateway-token header.");
    }

    return token.trim();
  }

  app.get("/health", async () => ({ status: "ok", app: "airwise-api" }));

  app.get("/api/portfolios", async () => {
    return {
      items: listPortfolios()
    };
  });

  app.post("/api/portfolios", async (request) => {
    const body = z.object({ name: z.string().min(1) }).parse(request.body);
    return createPortfolio(body.name);
  });

  app.post("/api/portfolios/:id/buildings/import", async (request) => {
    const params = z.object({ id: z.string() }).parse(request.params);
    const body = z.object({ rows: z.array(z.record(z.unknown())) }).parse(request.body);
    return importBuildings(params.id, body.rows);
  });

  app.post("/api/public-building-records/import", async (request) => {
    const body = z
      .object({
        datasetName: z.string(),
        sourceVersion: z.string().optional(),
        rows: z.array(
          z.object({
            addressLine1: z.string(),
            city: z.string().optional(),
            state: z.string().optional(),
            zip: z.string().optional(),
            bbl: z.string().optional(),
            bin: z.string().optional(),
            coveredStatus: z.string().optional(),
            compliancePathway: z.string().optional(),
            article: z.string().optional(),
            grossSquareFeet: z.number().optional(),
            sourceRowJson: z.string().optional()
          })
        )
      })
      .parse(request.body);

    return importPublicBuildingRecords(body);
  });

  app.get("/api/buildings/:id", async (request) => {
    const params = z.object({ id: z.string() }).parse(request.params);
    return getBuildingById(params.id);
  });

  app.get("/api/buildings/:id/public-sources", async (request) => {
    const params = z.object({ id: z.string() }).parse(request.params);
    return getPublicSourceWorkspaceByBuildingId(params.id);
  });

  app.post("/api/buildings/:id/public-sources/auto-match", async (request, reply) => {
    const params = z.object({ id: z.string() }).parse(request.params);
    const match = autoMatchPublicBuildingRecord(params.id);

    if (!match) {
      return reply.code(404).send({ error: "No public candidate found for building" });
    }

    return match;
  });

  app.post("/api/buildings/:id/coverage/resolve", async (request) => {
    const params = z.object({ id: z.string() }).parse(request.params);
    return resolveCoverage(params.id);
  });

  app.post("/api/buildings/:id/compliance/requirements/generate", async (request) => {
    const params = z.object({ id: z.string() }).parse(request.params);
    const body = z.object({ reportingYear: z.number().default(2026) }).parse(request.body ?? {});
    return generateRequirements(params.id, body.reportingYear);
  });

  app.get("/api/buildings/:id/compliance", async (request) => {
    const params = z.object({ id: z.string() }).parse(request.params);
    return getComplianceSummary(params.id);
  });

  app.get("/api/buildings/:id/documents", async (request) => {
    const params = z.object({ id: z.string() }).parse(request.params);
    return getDocumentWorkspace(params.id);
  });

  app.post("/api/buildings/:id/documents", async (request) => {
    const params = z.object({ id: z.string() }).parse(request.params);
    const body = z.object({ documentType: z.string(), fileUrl: z.string().optional() }).parse(request.body);
    return uploadDocument(params.id, body.documentType, body.fileUrl);
  });

  app.post("/api/buildings/:id/evidence-links", async (request, reply) => {
    const params = z.object({ id: z.string() }).parse(request.params);
    const body = z
      .object({
        documentId: z.string(),
        requirementId: z.string(),
        linkStatus: z.enum(["pending_review", "accepted", "rejected"]),
        notes: z.string().optional()
      })
      .parse(request.body);

    const result = linkDocumentEvidence(body);

    if (result.buildingId !== params.id) {
      return reply.code(400).send({ error: "Requirement does not belong to the requested building" });
    }

    return result;
  });

  app.post("/api/telemetry/sensor", async (request) => {
    const body = z.record(z.unknown()).parse(request.body);
    return ingestSensorReading(body);
  });

  app.post("/api/bas/discovery-runs", async (request) => {
    const body = z.object({ buildingId: z.string() }).parse(request.body);
    return startDiscoveryRun(body.buildingId);
  });

  app.get("/api/buildings/:id/gateways", async (request) => {
    const params = z.object({ id: z.string() }).parse(request.params);
    return {
      items: listBacnetGateways(params.id)
    };
  });

  app.post("/api/buildings/:id/gateways", async (request) => {
    const params = z.object({ id: z.string() }).parse(request.params);
    const body = z
      .object({
        name: z.string(),
        protocol: z.string().optional(),
        vendor: z.string().optional(),
        host: z.string().optional(),
        port: z.number().optional(),
        authType: z.string().optional(),
        runtimeMode: z.string().optional(),
        commandEndpoint: z.string().optional(),
        pollIntervalSeconds: z.number().optional(),
        metadataJson: z.string().optional()
      })
      .parse(request.body);

    return registerBacnetGateway({
      buildingId: params.id,
      ...body
    });
  });

  app.post("/api/buildings/:id/gateway-discovery", async (request) => {
    const params = z.object({ id: z.string() }).parse(request.params);
    const body = z
      .object({
        gatewayId: z.string().optional(),
        gateway: z
          .object({
            name: z.string().optional(),
            protocol: z.string().optional(),
            vendor: z.string().optional(),
            host: z.string().optional(),
            port: z.number().optional(),
            authType: z.string().optional(),
            metadataJson: z.string().optional()
          })
          .optional(),
        observedAt: z.string().optional(),
        assets: z.array(
          z.object({
            assetKey: z.string().optional(),
            systemName: z.string(),
            assetType: z.string().optional(),
            protocol: z.string().optional(),
            vendor: z.string().optional(),
            location: z.string().optional(),
            status: z.string().optional(),
            metadata: z.record(z.unknown()).optional(),
            points: z.array(
              z.object({
                pointKey: z.string().optional(),
                objectIdentifier: z.string(),
                objectName: z.string(),
                canonicalPointType: z.string().optional(),
                unit: z.string().optional(),
                isWritable: z.boolean().optional(),
                isWhitelisted: z.boolean().optional(),
                safetyCategory: z.string().optional(),
                presentValue: z.union([z.number(), z.string()]).optional(),
                qualityFlag: z.string().optional(),
                metadata: z.record(z.unknown()).optional()
              })
            )
          })
        )
      })
      .parse(request.body);

    return ingestBacnetGatewayDiscoverySnapshot({
      buildingId: params.id,
      ...body
    });
  });

  app.get("/api/gateways/:id/runtime", async (request, reply) => {
    const params = z.object({ id: z.string() }).parse(request.params);
    const token = requireGatewayTokenHeader(request);
    const gateway = getBacnetGateway(params.id);

    if (!gateway) {
      return reply.code(404).send({ error: "Gateway not found" });
    }

    if (gateway.ingestToken !== token) {
      return reply.code(401).send({ error: "Invalid gateway token" });
    }

    return {
      gatewayId: gateway.id,
      buildingId: gateway.buildingId,
      name: gateway.name,
      runtimeMode: gateway.runtimeMode,
      commandEndpoint: gateway.commandEndpoint,
      protocol: gateway.protocol,
      heartbeatStatus: gateway.heartbeatStatus,
      pollIntervalSeconds: gateway.pollIntervalSeconds,
      lastHeartbeatAt: gateway.lastHeartbeatAt,
      lastPollRequestedAt: gateway.lastPollRequestedAt,
      lastPollCompletedAt: gateway.lastPollCompletedAt,
      nextPollDueAt: gateway.nextPollDueAt,
      agentVersion: gateway.agentVersion
    };
  });

  app.post("/api/gateways/:id/runtime/heartbeat", async (request) => {
    const params = z.object({ id: z.string() }).parse(request.params);
    const token = requireGatewayTokenHeader(request);
    const body = z
      .object({
        observedAt: z.string().optional(),
        agentVersion: z.string().optional(),
        status: z.string().optional(),
        queueDepth: z.number().optional(),
        telemetryLagSeconds: z.number().optional(),
        metadata: z.record(z.unknown()).optional()
      })
      .parse(request.body);

    return heartbeatGatewayRuntime({
      gatewayId: params.id,
      token,
      observedAt: body.observedAt,
      agentVersion: body.agentVersion,
      status: body.status,
      queueDepth: body.queueDepth,
      telemetryLagSeconds: body.telemetryLagSeconds,
      metadata: body.metadata
    });
  });

  app.post("/api/gateways/:id/runtime/discovery", async (request, reply) => {
    const params = z.object({ id: z.string() }).parse(request.params);
    const token = requireGatewayTokenHeader(request);
    const body = z
      .object({
        observedAt: z.string().optional(),
        assets: z.array(
          z.object({
            assetKey: z.string().optional(),
            systemName: z.string(),
            assetType: z.string().optional(),
            protocol: z.string().optional(),
            vendor: z.string().optional(),
            location: z.string().optional(),
            status: z.string().optional(),
            metadata: z.record(z.unknown()).optional(),
            points: z.array(
              z.object({
                pointKey: z.string().optional(),
                objectIdentifier: z.string(),
                objectName: z.string(),
                canonicalPointType: z.string().optional(),
                unit: z.string().optional(),
                isWritable: z.boolean().optional(),
                isWhitelisted: z.boolean().optional(),
                safetyCategory: z.string().optional(),
                presentValue: z.union([z.number(), z.string()]).optional(),
                qualityFlag: z.string().optional(),
                metadata: z.record(z.unknown()).optional()
              })
            )
          })
        )
      })
      .parse(request.body);
    const gateway = getBacnetGateway(params.id);

    if (!gateway) {
      return reply.code(404).send({ error: "Gateway not found" });
    }

    if (gateway.ingestToken !== token) {
      return reply.code(401).send({ error: "Invalid gateway token" });
    }

    return ingestBacnetGatewayDiscoverySnapshot({
      buildingId: gateway.buildingId,
      gatewayId: params.id,
      observedAt: body.observedAt,
      assets: body.assets
    });
  });

  app.post("/api/gateways/:id/runtime/telemetry", async (request) => {
    const params = z.object({ id: z.string() }).parse(request.params);
    const token = requireGatewayTokenHeader(request);
    const body = z
      .object({
        observedAt: z.string().optional(),
        events: z.array(
          z.object({
            assetKey: z.string().optional(),
            pointKey: z.string().optional(),
            objectIdentifier: z.string().optional(),
            value: z.union([z.number(), z.string()]),
            unit: z.string().optional(),
            qualityFlag: z.string().optional()
          })
        )
      })
      .parse(request.body);

    return ingestBacnetGatewayTelemetry({
      gatewayId: params.id,
      token,
      observedAt: body.observedAt,
      events: body.events
    });
  });

  app.post("/api/gateways/:id/runtime/poll", async (request) => {
    const params = z.object({ id: z.string() }).parse(request.params);
    const token = requireGatewayTokenHeader(request);
    const body = z
      .object({
        observedAt: z.string().optional(),
        reason: z.string().optional(),
        includeCommands: z.boolean().optional()
      })
      .parse(request.body);

    return startGatewayPollCycle({
      gatewayId: params.id,
      token,
      observedAt: body.observedAt,
      reason: body.reason,
      includeCommands: body.includeCommands
    });
  });

  app.post("/api/gateways/:id/runtime/poll/complete", async (request) => {
    const params = z.object({ id: z.string() }).parse(request.params);
    const token = requireGatewayTokenHeader(request);
    const body = z
      .object({
        observedAt: z.string().optional(),
        telemetryAcceptedCount: z.number().optional(),
        telemetryIgnoredCount: z.number().optional(),
        discoveryAssetCount: z.number().optional(),
        notes: z.string().optional()
      })
      .parse(request.body);

    return completeGatewayPollCycle({
      gatewayId: params.id,
      token,
      observedAt: body.observedAt,
      telemetryAcceptedCount: body.telemetryAcceptedCount,
      telemetryIgnoredCount: body.telemetryIgnoredCount,
      discoveryAssetCount: body.discoveryAssetCount,
      notes: body.notes
    });
  });

  app.get("/api/gateways/:id/runtime/commands", async (request) => {
    const params = z.object({ id: z.string() }).parse(request.params);
    const token = requireGatewayTokenHeader(request);

    return {
      items: listPendingGatewayCommandDispatches({
        gatewayId: params.id,
        token
      })
    };
  });

  app.post("/api/gateways/:id/runtime/commands/dispatch", async (request, reply) => {
    const params = z.object({ id: z.string() }).parse(request.params);
    const token = requireGatewayTokenHeader(request);
    const gateway = getBacnetGateway(params.id);

    if (!gateway) {
      return reply.code(404).send({ error: "Gateway not found" });
    }

    if (gateway.ingestToken !== token) {
      return reply.code(401).send({ error: "Invalid gateway token" });
    }

    return processPendingGatewayCommandDispatches(params.id);
  });

  app.post("/api/gateways/runtime/health/refresh", async (request) => {
    const body = z.object({ referenceTime: z.string().optional() }).parse(request.body);
    return refreshGatewayRuntimeHealth(body.referenceTime);
  });

  app.post("/api/gateways/:id/runtime/commands/:dispatchId/ack", async (request) => {
    const params = z.object({ id: z.string(), dispatchId: z.string() }).parse(request.params);
    const token = requireGatewayTokenHeader(request);
    const body = z
      .object({
        success: z.boolean(),
        responseJson: z.string().optional(),
        errorMessage: z.string().optional(),
        appliedValue: z.string().optional()
      })
      .parse(request.body);

    return acknowledgeGatewayCommandDispatch({
      gatewayId: params.id,
      token,
      dispatchId: params.dispatchId,
      success: body.success,
      responseJson: body.responseJson,
      errorMessage: body.errorMessage,
      appliedValue: body.appliedValue
    });
  });

  app.get("/api/buildings/:id/monitoring/issues", async (request) => {
    const params = z.object({ id: z.string() }).parse(request.params);
    return getMonitoringIssues(params.id);
  });

  app.get("/api/buildings/:id/recommendations", async (request) => {
    const params = z.object({ id: z.string() }).parse(request.params);
    return getRecommendations(params.id);
  });

  app.get("/api/buildings/:id/bas-points", async (request) => {
    const params = z.object({ id: z.string() }).parse(request.params);
    return {
      items: listBasPointsByBuildingId(params.id)
    };
  });

  app.get("/api/buildings/:id/telemetry", async (request) => {
    const params = z.object({ id: z.string() }).parse(request.params);
    return {
      items: listTelemetryEventsByBuildingId(params.id)
    };
  });

  app.post("/api/bas-points/:id/mapping", async (request) => {
    const params = z.object({ id: z.string() }).parse(request.params);
    const body = z
      .object({
        canonicalPointType: z.string().optional(),
        isWhitelisted: z.boolean().optional(),
        safetyCategory: z.string().optional()
      })
      .parse(request.body);

    return updateBasPointMapping({
      pointId: params.id,
      canonicalPointType: body.canonicalPointType,
      isWhitelisted: body.isWhitelisted,
      safetyCategory: body.safetyCategory
    });
  });

  app.get("/api/commands", async () => {
    return {
      items: listControlCommands()
    };
  });

  app.post("/api/commands", async (request) => {
    const body = z
      .object({
        buildingId: z.string(),
        pointId: z.string(),
        commandType: z.string(),
        requestedValue: z.string(),
        expiresAt: z.string().optional()
      })
      .parse(request.body);
    return createCommand(body);
  });

  app.post("/api/recommendations/:id/actions", async (request) => {
    const params = z.object({ id: z.string() }).parse(request.params);
    const body = z
      .object({
        actionType: z.string(),
        assignee: z.string().optional(),
        notes: z.string().optional()
      })
      .parse(request.body);

    return createRecommendationActionRecord({
      recommendationId: params.id,
      actionType: body.actionType,
      assignee: body.assignee,
      notes: body.notes
    });
  });

  app.post("/api/recommendation-actions/:id/status", async (request, reply) => {
    const params = z.object({ id: z.string() }).parse(request.params);
    const body = z
      .object({
        actionStatus: z.enum(["proposed", "in_progress", "completed", "cancelled"]),
        notes: z.string().optional()
      })
      .parse(request.body);
    const action = updateRecommendationActionRecord({
      actionId: params.id,
      actionStatus: body.actionStatus,
      notes: body.notes
    });

    if (!action) {
      return reply.code(404).send({ error: "Recommendation action not found" });
    }

    return action;
  });

  app.post("/api/commands/:id/approve", async (request, reply) => {
    const params = z.object({ id: z.string() }).parse(request.params);
    const command = approveCommand(params.id);

    if (!command) {
      return reply.code(404).send({ error: "Command not found" });
    }

    return command;
  });
}
