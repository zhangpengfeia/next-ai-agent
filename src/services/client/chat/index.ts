import request from "@/lib/config/axios";
import {
  CustomChatRequest,
  CreateSessionRequest,
  RenameSessionRequest,
  AddMessageRequest,
  ApiResponse,
  SessionData,
  MessageData,
} from "./type";

// 接口基础路径
const basePath = "/chat";
/**
 * 创建新会话
 */
export async function createSession(
  body: CreateSessionRequest = {}
): Promise<ApiResponse<{ session_id: string; session_name: string; create_time: string }>> {
  return request.post({
    url: `${basePath}/session/create`,
    data: body,
  });
}

/**
 * 获取会话列表
 */
export async function listSessions(
  limit: number = 20
): Promise<ApiResponse<{ sessions: SessionData[]; total: number }>> {
  return request.get({
    url: `${basePath}/session/list`,
    params: { limit },
  });
}

/**
 * 重命名会话
 */
export async function renameSession(
  sessionId: string,
  body: RenameSessionRequest
): Promise<ApiResponse<{ session_id: string; session_name: string }>> {
  return request.put({
    url: `${basePath}/session/${sessionId}/rename`,
    data: body,
  });
}

/**
 * 删除会话
 */
export async function deleteSession(
  sessionId: string
): Promise<ApiResponse<{ session_id: string }>> {
  return request.delete({
    url: `${basePath}/session/${sessionId}`,
  });
}

// ==================== 消息管理 ====================

/**
 * 添加消息
 */
export async function addMessage(
  body: AddMessageRequest
): Promise<ApiResponse<{ session_id: string; role: string }>> {
  return request.post({
    url: `${basePath}/message/add`,
    data: body,
  });
}

/**
 * 获取会话历史消息
 */
export async function getMessageHistory(
  sessionId: string,
  limit: number = 50
): Promise<ApiResponse<{ session_id: string; messages: MessageData[]; total: number }>> {
  return request.get({
    url: `${basePath}/message/history/${sessionId}`,
    params: { limit },
  });
}

/**
 * 清空会话消息
 */
export async function clearMessageHistory(
  sessionId: string
): Promise<ApiResponse<{ session_id: string }>> {
  return request.delete({
    url: `${basePath}/message/history/${sessionId}`,
  });
}

// ==================== 聊天接口 ====================

/**
 * 流式对话（SSE）
 */
export async function chatStream(body: CustomChatRequest) {
  return request.post({
    url: `${basePath}/stream`,
    data: body,
    headers: {
      Accept: "text/event-stream",
    },
    // 浏览器端流式响应必须设置responseType
    responseType: "text",
    // 关闭超时（流式请求不适合设置超时）
    timeout: 0,
  });
}