import { Prisma, type PrismaClient } from "../../../generated/prisma";

/** Either the shared client or a transaction client, so helpers compose inside `db.$transaction`. */
export type DbClient = PrismaClient | Prisma.TransactionClient;

export type ServiceErrorCode = "NOT_FOUND" | "BAD_REQUEST" | "CONFLICT";

export class ServiceError extends Error {
  constructor(
    public readonly code: ServiceErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ServiceError";
  }
}

// Postgres SMALLINT upper bound; all dimensions/coordinates are stored as SMALLINT.
const SMALLINT_MAX = 32767;

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Validates a UUID before it reaches Postgres, which would otherwise fail with P2023. */
export function sanitizeId(value: string, field = "id"): string {
  const id = value.trim().toLowerCase();
  if (!UUID_REGEX.test(id)) {
    throw new ServiceError("BAD_REQUEST", `${field} must be a UUID`);
  }
  return id;
}

/** Trims and collapses whitespace; enforces non-empty and the column's VARCHAR length. */
export function sanitizeName(value: string, field: string, maxLength: number) {
  const text = value.trim().replace(/\s+/g, " ");
  if (text.length === 0) {
    throw new ServiceError("BAD_REQUEST", `${field} must not be empty`);
  }
  if (text.length > maxLength) {
    throw new ServiceError(
      "BAD_REQUEST",
      `${field} must be at most ${maxLength} characters`,
    );
  }
  return text;
}

/** Trims free text; blank becomes null. */
export function sanitizeOptionalText(value: string | null | undefined) {
  const text = value?.trim() ?? "";
  return text.length > 0 ? text : null;
}

/** Integer within SMALLINT range and at least `min`. */
export function sanitizeSmallInt(value: number, field: string, min: number) {
  if (!Number.isInteger(value) || value < min || value > SMALLINT_MAX) {
    throw new ServiceError(
      "BAD_REQUEST",
      `${field} must be an integer between ${min} and ${SMALLINT_MAX}`,
    );
  }
  return value;
}

/** Accepts "#abc", "abc", "#aabbcc" or "aabbcc"; returns "#AABBCC" to fit CHAR(7). */
export function sanitizeColorHex(value: string) {
  const hex = value.trim().replace(/^#/, "");
  if (/^[0-9a-f]{3}$/i.test(hex)) {
    return `#${[...hex].map((c) => c + c).join("")}`.toUpperCase();
  }
  if (/^[0-9a-f]{6}$/i.test(hex)) {
    return `#${hex}`.toUpperCase();
  }
  throw new ServiceError("BAD_REQUEST", "colorHex must look like #RRGGBB");
}

/**
 * Turns Prisma constraint errors into ServiceErrors with readable messages.
 * Rethrows anything it does not recognise.
 */
export function mapPrismaError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case "P2002":
        throw new ServiceError("CONFLICT", "Entry already exists");
      case "P2003":
        throw new ServiceError(
          "CONFLICT",
          "Referenced entry missing or still in use",
        );
      case "P2025":
        throw new ServiceError("NOT_FOUND", "Entry not found");
      case "P2034":
        throw new ServiceError("CONFLICT", "Concurrent update, please retry");
    }
  }
  throw error;
}
