export const REQUIRED_MEASUREMENT_COLUMNS = [
  "date",
  "left_step_time",
  "right_step_time",
  "walking_speed",
  "balance_score",
];

const MAX_ROWS = 5000;
const MAX_CHARACTERS = 5_000_000;

function parseCsvRows(source) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  let afterQuote = false;

  const finishRow = () => {
    row.push(field);
    if (row.some((value) => value.trim() !== "")) {
      rows.push(row);
      if (rows.length > MAX_ROWS + 1) {
        throw new Error(`Please keep a local import to ${MAX_ROWS.toLocaleString()} rows or fewer.`);
      }
    }
    row = [];
    field = "";
    afterQuote = false;
  };

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];

    if (inQuotes) {
      if (character === '"') {
        if (source[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
          afterQuote = true;
        }
      } else {
        field += character;
      }
      continue;
    }

    if (afterQuote) {
      if (character === ",") {
        row.push(field);
        field = "";
        afterQuote = false;
      } else if (character === "\n" || character === "\r") {
        finishRow();
        if (character === "\r" && source[index + 1] === "\n") index += 1;
      } else if (!/\s/.test(character)) {
        throw new Error("Invalid CSV: unexpected characters after a quoted field.");
      }
      continue;
    }

    if (character === '"') {
      if (field.trim() !== "") {
        throw new Error("Invalid CSV: a quote appeared in the middle of an unquoted field.");
      }
      field = "";
      inQuotes = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n" || character === "\r") {
      finishRow();
      if (character === "\r" && source[index + 1] === "\n") index += 1;
    } else {
      field += character;
    }
  }

  if (inQuotes) throw new Error("Invalid CSV: a quoted field was not closed.");
  if (field.length > 0 || row.length > 0 || afterQuote) {
    row.push(field);
    if (row.some((value) => value.trim() !== "")) rows.push(row);
  }
  return rows;
}

export function parseMeasurementCsv(input) {
  if (typeof input !== "string" || input.trim() === "") {
    throw new Error("The CSV file is empty.");
  }
  if (input.length > MAX_CHARACTERS) {
    throw new Error("The CSV is larger than the 5 MB import limit.");
  }

  const source = input.replace(/^\uFEFF/, "");
  const matrix = parseCsvRows(source);
  if (matrix.length < 2) {
    throw new Error("The CSV needs a header and at least one measurement row.");
  }

  const headers = matrix[0].map((value) => value.trim().toLowerCase());
  const duplicates = headers.filter((header, index) => headers.indexOf(header) !== index);
  if (duplicates.length) {
    throw new Error(`Duplicate column names: ${[...new Set(duplicates)].join(", ")}`);
  }

  const missing = REQUIRED_MEASUREMENT_COLUMNS.filter((column) => !headers.includes(column));
  if (missing.length) throw new Error(`Missing columns: ${missing.join(", ")}`);

  const indexes = Object.fromEntries(headers.map((header, index) => [header, index]));
  const rows = matrix.slice(1).map((cells, rowIndex) => {
    if (cells.length !== headers.length) {
      throw new Error(`Row ${rowIndex + 2}: expected ${headers.length} columns but found ${cells.length}.`);
    }

    const date = (cells[indexes.date] ?? "").trim();
    if (!date || date.length > 80) {
      throw new Error(`Row ${rowIndex + 2}: date is required and must be 80 characters or fewer.`);
    }

    const readNumber = (column) => {
      const raw = (cells[indexes[column]] ?? "").trim();
      const value = Number(raw);
      if (raw === "" || !Number.isFinite(value)) {
        throw new Error(`Row ${rowIndex + 2}: ${column} must be a valid number.`);
      }
      return value;
    };

    const record = {
      date,
      left_step_time: readNumber("left_step_time"),
      right_step_time: readNumber("right_step_time"),
      walking_speed: readNumber("walking_speed"),
      balance_score: readNumber("balance_score"),
    };

    if (record.left_step_time <= 0 || record.right_step_time <= 0 || record.walking_speed < 0) {
      throw new Error(`Row ${rowIndex + 2}: step times must be positive and walking speed cannot be negative.`);
    }
    return record;
  });

  if (!rows.length) throw new Error("No valid measurement rows were found.");
  if (rows.length > MAX_ROWS) throw new Error(`Please keep a local import to ${MAX_ROWS.toLocaleString()} rows or fewer.`);
  return rows;
}

export function toMeasurementCsv(rows) {
  const quote = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const lines = [
    REQUIRED_MEASUREMENT_COLUMNS.join(","),
    ...rows.map((row) => REQUIRED_MEASUREMENT_COLUMNS.map((column) => quote(row[column])).join(",")),
  ];
  return lines.join("\r\n");
}
