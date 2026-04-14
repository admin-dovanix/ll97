import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { importPublicBuildingRecords } from "@airwise/database";

type CsvRow = Record<string, string>;

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

function parseCsv(content: string): CsvRow[] {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return [];
  }

  const headers = parseCsvLine(lines[0]).map((header) => header.replace(/^"|"$/g, "").trim());

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
  });
}

function pick(row: CsvRow, keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (value && value.trim().length > 0) {
      return value.trim();
    }
  }
  return undefined;
}

function toNumber(value?: string) {
  if (!value) {
    return undefined;
  }

  const numeric = Number(value.replaceAll(",", ""));
  return Number.isFinite(numeric) ? numeric : undefined;
}

const [, , csvPathArg, datasetNameArg, sourceVersionArg] = process.argv;

if (!csvPathArg) {
  console.error("Usage: tsx scripts/import/import-public-buildings.ts <csv-path> [dataset-name] [source-version]");
  process.exit(1);
}

const csvPath = resolve(process.cwd(), csvPathArg);
const csv = readFileSync(csvPath, "utf8");
const rows = parseCsv(csv);

const result = importPublicBuildingRecords({
  datasetName: datasetNameArg ?? "nyc_public_source",
  sourceVersion: sourceVersionArg,
  rows: rows.map((row) => ({
    addressLine1:
      pick(row, ["Address", "address", "address_line_1", "House Number Street Name"]) ?? "Unknown address",
    city: pick(row, ["City", "city"]),
    state: pick(row, ["State", "state"]),
    zip: pick(row, ["Zip", "ZIP", "zip"]),
    bbl: pick(row, ["BBL", "bbl"]),
    bin: pick(row, ["BIN", "bin"]),
    coveredStatus: pick(row, ["Covered Status", "covered_status"]),
    compliancePathway: pick(row, ["Compliance Pathway", "compliance_pathway", "Pathway"]),
    article: pick(row, ["Article", "article"]),
    grossSquareFeet: toNumber(pick(row, ["Gross Square Feet", "gross_sq_ft", "dof_gsf"])),
    sourceRowJson: JSON.stringify(row)
  }))
});

console.log(
  JSON.stringify(
    {
      csvPath,
      rowsRead: rows.length,
      ...result
    },
    null,
    2
  )
);
