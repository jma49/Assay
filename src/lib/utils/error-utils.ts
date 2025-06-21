/**
 * 前端错误处理工具集
 * 提供统一的错误处理、重试机制和用户友好的错误消息
 */

import { toast } from "sonner";

/**
 * 标准错误类型
 */
export enum FrontendErrorType {
  NETWORK_ERROR = "NETWORK_ERROR",
  API_ERROR = "API_ERROR",
  VALIDATION_ERROR = "VALIDATION_ERROR",
  PERMISSION_ERROR = "PERMISSION_ERROR",
  TIMEOUT_ERROR = "TIMEOUT_ERROR",
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
}

/**
 * 自定义前端错误类
 */
export class FrontendError extends Error {
  public readonly type: FrontendErrorType;
  public readonly code?: string;
  public readonly details?: Record<string, unknown>;
  public readonly timestamp: number;

  constructor(
    type: FrontendErrorType,
    message: string,
    code?: string,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "FrontendError";
    this.type = type;
    this.code = code;
    this.details = details;
    this.timestamp = Date.now();

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, FrontendError);
    }
  }

  /**
   * 转换为JSON格式
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      type: this.type,
      message: this.message,
      code: this.code,
      details: this.details,
      timestamp: this.timestamp,
      stack: this.stack,
    };
  }
}

/**
 * 错误分类器
 * 根据错误类型提供合适的用户提示
 */
export class ErrorClassifier {
  private static readonly ERROR_PATTERNS = {
    [FrontendErrorType.NETWORK_ERROR]: [
      /fetch.*failed/i,
      /network.*error/i,
      /connection.*refused/i,
      /timeout/i,
      /ERR_NETWORK/i,
      /ERR_INTERNET_DISCONNECTED/i,
    ],
    [FrontendErrorType.PERMISSION_ERROR]: [
      /unauthorized/i,
      /forbidden/i,
      /403/,
      /401/,
      /permission.*denied/i,
    ],
    [FrontendErrorType.VALIDATION_ERROR]: [
      /validation.*failed/i,
      /invalid.*input/i,
      /bad.*request/i,
      /400/,
    ],
    [FrontendErrorType.TIMEOUT_ERROR]: [/timeout/i, /timed.*out/i, /408/],
  };

  /**
   * 分类错误类型
   */
  static classify(error: Error | string): FrontendErrorType {
    const message = typeof error === "string" ? error : error.message;

    for (const [type, patterns] of Object.entries(this.ERROR_PATTERNS)) {
      if (patterns.some((pattern) => pattern.test(message))) {
        return type as FrontendErrorType;
      }
    }

    return FrontendErrorType.UNKNOWN_ERROR;
  }

  /**
   * 获取用户友好的错误消息
   */
  static getUserMessage(
    error: Error | string,
    type?: FrontendErrorType
  ): string {
    const errorType = type || this.classify(error);

    const userMessages = {
      [FrontendErrorType.NETWORK_ERROR]: "网络连接异常，请检查网络设置后重试",
      [FrontendErrorType.API_ERROR]: "服务器暂时无法响应，请稍后重试",
      [FrontendErrorType.VALIDATION_ERROR]:
        "输入的数据格式不正确，请检查后重新提交",
      [FrontendErrorType.PERMISSION_ERROR]:
        "您没有执行此操作的权限，请联系管理员",
      [FrontendErrorType.TIMEOUT_ERROR]: "请求超时，请检查网络连接后重试",
      [FrontendErrorType.UNKNOWN_ERROR]: "操作失败，请稍后重试",
    };

    return userMessages[errorType];
  }
}

/**
 * 错误处理器配置
 */
interface ErrorHandlerConfig {
  showToast?: boolean;
  logToConsole?: boolean;
  reportToService?: boolean;
  retryable?: boolean;
  fallbackMessage?: string;
}

/**
 * 统一错误处理器
 */
export class ErrorHandler {
  private static readonly DEFAULT_CONFIG: ErrorHandlerConfig = {
    showToast: true,
    logToConsole: true,
    reportToService: false,
    retryable: false,
  };

  /**
   * 处理错误
   */
  static handle(
    error: Error | string,
    config: ErrorHandlerConfig = {}
  ): FrontendError {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };
    const errorType = ErrorClassifier.classify(error);
    const userMessage =
      config.fallbackMessage ||
      ErrorClassifier.getUserMessage(error, errorType);

    // 创建标准化错误对象
    const frontendError = new FrontendError(errorType, userMessage, undefined, {
      originalError: error,
    });

    // 控制台日志记录
    if (finalConfig.logToConsole) {
      console.error("[ErrorHandler]", {
        type: errorType,
        message: userMessage,
        originalError: error,
        timestamp: new Date().toISOString(),
        stack: frontendError.stack,
      });
    }

    // 显示用户提示
    if (finalConfig.showToast) {
      toast.error(userMessage, {
        description:
          process.env.NODE_ENV === "development"
            ? `${typeof error === "string" ? error : error.message}`
            : undefined,
      });
    }

    // 上报到监控服务
    if (finalConfig.reportToService && process.env.NODE_ENV === "production") {
      this.reportError(frontendError);
    }

    return frontendError;
  }

  /**
   * 上报错误到监控服务
   */
  private static reportError(error: FrontendError) {
    // 这里可以集成错误监控服务
    console.warn("[ErrorHandler] 错误已上报到监控服务", error.toJSON());
  }
}

/**
 * Async/Await 错误处理包装器
 */
export async function handleAsync<T>(
  promise: Promise<T>,
  errorConfig?: ErrorHandlerConfig
): Promise<[T | null, FrontendError | null]> {
  try {
    const data = await promise;
    return [data, null];
  } catch (error) {
    const handledError = ErrorHandler.handle(error as Error, errorConfig);
    return [null, handledError];
  }
}

/**
 * API 请求错误处理
 */
export async function handleApiRequest<T>(
  request: () => Promise<Response>,
  options: {
    errorMessage?: string;
    showToast?: boolean;
    retryCount?: number;
    retryDelay?: number;
  } = {}
): Promise<T> {
  const {
    retryCount = 0,
    retryDelay = 1000,
    errorMessage,
    showToast,
  } = options;

  let lastError: Error;

  for (let attempt = 0; attempt <= retryCount; attempt++) {
    try {
      const response = await request();

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message ||
            errorData.error ||
            `HTTP ${response.status}: ${response.statusText}`
        );
      }

      return await response.json();
    } catch (error) {
      lastError = error as Error;

      if (attempt < retryCount) {
        console.warn(`API request attempt ${attempt + 1} failed, retrying...`);
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
        continue;
      }

      throw ErrorHandler.handle(lastError, {
        fallbackMessage: errorMessage,
        showToast: showToast,
      });
    }
  }

  throw lastError!;
}

/**
 * 表单验证错误处理
 */
export function handleValidationErrors(errors: Record<string, string[]>): void {
  const errorMessages = Object.entries(errors)
    .map(([field, messages]) => `${field}: ${messages.join(", ")}`)
    .join("\n");

  ErrorHandler.handle(errorMessages, {
    fallbackMessage: "表单验证失败，请检查输入内容",
    showToast: true,
  });
}

/**
 * 重试机制装饰器
 */
export function withRetry<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  maxRetries: number = 3,
  delay: number = 1000,
  backoffFactor: number = 2
): T {
  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await fn(...args);
        return result as ReturnType<T>;
      } catch (error) {
        lastError = error as Error;

        if (attempt === maxRetries) {
          throw ErrorHandler.handle(lastError);
        }

        const currentDelay = delay * Math.pow(backoffFactor, attempt);
        await new Promise((resolve) => setTimeout(resolve, currentDelay));

        console.warn(
          `Retry attempt ${attempt + 1}/${maxRetries} for function ${fn.name}`
        );
      }
    }

    throw lastError!;
  }) as T;
}

/**
 * 加载状态错误处理 Hook 辅助函数
 */
export function createAsyncHandler<T>(
  asyncFn: () => Promise<T>,
  options: {
    onSuccess?: (data: T) => void;
    onError?: (error: FrontendError) => void;
    onFinally?: () => void;
    errorMessage?: string;
    showToast?: boolean;
  } = {}
) {
  return async () => {
    try {
      const data = await asyncFn();
      options.onSuccess?.(data);
      return data;
    } catch (error) {
      const handledError = ErrorHandler.handle(error as Error, {
        fallbackMessage: options.errorMessage,
        showToast: options.showToast,
      });
      options.onError?.(handledError);
      throw handledError;
    } finally {
      options.onFinally?.();
    }
  };
}

/**
 * 全局未处理错误监听器
 */
export function setupGlobalErrorHandlers() {
  // 监听未处理的 Promise 拒绝
  window.addEventListener("unhandledrejection", (event) => {
    console.error("[Global] Unhandled promise rejection:", event.reason);

    const error =
      event.reason instanceof Error
        ? event.reason
        : new Error(String(event.reason));

    ErrorHandler.handle(error, {
      showToast: false, // 避免过多的用户提示
      reportToService: true,
    });
  });

  // 监听全局 JavaScript 错误
  window.addEventListener("error", (event) => {
    console.error("[Global] JavaScript error:", event.error);

    ErrorHandler.handle(event.error || new Error(event.message), {
      showToast: false,
      reportToService: true,
    });
  });

  console.log("[ErrorHandler] Global error handlers initialized");
}
