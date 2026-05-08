export { transform } from "./transform.js";
export type { TransformOptions, TransformResult } from "./transform.js";
export { PRIMER, primerAsComment } from "./primer.js";
export { CapabilityCheckError } from "./passes/cap-check.js";
export { BotscriptError, formatDiagnostic, formatDiagnostics } from "./diagnostics.js";
export type { Diagnostic, DiagnosticSeverity } from "./diagnostics.js";
export { getErrorCode, listErrorCodes, formatExplain } from "./error-codes.js";
export type { ErrorCodeEntry } from "./error-codes.js";
// Parser surface (?bs 0.4+) — shallow whole-file AST. Tooling consumers can
// build on `parseProgram` without re-tokenizing. The model surfaces only
// fn declarations as nodes today; deeper structure lands when a real
// consumer needs it.
export { parseProgram } from "./parser/parse.js";
export type { ParseOptions } from "./parser/parse.js";
export type { Program, Stmt, FnStmt, SourceRange } from "./parser/ast.js";
export type { FnDecl, FnBody, ParseFnOptions } from "./parser/parse-fn.js";
export { atLeast, LATEST_VERSION, SUPPORTED_VERSIONS } from "./passes/version.js";
export type { VersionInfo } from "./passes/version.js";
