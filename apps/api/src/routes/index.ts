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
import { getMonitoringIssues, ingestSensorReading, startDiscoveryRun } from "../modules/monitoring/monitoring.service.js";
import { createCommand, approveCommand } from "../modules/commands/command.service.js";
import {
  createRecommendationActionRecord,
  getRecommendations,
  updateRecommendationActionRecord
} from "../modules/recommendations/recommendation.service.js";

export async function registerRoutes(app: FastifyInstance) {
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
