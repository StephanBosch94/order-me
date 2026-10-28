export class DataError extends Error {
  constructor(
    message: string,
    readonly code: "conflict" | "not_found" | "validation",
  ) {
    super(message);
    this.name = "DataError";
  }
}
