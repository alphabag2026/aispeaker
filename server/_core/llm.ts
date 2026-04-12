import { ENV } from "./env";
import { logApiUsage } from "../db";

export type Role = "system" | "user" | "assistant" | "tool" | "function";

export type TextContent = {
  type: "text";
  text: string;
};

export type ImageContent = {
  type: "image_url";
  image_url: {
    url: string;
    detail?: "auto" | "low" | "high";
  };
};

export type FileContent = {
  type: "file_url";
  file_url: {
    url: string;
    mime_type?: "audio/mpeg" | "audio/wav" | "application/pdf" | "audio/mp4" | "video/mp4" ;
  };
};

export type MessageContent = string | TextContent | ImageContent | FileContent;

export type Message = {
  role: Role;
  content: MessageContent | MessageContent[];
  name?: string;
  tool_call_id?: string;
};

export type Tool = {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
};

export type ToolChoicePrimitive = "none" | "auto" | "required";
export type ToolChoiceByName = { name: string };
export type ToolChoiceExplicit = {
  type: "function";
  function: {
    name: string;
  };
};

export type ToolChoice =
  | ToolChoicePrimitive
  | ToolChoiceByName
  | ToolChoiceExplicit;

export type InvokeParams = {
  messages: Message[];
  tools?: Tool[];
  toolChoice?: ToolChoice;
  tool_choice?: ToolChoice;
  maxTokens?: number;
  max_tokens?: number;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
};

export type ToolCall = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
};

export type InvokeResult = {
  id: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: Role;
      content: string | Array<TextContent | ImageContent | FileContent>;
      tool_calls?: ToolCall[];
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

export type JsonSchema = {
  name: string;
  schema: Record<string, unknown>;
  strict?: boolean;
};

export type OutputSchema = JsonSchema;

export type ResponseFormat =
  | { type: "text" }
  | { type: "json_object" }
  | { type: "json_schema"; json_schema: JsonSchema };

const ensureArray = (
  value: MessageContent | MessageContent[]
): MessageContent[] => (Array.isArray(value) ? value : [value]);

const normalizeContentPart = (
  part: MessageContent
): TextContent | ImageContent | FileContent => {
  if (typeof part === "string") {
    return { type: "text", text: part };
  }

  if (part.type === "text") {
    return part;
  }

  if (part.type === "image_url") {
    return part;
  }

  if (part.type === "file_url") {
    return part;
  }

  throw new Error("Unsupported message content part");
};

const normalizeMessage = (message: Message) => {
  const { role, name, tool_call_id } = message;

  if (role === "tool" || role === "function") {
    const content = ensureArray(message.content)
      .map(part => (typeof part === "string" ? part : JSON.stringify(part)))
      .join("\n");

    return {
      role,
      name,
      tool_call_id,
      content,
    };
  }

  const contentParts = ensureArray(message.content).map(normalizeContentPart);

  // If there's only text content, collapse to a single string for compatibility
  if (contentParts.length === 1 && contentParts[0].type === "text") {
    return {
      role,
      name,
      content: contentParts[0].text,
    };
  }

  return {
    role,
    name,
    content: contentParts,
  };
};

const normalizeToolChoice = (
  toolChoice: ToolChoice | undefined,
  tools: Tool[] | undefined
): "none" | "auto" | ToolChoiceExplicit | undefined => {
  if (!toolChoice) return undefined;

  if (toolChoice === "none" || toolChoice === "auto") {
    return toolChoice;
  }

  if (toolChoice === "required") {
    if (!tools || tools.length === 0) {
      throw new Error(
        "tool_choice 'required' was provided but no tools were configured"
      );
    }

    if (tools.length > 1) {
      throw new Error(
        "tool_choice 'required' needs a single tool or specify the tool name explicitly"
      );
    }

    return {
      type: "function",
      function: { name: tools[0].function.name },
    };
  }

  if ("name" in toolChoice) {
    return {
      type: "function",
      function: { name: toolChoice.name },
    };
  }

  return toolChoice;
};

/**
 * Resolve LLM API URL:
 * - If GEMINI_API_KEY is set, use Gemini OpenAI-compatible endpoint directly
 * - Otherwise fall back to BUILT_IN_FORGE_API_URL (Manus Forge)
 */
const resolveApiUrl = () => {
  // If Gemini API key is available, use Gemini directly
  if (ENV.geminiApiKey) {
    return "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
  }
  // Fallback to Forge API
  if (!ENV.forgeApiUrl || ENV.forgeApiUrl.trim().length === 0) {
    return "https://forge.manus.im/v1/chat/completions";
  }
  const base = ENV.forgeApiUrl.replace(/\/$/, "");
  if (base.includes("/chat/completions")) return base;
  if (base.endsWith("/openai")) return `${base}/chat/completions`;
  return `${base}/v1/chat/completions`;
};

/**
 * Resolve the API key for LLM calls:
 * - If GEMINI_API_KEY is set, use it
 * - Otherwise use BUILT_IN_FORGE_API_KEY
 */
const resolveApiKey = () => {
  return ENV.geminiApiKey || ENV.forgeApiKey;
};

const assertApiKey = () => {
  if (!ENV.geminiApiKey && !ENV.forgeApiKey) {
    throw new Error("API key is not configured (set GEMINI_API_KEY or BUILT_IN_FORGE_API_KEY)");
  }
};

const normalizeResponseFormat = ({
  responseFormat,
  response_format,
  outputSchema,
  output_schema,
}: {
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
}):
  | { type: "json_schema"; json_schema: JsonSchema }
  | { type: "text" }
  | { type: "json_object" }
  | undefined => {
  const explicitFormat = responseFormat || response_format;
  if (explicitFormat) {
    if (
      explicitFormat.type === "json_schema" &&
      !explicitFormat.json_schema?.schema
    ) {
      throw new Error(
        "responseFormat json_schema requires a defined schema object"
      );
    }
    return explicitFormat;
  }

  const schema = outputSchema || output_schema;
  if (!schema) return undefined;

  if (!schema.name || !schema.schema) {
    throw new Error("outputSchema requires both name and schema");
  }

  return {
    type: "json_schema",
    json_schema: {
      name: schema.name,
      schema: schema.schema,
      ...(typeof schema.strict === "boolean" ? { strict: schema.strict } : {}),
    },
  };
};

/** Retry configuration for transient errors */
const MAX_RETRIES = 3;
const RETRY_DELAYS = [2000, 4000, 8000]; // exponential backoff in ms
const RETRYABLE_STATUS_CODES = new Set([500, 502, 503, 429]);

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function invokeLLM(params: InvokeParams & { _userId?: number }): Promise<InvokeResult> {
  assertApiKey();
  const startTime = Date.now();

  const {
    messages,
    tools,
    toolChoice,
    tool_choice,
    outputSchema,
    output_schema,
    responseFormat,
    response_format,
    _userId,
  } = params;

  const model = "gemini-2.5-flash";
  const payload: Record<string, unknown> = {
    model,
    messages: messages.map(normalizeMessage),
  };

  if (tools && tools.length > 0) {
    payload.tools = tools;
  }

  const normalizedToolChoice = normalizeToolChoice(
    toolChoice || tool_choice,
    tools
  );
  if (normalizedToolChoice) {
    payload.tool_choice = normalizedToolChoice;
  }

  payload.max_tokens = 32768;

  const normalizedResponseFormat = normalizeResponseFormat({
    responseFormat,
    response_format,
    outputSchema,
    output_schema,
  });

  if (normalizedResponseFormat) {
    payload.response_format = normalizedResponseFormat;
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (attempt > 0) {
        const delay = RETRY_DELAYS[attempt - 1] || 8000;
        console.log(`[LLM] Retry attempt ${attempt}/${MAX_RETRIES} after ${delay}ms delay...`);
        await sleep(delay);
      }

      const response = await fetch(resolveApiUrl(), {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${resolveApiKey()}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        const status = response.status;
        const durationMs = Date.now() - startTime;

        // Check if retryable
        if (RETRYABLE_STATUS_CODES.has(status) && attempt < MAX_RETRIES) {
          console.log(`[LLM] Transient error (HTTP ${status}), will retry. Error: ${errorText.slice(0, 200)}`);
          lastError = new Error(`HTTP ${status}: ${errorText.slice(0, 200)}`);
          continue; // retry
        }

        // Log error (final attempt)
        logApiUsage({
          userId: _userId,
          apiType: "llm",
          model,
          durationMs,
          status: "error",
          errorCode: `HTTP_${status}`,
          errorMessage: errorText.slice(0, 500),
        });

        // Classify errors with user-friendly messages
        if (status === 401 || status === 403) {
          throw new Error(
            `AI 서비스 인증 오류: API 키가 유효하지 않거나 만료되었습니다. 관리자에게 문의하세요. (HTTP ${status})`
          );
        }
        if (status === 429) {
          throw new Error(
            `AI 서비스 사용량 한도 초과: 일일 API 쿼터를 초과했습니다. 잠시 후 다시 시도해주세요. (HTTP ${status})`
          );
        }
        if (status === 500 || status === 502 || status === 503) {
          throw new Error(
            `AI 서비스 일시적 오류: 서버가 응답하지 않습니다. ${MAX_RETRIES}회 재시도 후에도 실패했습니다. 잠시 후 다시 시도해주세요. (HTTP ${status})`
          );
        }
        throw new Error(
          `AI 서비스 오류: ${response.statusText} (HTTP ${status}) – ${errorText.slice(0, 200)}`
        );
      }

      const result = (await response.json()) as InvokeResult;
      const durationMs = Date.now() - startTime;

      if (attempt > 0) {
        console.log(`[LLM] Succeeded on retry attempt ${attempt}`);
      }

      // Log success
      logApiUsage({
        userId: _userId,
        apiType: "llm",
        model,
        inputTokens: result.usage?.prompt_tokens,
        outputTokens: result.usage?.completion_tokens,
        durationMs,
        status: "success",
      });

      return result;
    } catch (err: any) {
      // If this is a retryable network error and we have retries left
      if (attempt < MAX_RETRIES && !err.message?.includes("HTTP")) {
        console.log(`[LLM] Network error on attempt ${attempt + 1}, will retry: ${err.message}`);
        lastError = err;
        continue;
      }

      // If not already logged (non-HTTP errors like network failures)
      if (!err.message?.includes("HTTP")) {
        logApiUsage({
          userId: _userId,
          apiType: "llm",
          model,
          durationMs: Date.now() - startTime,
          status: "error",
          errorCode: "NETWORK_ERROR",
          errorMessage: err.message?.slice(0, 500),
        });
      }
      throw err;
    }
  }

  // Should not reach here, but just in case
  throw lastError || new Error("LLM invocation failed after all retries");
}
