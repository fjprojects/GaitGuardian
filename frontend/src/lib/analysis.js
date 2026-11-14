const NUMERIC_FIELDS = {
  left_step_time: 3,
  right_step_time: 3,
  walking_speed: 3,
  balance_score: 2,
};

const toFiniteNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

export function summarizeMeasurements(rows = []) {
  const statistics = {};
  for (const [field, decimalPlaces] of Object.entries(NUMERIC_FIELDS)) {
    const values = rows
      .map((row) => toFiniteNumber(row[field]))
      .filter((value) => value !== null);

    if (!values.length) {
      statistics[field] = { minimum: null, maximum: null, average: null };
      continue;
    }

    const average = values.reduce((total, value) => total + value, 0) / values.length;
    statistics[field] = {
      minimum: Math.min(...values),
      maximum: Math.max(...values),
      average: Number(average.toFixed(decimalPlaces)),
    };
  }

  return { measurement_count: rows.length, statistics };
}

export function filterAndSortMeasurements(rows = [], {
  query = "",
  minWalkingSpeed = "",
  maxWalkingSpeed = "",
  sort = "default",
  order = "asc",
} = {}) {
  const search = String(query).trim().toLocaleLowerCase();
  const minimum = minWalkingSpeed === "" ? null : toFiniteNumber(minWalkingSpeed);
  const maximum = maxWalkingSpeed === "" ? null : toFiniteNumber(maxWalkingSpeed);

  if ((minWalkingSpeed !== "" && minimum === null)
    || (maxWalkingSpeed !== "" && maximum === null)
    || (minimum !== null && maximum !== null && minimum > maximum)) {
    return [];
  }

  const filtered = rows.filter((row) => {
    const speed = toFiniteNumber(row.walking_speed);
    const label = String(row.date ?? "").toLocaleLowerCase();
    return (!search || label.includes(search))
      && (minimum === null || (speed !== null && speed >= minimum))
      && (maximum === null || (speed !== null && speed <= maximum));
  });

  const allowedSorts = new Set(["date", "walking_speed", "left_step_time", "right_step_time"]);
  if (!allowedSorts.has(sort) || sort === "default") return filtered;

  const direction = order === "desc" ? -1 : 1;
  return filtered.sort((left, right) => {
    const a = sort === "date" ? String(left[sort] ?? "") : toFiniteNumber(left[sort]) ?? 0;
    const b = sort === "date" ? String(right[sort] ?? "") : toFiniteNumber(right[sort]) ?? 0;
    const comparison = sort === "date"
      ? a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" })
      : a - b;
    return comparison * direction;
  });
}


export function compareMeasurementSessions(rows = [], firstDate = "", secondDate = "") {
  const first = rows.find((row) => row.date === firstDate);
  const second = rows.find((row) => row.date === secondDate);
  if (!first || !second || first === second) return null;

  const differences = {};
  for (const [field, decimalPlaces] of Object.entries(NUMERIC_FIELDS)) {
    const firstValue = toFiniteNumber(first[field]);
    const secondValue = toFiniteNumber(second[field]);
    differences[field] = firstValue === null || secondValue === null
      ? null
      : Number((secondValue - firstValue).toFixed(decimalPlaces));
  }

  return { first, second, differences };
}
