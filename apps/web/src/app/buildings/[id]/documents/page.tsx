import { notFound } from "next/navigation";
import { Panel } from "@airwise/ui";
import { BuildingNav } from "../../../../components/building-nav";
import { PageShell } from "../../../../components/page-shell";
import { attachEvidenceAction, uploadDocumentAction } from "../../../actions";
import { getBuildingDocumentsWorkspace, getBuildingWorkspace } from "../../../../lib/server-data";

export const dynamic = "force-dynamic";

export default async function DocumentsPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [building, workspace] = await Promise.all([
    getBuildingWorkspace(id).catch(() => null),
    getBuildingDocumentsWorkspace(id).catch(() => null)
  ]);

  if (!building || !workspace) {
    notFound();
  }

  const { documents, requirements, evidenceLinks, auditEvents } = workspace;

  return (
    <PageShell eyebrow="Documents" title={`Evidence workspace for ${building.name}`}>
      <BuildingNav buildingId={building.id} />

      <div className="grid two">
        <Panel title="Uploaded documents">
          {documents.length === 0 ? (
            <p className="muted">No documents attached yet.</p>
          ) : (
            <div className="grid" style={{ gap: 12 }}>
              {documents.map((document) => (
                <div
                  key={document.id}
                  style={{
                    border: "1px solid rgba(22, 50, 39, 0.12)",
                    borderRadius: 14,
                    padding: 14
                  }}
                >
                  <strong>{document.documentType}</strong>
                  <p className="muted" style={{ marginBottom: 6 }}>
                    {document.fileUrl}
                  </p>
                  <p style={{ margin: 0 }}>
                    Status: {document.status} · Confidence {document.classificationConfidence ?? "n/a"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Attach document metadata">
          <form action={uploadDocumentAction} style={{ display: "grid", gap: 10 }}>
            <input type="hidden" name="buildingId" value={building.id} />
            <input name="documentType" placeholder="Document type" required />
            <input name="fileUrl" placeholder="File URL or local reference" />
            <button type="submit">Attach document</button>
          </form>
        </Panel>
      </div>

      <div className="grid two">
        <Panel title="Bind evidence to requirements">
          {documents.length === 0 || requirements.length === 0 ? (
            <p className="muted">Upload at least one document and generate requirements before linking evidence.</p>
          ) : (
            <form action={attachEvidenceAction} style={{ display: "grid", gap: 10 }}>
              <input type="hidden" name="buildingId" value={building.id} />
              <label>
                Document
                <select name="documentId" defaultValue={documents[0]?.id} required>
                  {documents.map((document) => (
                    <option key={document.id} value={document.id}>
                      {document.documentType} ({document.status})
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Requirement
                <select name="requirementId" defaultValue={requirements[0]?.id} required>
                  {requirements.map((requirement) => (
                    <option key={requirement.id} value={requirement.id}>
                      {requirement.type} ({requirement.requiredRole})
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Review outcome
                <select name="linkStatus" defaultValue="pending_review">
                  <option value="pending_review">Pending review</option>
                  <option value="accepted">Accepted</option>
                  <option value="rejected">Rejected</option>
                </select>
              </label>
              <input name="notes" placeholder="Notes (optional)" />
              <button type="submit">Attach evidence</button>
            </form>
          )}
        </Panel>

        <Panel title="Requirement evidence status">
          {requirements.length === 0 ? (
            <p className="muted">No compliance requirements exist for this building yet.</p>
          ) : (
            <div className="grid" style={{ gap: 12 }}>
              {requirements.map((requirement) => (
                <div
                  key={requirement.id}
                  style={{
                    border: "1px solid rgba(22, 50, 39, 0.12)",
                    borderRadius: 14,
                    padding: 14
                  }}
                >
                  <strong>{requirement.type}</strong>
                  <p className="muted" style={{ marginBottom: 6 }}>
                    Status: {requirement.status} · Evidence: {requirement.evidenceState ?? "missing"}
                  </p>
                  <p style={{ margin: 0 }}>
                    Accepted {requirement.acceptedEvidenceCount ?? 0} · Pending {requirement.pendingEvidenceCount ?? 0}
                    {" · "}Rejected {requirement.rejectedEvidenceCount ?? 0}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      <div className="grid two">
        <Panel title="Evidence links">
          {evidenceLinks.length === 0 ? (
            <p className="muted">No requirement links yet.</p>
          ) : (
            <div className="grid" style={{ gap: 12 }}>
              {evidenceLinks.map((link) => (
                <div
                  key={link.id}
                  style={{
                    border: "1px solid rgba(22, 50, 39, 0.12)",
                    borderRadius: 14,
                    padding: 14
                  }}
                >
                  <strong>{link.documentType}</strong>
                  <p className="muted" style={{ marginBottom: 6 }}>
                    {link.requirementType}
                  </p>
                  <p style={{ margin: 0 }}>
                    Link status: {link.linkStatus}
                    {link.notes ? ` · ${link.notes}` : ""}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Audit trail">
          {auditEvents.length === 0 ? (
            <p className="muted">No audit events yet.</p>
          ) : (
            <div className="grid" style={{ gap: 12 }}>
              {auditEvents.map((event) => (
                <div
                  key={event.id}
                  style={{
                    borderBottom: "1px solid rgba(22, 50, 39, 0.12)",
                    paddingBottom: 12
                  }}
                >
                  <strong>{event.summary}</strong>
                  <p className="muted" style={{ marginBottom: 0 }}>
                    {event.action} · {event.actorType} · {event.createdAt}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </PageShell>
  );
}
