import { readdirSync, readFileSync, statSync } from "node:fs";
import { basename, extname, resolve } from "node:path";
import {
  autoMatchPublicBuildingRecordsForAllBuildings,
  generateRequirementsForAllBuildings,
  importPublicBuildingRecords,
  listPublicImportRuns,
  refreshCoverageForAllBuildings
} from "@airwise/database";

type ImportRowInput = Parameters<typeof importPublicBuildingRecords>[0]["rows"][number];

type ParsedRow = {
  raw: Record<string, string>;
  normalized: Record<string, string>;
};

type DatasetContext = {
  filePath: string;
  headers: string[];
};

type DatasetProfile = {
  name: string;
  aliases: string[];
  detect: (context: DatasetContext) => boolean;
  mapRow: (row: ParsedRow, rowIndex: number, context: DatasetContext) => ImportRowInput | null;
};

type CliOptions = {
  inputPath: string;
  datasetName?: string;
  sourceVersion?: string;
  autoMatch: boolean;
  refreshCoverage: boolean;
  generateRequirements: boolean;
  recursive: boolean;
  reportLimit: number;
};

const SUPPORTED_EXTENSIONS = new Set([".csv", ".tsv", ".txt"]);

function printUsage() {
  console.error(`Usage:
  npm run import:public -- /absolute/path/to/file-or-directory [dataset-name] [source-version]

Options:
  --input, -i <path>               File or directory to import
  --dataset, -d <name>             Dataset name or alias (for example dob_covered_buildings)
  --source-version, -s <version>   Source version label such as 2026 or 2026-04-14
  --auto-match                     Auto-match imported public records to buildings
  --refresh-coverage               Recompute coverage after import
  --generate-requirements          Regenerate requirements after import
  --recursive                      Recurse into subdirectories when input is a directory
  --report-limit <count>           Number of recent import runs to include in the summary (default: 5)
  --help                           Show this message
`);
}

function normalizeHeaderName(value: string) {
  return value
    .replace(/^\uFEFF/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normalizeDigits(value?: string | null) {
  const normalized = value?.replace(/\D/g, "") ?? "";
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeTextToken(value?: string | null) {
  return value
    ?.toUpperCase()
    .replace(/[^A-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizePathway(value?: string | null) {
  const match = value?.toUpperCase().match(/CP\s*([0-4])/);
  return match ? (`CP${match[1]}` as const) : undefined;
}

function normalizeArticle(value?: string | null, pathway?: string) {
  const digits = normalizeDigits(value);
  if (digits === "320" || digits === "321") {
    return digits;
  }

  if (pathway === "CP3") {
    return "321";
  }

  if (pathway === "CP0" || pathway === "CP1" || pathway === "CP2") {
    return "320";
  }

  return undefined;
}

function normalizeCoveredStatus(value?: string | null, pathway?: string, article?: string) {
  const normalized = value?.trim().toLowerCase();

  if (!normalized) {
    return pathway || article ? "covered" : undefined;
  }

  if (["covered", "yes", "y", "true", "1"].includes(normalized)) {
    return "covered";
  }

  if (["not covered", "not_covered", "no", "n", "false", "0"].includes(normalized)) {
    return "not_covered";
  }

  return normalized;
}

function normalizeNumber(value?: string | null) {
  if (!value) {
    return undefined;
  }

  const numeric = Number(value.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(numeric) ? numeric : undefined;
}

function normalizeAddressKey(input: {
  addressLine1?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
}) {
  const address = normalizeTextToken(input.addressLine1);
  const city = normalizeTextToken(input.city);
  const state = normalizeTextToken(input.state);
  const zip = normalizeDigits(input.zip);

  return [address, city, state, zip].filter((part) => part && part.length > 0).join("|") || undefined;
}

function pick(row: ParsedRow, aliases: string[]) {
  for (const alias of aliases) {
    const normalizedAlias = normalizeHeaderName(alias);
    const value = row.normalized[normalizedAlias];
    if (value && value.trim().length > 0) {
      return value.trim();
    }
  }

  return undefined;
}

function boroughToCode(value?: string) {
  const normalized = value?.trim().toUpperCase();

  switch (normalized) {
    case "1":
    case "MN":
    case "MAN":
    case "MANHATTAN":
      return "1";
    case "2":
    case "BX":
    case "BRONX":
      return "2";
    case "3":
    case "BK":
    case "K":
    case "BROOKLYN":
      return "3";
    case "4":
    case "QN":
    case "Q":
    case "QUEENS":
      return "4";
    case "5":
    case "SI":
    case "R":
    case "STATEN ISLAND":
      return "5";
    default:
      return undefined;
  }
}

function boroughToName(value?: string) {
  const code = boroughToCode(value);

  switch (code) {
    case "1":
      return "Manhattan";
    case "2":
      return "Bronx";
    case "3":
      return "Brooklyn";
    case "4":
      return "Queens";
    case "5":
      return "Staten Island";
    default:
      return value?.trim() || undefined;
  }
}

function buildBbl(row: ParsedRow) {
  const direct = normalizeDigits(
    pick(row, ["BBL", "bbl", "borough block lot", "boro block lot", "tax lot bbl", "boro-block-lot"])
  );

  if (direct && direct.length >= 10) {
    return direct;
  }

  const boroughCode = boroughToCode(pick(row, ["Borough", "boro", "borocode", "borough code"]));
  const block = normalizeDigits(pick(row, ["Block", "tax block", "dof block"]));
  const lot = normalizeDigits(pick(row, ["Lot", "tax lot", "dof lot"]));

  if (!boroughCode || !block || !lot) {
    return direct;
  }

  return `${boroughCode}${block.padStart(5, "0")}${lot.padStart(4, "0")}`;
}

function buildAddress(row: ParsedRow) {
  const direct = pick(row, [
    "Address",
    "address",
    "Building Address",
    "House Number Street Name",
    "street address",
    "property address",
    "address line 1"
  ]);

  if (direct) {
    return direct;
  }

  const houseNumber = pick(row, ["House Number", "house number", "street number"]);
  const streetName = pick(row, ["Street Name", "street name"]);
  return [houseNumber, streetName].filter(Boolean).join(" ").trim() || undefined;
}

function deriveSourceRecordKey(row: ParsedRow, rowIndex: number, derived: {
  bbl?: string;
  bin?: string;
  pathway?: string;
  normalizedAddressKey?: string;
}) {
  const explicit = pick(row, [
    "Record ID",
    "record id",
    "OBJECTID",
    "objectid",
    "ID",
    "id",
    "Building ID",
    "building id",
    "Unique ID",
    "unique id"
  ]);

  if (explicit) {
    return explicit;
  }

  return (
    [derived.bbl, derived.bin, derived.pathway, derived.normalizedAddressKey]
      .filter((part) => part && part.length > 0)
      .join("|") || `row:${rowIndex + 2}`
  );
}

function mapCommonPublicBuildingRow(row: ParsedRow, rowIndex: number) {
  const addressLine1 = buildAddress(row);
  const borough = pick(row, ["Borough", "boro"]);
  const city = pick(row, ["City", "city"]) ?? boroughToName(borough);
  const state = pick(row, ["State", "state"]) ?? "NY";
  const zip = normalizeDigits(pick(row, ["Zip", "ZIP", "zip", "postal code", "postcode"]));
  const bbl = buildBbl(row);
  const bin = normalizeDigits(pick(row, ["BIN", "bin", "Building Identification Number"]));
  const pathway = normalizePathway(
    pick(row, ["Compliance Pathway", "Pathway", "CBL Pathway", "LL97 Pathway", "pathway"])
  );
  const article = normalizeArticle(pick(row, ["Article", "article"]), pathway);
  const coveredStatus = normalizeCoveredStatus(
    pick(row, ["Covered Status", "covered status", "Coverage Status", "status"]),
    pathway,
    article
  );
  const grossSquareFeet = normalizeNumber(
    pick(row, [
      "Gross Square Feet",
      "gross square feet",
      "gross_sq_ft",
      "DOF_GSF",
      "Building Area",
      "GSF"
    ])
  );
  const normalizedAddressKey = normalizeAddressKey({
    addressLine1,
    city,
    state,
    zip
  });

  if (!addressLine1 && !bbl && !bin) {
    return null;
  }

  return {
    addressLine1: addressLine1 ?? "Unknown address",
    city,
    state,
    zip,
    bbl,
    bin,
    coveredStatus,
    compliancePathway: pathway,
    article,
    grossSquareFeet,
    sourceRecordKey: deriveSourceRecordKey(row, rowIndex, {
      bbl,
      bin,
      pathway,
      normalizedAddressKey
    }),
    sourceRowJson: JSON.stringify(row.raw)
  } satisfies ImportRowInput;
}

const datasetProfiles: DatasetProfile[] = [
  {
    name: "dob_covered_buildings",
    aliases: ["covered_buildings", "dob_cbl", "cbl", "ll97_covered_buildings"],
    detect(context) {
      const headers = context.headers.map((header) => normalizeHeaderName(header));
      const fileName = basename(context.filePath).toLowerCase();

      return (
        fileName.includes("covered") ||
        fileName.includes("cbl") ||
        (headers.some((header) => ["compliance pathway", "covered status", "article"].includes(header)) &&
          headers.some((header) => ["bbl", "bin", "address", "house number street name"].includes(header)))
      );
    },
    mapRow(row, rowIndex) {
      return mapCommonPublicBuildingRow(row, rowIndex);
    }
  },
  {
    name: "nyc_public_source",
    aliases: ["generic", "public_source"],
    detect() {
      return true;
    },
    mapRow(row, rowIndex) {
      return mapCommonPublicBuildingRow(row, rowIndex);
    }
  }
];

function parseArgs(argv: string[]): CliOptions | null {
  const positional: string[] = [];
  const options: Partial<CliOptions> = {
    autoMatch: false,
    refreshCoverage: false,
    generateRequirements: false,
    recursive: false,
    reportLimit: 5
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--help" || arg === "-h") {
      printUsage();
      return null;
    }

    if (arg === "--input" || arg === "-i") {
      options.inputPath = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg.startsWith("--input=")) {
      options.inputPath = arg.split("=")[1];
      continue;
    }

    if (arg === "--dataset" || arg === "-d") {
      options.datasetName = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg.startsWith("--dataset=")) {
      options.datasetName = arg.split("=")[1];
      continue;
    }

    if (arg === "--source-version" || arg === "-s") {
      options.sourceVersion = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg.startsWith("--source-version=")) {
      options.sourceVersion = arg.split("=")[1];
      continue;
    }

    if (arg === "--auto-match") {
      options.autoMatch = true;
      continue;
    }

    if (arg === "--refresh-coverage") {
      options.refreshCoverage = true;
      continue;
    }

    if (arg === "--generate-requirements") {
      options.generateRequirements = true;
      continue;
    }

    if (arg === "--recursive") {
      options.recursive = true;
      continue;
    }

    if (arg === "--report-limit") {
      options.reportLimit = Number(argv[index + 1] ?? options.reportLimit);
      index += 1;
      continue;
    }

    if (arg.startsWith("--report-limit=")) {
      options.reportLimit = Number(arg.split("=")[1]);
      continue;
    }

    positional.push(arg);
  }

  if (!options.inputPath && positional[0]) {
    options.inputPath = positional[0];
  }

  if (!options.datasetName && positional[1]) {
    options.datasetName = positional[1];
  }

  if (!options.sourceVersion && positional[2]) {
    options.sourceVersion = positional[2];
  }

  if (!options.inputPath) {
    printUsage();
    return null;
  }

  return {
    inputPath: options.inputPath,
    datasetName: options.datasetName,
    sourceVersion: options.sourceVersion,
    autoMatch: Boolean(options.autoMatch),
    refreshCoverage: Boolean(options.refreshCoverage),
    generateRequirements: Boolean(options.generateRequirements),
    recursive: Boolean(options.recursive),
    reportLimit:
      Number.isFinite(options.reportLimit) && Number(options.reportLimit) > 0
        ? Number(options.reportLimit)
        : 5
  };
}

function collectInputFiles(inputPath: string, recursive: boolean): string[] {
  const resolvedPath = resolve(process.cwd(), inputPath);
  const stat = statSync(resolvedPath);

  if (stat.isFile()) {
    return [resolvedPath];
  }

  if (!stat.isDirectory()) {
    throw new Error(`Unsupported input path: ${resolvedPath}`);
  }

  const filePaths: string[] = [];

  for (const entry of readdirSync(resolvedPath, { withFileTypes: true })) {
    const childPath = resolve(resolvedPath, entry.name);

    if (entry.isDirectory()) {
      if (recursive) {
        filePaths.push(...collectInputFiles(childPath, true));
      }
      continue;
    }

    if (SUPPORTED_EXTENSIONS.has(extname(entry.name).toLowerCase())) {
      filePaths.push(childPath);
    }
  }

  return filePaths.sort((left, right) => left.localeCompare(right));
}

function detectDelimiter(content: string) {
  const firstNonEmptyLine = content.split(/\r?\n/).find((line) => line.trim().length > 0) ?? "";
  const tabCount = (firstNonEmptyLine.match(/\t/g) ?? []).length;
  const commaCount = (firstNonEmptyLine.match(/,/g) ?? []).length;
  return tabCount > commaCount ? "\t" : ",";
}

function parseDelimited(content: string, delimiter: string): ParsedRow[] {
  const rows: string[][] = [];
  let currentCell = "";
  let currentRow: string[] = [];
  let inQuotes = false;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    const next = content[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        currentCell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && char === delimiter) {
      currentRow.push(currentCell);
      currentCell = "";
      continue;
    }

    if (!inQuotes && (char === "\n" || char === "\r")) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }

      currentRow.push(currentCell);
      currentCell = "";
      if (currentRow.some((value) => value.trim().length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      continue;
    }

    currentCell += char;
  }

  currentRow.push(currentCell);
  if (currentRow.some((value) => value.trim().length > 0)) {
    rows.push(currentRow);
  }

  if (rows.length === 0) {
    return [];
  }

  const headers = rows[0].map((value) => value.replace(/^\uFEFF/, "").trim());

  return rows.slice(1).map((cells) => {
    const raw = Object.fromEntries(headers.map((header, index) => [header, (cells[index] ?? "").trim()]));
    const normalized = Object.fromEntries(
      headers.map((header, index) => [normalizeHeaderName(header), (cells[index] ?? "").trim()])
    );

    return { raw, normalized };
  });
}

function detectSourceVersion(filePath: string) {
  const fileName = basename(filePath);
  const dateMatch = fileName.match(/(20\d{2})[-_](\d{2})[-_](\d{2})/);

  if (dateMatch) {
    return `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
  }

  const yearMatch = fileName.match(/(20\d{2})/);
  return yearMatch?.[1];
}

function resolveDatasetProfile(requestedDatasetName: string | undefined, context: DatasetContext) {
  if (requestedDatasetName) {
    const lowerRequested = requestedDatasetName.toLowerCase();
    const matchedProfile = datasetProfiles.find(
      (profile) => profile.name === lowerRequested || profile.aliases.includes(lowerRequested)
    );

    return {
      datasetName: matchedProfile?.name ?? requestedDatasetName,
      profile: matchedProfile ?? datasetProfiles[datasetProfiles.length - 1]
    };
  }

  const matchedProfile = datasetProfiles.find((profile) => profile.detect(context)) ?? datasetProfiles[datasetProfiles.length - 1];
  return {
    datasetName: matchedProfile.name,
    profile: matchedProfile
  };
}

function deriveReportingYear(sourceVersion?: string) {
  const yearMatch = sourceVersion?.match(/20\d{2}/)?.[0];
  return yearMatch ? Number(yearMatch) : new Date().getUTCFullYear();
}

const options = parseArgs(process.argv.slice(2));

if (!options) {
  process.exit(0);
}

const filePaths = collectInputFiles(options.inputPath, options.recursive);

if (filePaths.length === 0) {
  console.error(`No supported CSV/TSV files found under ${resolve(process.cwd(), options.inputPath)}.`);
  process.exit(1);
}

const fileSummaries = filePaths.map((filePath) => {
  const content = readFileSync(filePath, "utf8");
  const delimiter = detectDelimiter(content);
  const rows = parseDelimited(content, delimiter);
  const headers = rows[0] ? Object.keys(rows[0].raw) : [];
  const context = { filePath, headers };
  const { datasetName, profile } = resolveDatasetProfile(options.datasetName, context);
  const sourceVersion = options.sourceVersion ?? detectSourceVersion(filePath);
  const mappedRows = rows
    .map((row, rowIndex) => profile.mapRow(row, rowIndex, context))
    .filter((row): row is ImportRowInput => Boolean(row));
  const skippedRowCount = rows.length - mappedRows.length;
  const result = importPublicBuildingRecords({
    datasetName,
    sourceVersion,
    sourceFile: filePath,
    rows: mappedRows
  });

  return {
    filePath,
    datasetName,
    sourceVersion,
    delimiter: delimiter === "\t" ? "tab" : "comma",
    rowsRead: rows.length,
    rowsMapped: mappedRows.length,
    rowsSkippedBeforeImport: skippedRowCount,
    import: result
  };
});

const combinedSourceVersion = options.sourceVersion ?? fileSummaries.find((summary) => summary.sourceVersion)?.sourceVersion;
const postImportSummary: Record<string, unknown> = {};

if (options.autoMatch) {
  postImportSummary.autoMatch = autoMatchPublicBuildingRecordsForAllBuildings();
}

if (options.refreshCoverage) {
  postImportSummary.coverageRefresh = refreshCoverageForAllBuildings(deriveReportingYear(combinedSourceVersion));
}

if (options.generateRequirements) {
  postImportSummary.requirementGeneration = generateRequirementsForAllBuildings(
    deriveReportingYear(combinedSourceVersion)
  );
}

console.log(
  JSON.stringify(
    {
      inputPath: resolve(process.cwd(), options.inputPath),
      fileCount: fileSummaries.length,
      files: fileSummaries,
      postImport: postImportSummary,
      recentImportRuns: listPublicImportRuns(options.reportLimit)
    },
    null,
    2
  )
);
