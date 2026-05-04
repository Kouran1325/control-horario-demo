import crypto from "crypto";

type TimeEntryHashInput = {
    id: string;
    userId: string;
    startAt: Date;
    endAt: Date | null;
    latStart: number | null;
    lonStart: number | null;
    accuracyStart: number | null;
    latEnd: number | null;
    lonEnd: number | null;
    accuracyEnd: number | null;
    createdAt: Date;
    createdByAdmin: boolean;
    editedByAdmin: boolean;
    voidedByAdmin: boolean;
    closedByAdmin: boolean;
    entryMethod: string;
};

function normalizeNumber(value: number | null): string {
    return value === null ? "" : value.toString();
}

function normalizeDate(value: Date | null): string {
    return value ? value.toISOString() : "";
}

export function buildTimeEntryHashPayload(input: TimeEntryHashInput): string {
    return [
        input.id,
        input.userId,
        input.startAt.toISOString(),
        normalizeDate(input.endAt),
        normalizeNumber(input.latStart),
        normalizeNumber(input.lonStart),
        normalizeNumber(input.accuracyStart),
        normalizeNumber(input.latEnd),
        normalizeNumber(input.lonEnd),
        normalizeNumber(input.accuracyEnd),
        input.createdAt.toISOString(),
        input.createdByAdmin ? "1" : "0",
        input.editedByAdmin ? "1" : "0",
        input.voidedByAdmin ? "1" : "0",
        input.closedByAdmin ? "1" : "0",
        input.entryMethod,
    ].join("|");
}

export function generateTimeEntryHash(input: TimeEntryHashInput): string {
    const secret = process.env.TIME_ENTRY_HASH_SECRET;

    if (!secret) {
        throw new Error("Falta TIME_ENTRY_HASH_SECRET en variables de entorno");
    }

    const payload = buildTimeEntryHashPayload(input);

    return crypto
        .createHmac("sha256", secret)
        .update(payload)
        .digest("hex");
}