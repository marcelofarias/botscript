export { transform } from "./transform.js";
export type { TransformOptions, TransformResult } from "./transform.js";
export { PRIMER, primerAsComment } from "./primer.js";
export { CapabilityCheckError } from "./passes/cap-check.js";
export { BotscriptError, formatDiagnostic, formatDiagnostics } from "./diagnostics.js";
export type { Diagnostic, DiagnosticSeverity } from "./diagnostics.js";
export { getErrorCode, listErrorCodes, formatExplain } from "./error-codes.js";
export type { ErrorCodeEntry } from "./error-codes.js";
