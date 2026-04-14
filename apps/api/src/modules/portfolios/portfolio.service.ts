import {
  type BuildingImportRow as DatabaseBuildingImportRow,
  createPortfolio as createPortfolioRecord,
  importBuildings as importBuildingRecords,
  listPortfolios as listPortfolioRecords
} from "@airwise/database";

export function listPortfolios() {
  return listPortfolioRecords();
}

export function createPortfolio(name: string) {
  return createPortfolioRecord({ name });
}

type BuildingImportRow = Record<string, unknown>;

function coerceString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function coerceNumber(value: unknown) {
  return typeof value === "number" ? value : null;
}

function coerceArticle(row: BuildingImportRow) {
  const article = coerceString(row.article);
  return article === "320" || article === "321" ? article : null;
}

function coercePathway(row: BuildingImportRow) {
  const pathway = coerceString(row.pathway);
  return (["CP0", "CP1", "CP2", "CP3", "CP4"] as const).includes(
    pathway as "CP0" | "CP1" | "CP2" | "CP3" | "CP4"
  )
    ? (pathway as "CP0" | "CP1" | "CP2" | "CP3" | "CP4")
    : null;
}

export function importBuildings(portfolioId: string, rows: unknown[]) {
  return importBuildingRecords(
    portfolioId,
    rows.map((rawRow): DatabaseBuildingImportRow => {
      const row = rawRow as BuildingImportRow;

      return {
        name: coerceString(row.name) || coerceString(row.address_line_1) || undefined,
        addressLine1: coerceString(row.address_line_1) || undefined,
        city: coerceString(row.city) || undefined,
        state: coerceString(row.state) || undefined,
        zip: coerceString(row.zip) || undefined,
        bbl: coerceString(row.bbl) || undefined,
        bin: coerceString(row.bin) || undefined,
        dofGsf: coerceNumber(row.dof_gsf) ?? undefined,
        reportedGfa: coerceNumber(row.reported_gfa) ?? undefined,
        article: coerceArticle(row) ?? undefined,
        pathway: coercePathway(row) ?? undefined
      };
    })
  );
}
