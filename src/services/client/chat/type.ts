// src/types/chat.ts

// 消息内容类型
export type ContentType = "text" | "image";

export interface TextContent {
  type: "text";
  text: string;
}

export interface ImageContent {
  type: "image";
  image_url: string;
  description?: string;
}

export type ContentItem = TextContent | ImageContent;

// 消息角色
export type MessageRole = "user" | "assistant" | "system";

// 消息结构
export interface Message {
  role: MessageRole;
  content: string | ContentItem[];
}

// 聊天请求
export interface CustomChatRequest {
  messages: Message[];
  stream?: boolean;
  model?: string;
  session_id?: string;
}

// 会话管理请求
export interface CreateSessionRequest {
  session_name?: string;
}

export interface RenameSessionRequest {
  session_name: string;
}

export interface AddMessageRequest {
  session_id: string;
  role: "user" | "assistant";
  content: string | ContentItem[];
  use_rag?: number;
  md5?: string;
}

// 响应数据类型
export interface SessionData {
  session_id: string;
  session_name: string;
  create_time: Date;
  update_time?: Date;
}

export interface MessageData {
  session_id: string;
  role: MessageRole;
  content: string;
  use_rag: number;
  md5: string | null;
  create_time: Date;
}

// API 响应格式
export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data: T;
}

// 流式响应事件
export interface StreamEventData {
  type: "text" | "image" | "complete" | "error";
  content?: string;
  image_url?: string;
  isStreaming?: boolean;
  isComplete?: boolean;
  progress: number;
  session_id: string;
}
