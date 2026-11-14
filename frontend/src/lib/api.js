const API_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
const DEFAULT_TIMEOUT_MS = 10_000;

export class ApiError extends Error {
  constructor(message, { status = 0, code = "request_failed", parameter = null } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.parameter = parameter;
  }
}

function messageFromBody(body, status) {
  const apiError = body?.error;
  if (typeof apiError === "string") return apiError;
  if (apiError && typeof apiError.message === "string") return apiError.message;
  if (typeof body?.detail === "string") return body.detail;
  if (typeof body?.message === "string") return body.message;
  return `Request failed with status ${status}.`;
}

export async function getJson(path, options = {}) {
  const {
    timeoutMs = DEFAULT_TIMEOUT_MS,
    signal: externalSignal,
    headers: extraHeaders,
    ...fetchOptions
  } = options;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(new Error("Request timed out.")), timeoutMs);
  const relayAbort = () => controller.abort(externalSignal?.reason);
  externalSignal?.addEventListener("abort", relayAbort, { once: true });

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...fetchOptions,
      signal: controller.signal,
      headers: { Accept: "application/json", ...extraHeaders },
    });
    const contentType = response.headers.get("content-type") || "";
    const body = contentType.includes("application/json")
      ? await response.json().catch(() => null)
      : null;

    if (!response.ok) {
      const apiError = body?.error;
      throw new ApiError(messageFromBody(body, response.status), {
        status: response.status,
        code: apiError?.code || "request_failed",
        parameter: apiError?.parameter || null,
      });
    }
    if (!contentType.includes("application/json") || body === null) {
      throw new ApiError("The measurement service returned an invalid response. Please retry.", {
        status: response.status,
        code: "invalid_response",
      });
    }
    return body;
  } catch (error) {
    if (error.name === "AbortError" || (controller.signal.aborted && !externalSignal?.aborted)) {
      throw new ApiError("The API request timed out. Please retry.", { code: "timeout" });
    }
    throw error;
  } finally {
    clearTimeout(timeout);
    externalSignal?.removeEventListener("abort", relayAbort);
  }
}
