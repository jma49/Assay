/**
 * API响应标准化工具
 * 提供统一的API响应格式和错误处理机制
 *
 * @author AI Assistant
 * @version 1.0.0
 * @since 2024-01-01
 */

/**
 * API响应状态码枚举
 */
export enum ApiStatusCode {
  // 成功状态码
  OK = 200,
  CREATED = 201,
  NO_CONTENT = 204,

  // 客户端错误状态码
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  METHOD_NOT_ALLOWED = 405,
  CONFLICT = 409,
  UNPROCESSABLE_ENTITY = 422,
  TOO_MANY_REQUESTS = 429,

  // 服务器错误状态码
  INTERNAL_SERVER_ERROR = 500,
  NOT_IMPLEMENTED = 501,
  BAD_GATEWAY = 502,
  SERVICE_UNAVAILABLE = 503,
  GATEWAY_TIMEOUT = 504,
}

/**
 * 分页信息接口
 */
export interface PaginationInfo {
  /** 当前页码 */
  page: number;
  /** 每页条目数 */
  limit: number;
  /** 总条目数 */
  total: number;
  /** 总页数 */
  totalPages: number;
  /** 是否有下一页 */
  hasNext: boolean;
  /** 是否有上一页 */
  hasPrev: boolean;
}

/**
 * 错误详情接口
 */
export interface ErrorDetail {
  /** 错误代码 */
  code?: string;
  /** 错误字段（用于表单验证错误） */
  field?: string;
  /** 错误消息 */
  message: string;
}

/**
 * 标准化API响应接口
 * @template T 响应数据的类型
 */
export interface StandardApiResponse<T = unknown> {
  /** 请求是否成功 */
  success: boolean;
  /** 响应数据（成功时存在） */
  data?: T;
  /** 错误消息（失败时存在） */
  error?: string;
  /** 详细错误信息（失败时可选） */
  errors?: ErrorDetail[];
  /** 分页信息（分页查询时存在） */
  pagination?: PaginationInfo;
  /** 响应时间戳 */
  timestamp?: string;
  /** 请求ID（用于日志追踪） */
  requestId?: string;
}

/**
 * API响应构建器类
 * 提供链式调用的方式构建标准化响应
 */
export class ApiResponseBuilder<T = unknown> {
  private response: StandardApiResponse<T> = {
    success: false,
    timestamp: new Date().toISOString(),
  };

  /**
   * 设置成功响应数据
   * @param data 响应数据
   * @returns 构建器实例
   */
  public success(data: T): this {
    this.response.success = true;
    this.response.data = data;
    delete this.response.error;
    delete this.response.errors;
    return this;
  }

  /**
   * 设置错误响应
   * @param message 错误消息
   * @param errors 详细错误信息
   * @returns 构建器实例
   */
  public error(message: string, errors?: ErrorDetail[]): this {
    this.response.success = false;
    this.response.error = message;
    if (errors) {
      this.response.errors = errors;
    }
    delete this.response.data;
    return this;
  }

  /**
   * 设置分页信息
   * @param pagination 分页信息
   * @returns 构建器实例
   */
  public withPagination(pagination: PaginationInfo): this {
    this.response.pagination = pagination;
    return this;
  }

  /**
   * 设置请求ID
   * @param requestId 请求ID
   * @returns 构建器实例
   */
  public withRequestId(requestId: string): this {
    this.response.requestId = requestId;
    return this;
  }

  /**
   * 构建Response对象
   * @param status HTTP状态码
   * @returns Response对象
   */
  public build(status: ApiStatusCode = ApiStatusCode.OK): Response {
    return Response.json(this.response, { status });
  }

  /**
   * 获取响应数据对象
   * @returns 响应数据对象
   */
  public getData(): StandardApiResponse<T> {
    return { ...this.response };
  }
}

/**
 * 创建成功响应
 * @param data 响应数据
 * @param pagination 分页信息（可选）
 * @param status HTTP状态码
 * @returns Response对象
 */
export function createSuccessResponse<T>(
  data: T,
  pagination?: PaginationInfo,
  status: ApiStatusCode = ApiStatusCode.OK
): Response {
  const builder = new ApiResponseBuilder<T>().success(data);

  if (pagination) {
    builder.withPagination(pagination);
  }

  return builder.build(status);
}

/**
 * 创建错误响应
 * @param message 错误消息
 * @param status HTTP状态码
 * @param errors 详细错误信息
 * @returns Response对象
 */
export function createErrorResponse(
  message: string,
  status: ApiStatusCode = ApiStatusCode.INTERNAL_SERVER_ERROR,
  errors?: ErrorDetail[]
): Response {
  return new ApiResponseBuilder().error(message, errors).build(status);
}

/**
 * 创建分页信息对象
 * @param page 当前页码
 * @param limit 每页条目数
 * @param total 总条目数
 * @returns 分页信息对象
 */
export function createPaginationInfo(
  page: number,
  limit: number,
  total: number
): PaginationInfo {
  const totalPages = Math.ceil(total / limit);

  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

/**
 * 验证请求参数的通用函数
 * @param params 参数对象
 * @param requiredFields 必需字段列表
 * @returns 验证结果
 */
export function validateRequiredFields(
  params: Record<string, unknown>,
  requiredFields: string[]
): { isValid: boolean; errors: ErrorDetail[] } {
  const errors: ErrorDetail[] = [];

  for (const field of requiredFields) {
    if (
      params[field] === undefined ||
      params[field] === null ||
      params[field] === ""
    ) {
      errors.push({
        field,
        code: "REQUIRED_FIELD_MISSING",
        message: `Required field '${field}' is missing or empty`,
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * 解析分页参数
 * @param searchParams URL搜索参数
 * @param defaultLimit 默认每页条目数
 * @returns 解析后的分页参数
 */
export function parsePaginationParams(
  searchParams: URLSearchParams,
  defaultLimit: number = 10
): { page: number; limit: number } {
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.max(
    1,
    Math.min(
      100,
      parseInt(searchParams.get("limit") || String(defaultLimit), 10)
    )
  );

  return { page, limit };
}

/**
 * 向后兼容的响应创建函数
 * 提供与现有代码兼容的简单响应创建方式
 */

/**
 * 创建简单的成功响应（向后兼容）
 * @param data 响应数据
 * @returns Response对象
 */
export function successResponse<T>(data: T): Response {
  return createSuccessResponse(data);
}

/**
 * 创建简单的错误响应（向后兼容）
 * @param message 错误消息
 * @param status HTTP状态码
 * @returns Response对象
 */
export function errorResponse(message: string, status: number = 500): Response {
  return createErrorResponse(message, status as ApiStatusCode);
}
