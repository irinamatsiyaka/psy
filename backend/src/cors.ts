const normalizeCorsOrigin = (raw: string): string => {
  const value = raw.trim();
  if (!value || value === "*") {
    return value;
  }

  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }

  if (value.startsWith("localhost")) {
    return `http://${value}`;
  }

  return `https://${value}`;
};

export const normalizeCorsOrigins = (raw: string): string[] => {
  if (!raw) {
    return ["http://localhost:5173"];
  }

  return Array.from(
    new Set(
      raw
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean)
        .map(normalizeCorsOrigin)
    )
  );
};
