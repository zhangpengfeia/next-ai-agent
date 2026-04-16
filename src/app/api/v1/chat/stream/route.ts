import { NextRequest } from 'next/server';
import { ReactAgent } from '@/agent/createagent';
import { ChatSession } from "@/services/server/chat";

export interface CustomChatRequest {
  session_id?: string;
  messages: Array<{
    role: string;
    content: any;
  }>;
}
/**
 * 从内容中提取纯文本
 */
function extractTextFromContent(content: any): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content.map(c => {
      if (typeof c === 'string') return c;
      if (c.type === 'text') return c.text || '';
      if (c.type === 'image' && c.description) return `[图片: ${c.description}]`;
      return '';
    }).join(' ');
  }
  return String(content);
}

/**
 * 序列化内容为字符串
 */
function serializeContent(text: string): string {
  return text;
}

/**
 * 构建数据库存储的内容
 */
function buildContentForDb(response: string, hasImage: boolean): string {
  // 简化版本，直接返回文本
  // 如果需要支持图文混合，可以扩展此函数
  return response;
}

// POST
export async function POST(req: NextRequest) {
  try {
    const request = (await req.json()) as CustomChatRequest;

    // 1. 校验消息列表
    if (!request.messages || request.messages.length === 0) {
      return new Response(JSON.stringify({ detail: '消息列表不能为空' }), { status: 400 });
    }

    // 2. 取最后一条用户消息
    let lastUserMessage: string | null = null;
    for (const msg of [...request.messages].reverse()) {
      if (msg.role === 'user') {
        lastUserMessage = extractTextFromContent(msg.content);
        break;
      }
    }

    if (!lastUserMessage?.trim()) {
      return new Response(JSON.stringify({ detail: '用户查询内容不能为空' }), { status: 400 });
    }

    // 3. 获取/创建会话
    const agent = new ReactAgent();
    const sessionManager = new ChatSession();
    let sessionId = request.session_id;
    if (!sessionId) {
      sessionId = await sessionManager.createSession('新对话') || undefined;
      if (!sessionId) {
        return new Response(JSON.stringify({ detail: '创建会话失败' }), { status: 500 });
      }
      console.log(`自动创建新会话: ${sessionId}`);
    }
    console.log(`收到请求 - 会话ID: ${sessionId}, 消息数: ${request.messages.length}`);
    // 4. 保存用户消息
    const contentStr = serializeContent(lastUserMessage);
    await sessionManager.addMessage(sessionId, 'user', contentStr, 0);

    // 5. SSE 流式生成器
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const fullResponse: string[] = [];
          let hasImage = false;
          
          // 流式执行 agent
          for await (const chunk of agent.executeStream(lastUserMessage)) {
            fullResponse.push(chunk);
            
            // 判断是否为图片 URL
            const isImageUrl = /^http.*\.(png|jpg|jpeg|gif|webp)$/i.test(chunk.trim());
            let streamData;
            
            if (isImageUrl) {
              hasImage = true;
              streamData = {
                type: 'image',
                image_url: chunk,
                isStreaming: false,
                progress: 100,
                session_id: sessionId,
              };
            } else {
              streamData = {
                type: 'text',
                content: chunk,
                isStreaming: true,
                progress: 0,
                session_id: sessionId,
              };
            }

            const data = `data: ${JSON.stringify(streamData)}\n\n`;
            controller.enqueue(new TextEncoder().encode(data));
          }

          // 6. 保存助手消息
          const assistantResponse = fullResponse.join('');
          const contentForDb = buildContentForDb(assistantResponse, hasImage);
          await sessionManager.addMessage(sessionId, 'assistant', contentForDb, 0);

          // 7. 发送完成信号
          const completeData = {
            type: 'complete',
            content: '',
            isComplete: true,
            session_id: sessionId,
          };
          controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(completeData)}\n\n`));
          controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
        } catch (err: any) {
          console.error('Agent执行错误:', err);
          const errorData = {
            type: 'error',
            content: `⚠️ 系统错误: ${err.message}`,
            isStreaming: false,
            progress: 0,
            session_id: sessionId,
          };
          controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(errorData)}\n\n`));
          controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
        }
        controller.close();
      },
    });
    
    // 返回 SSE 响应
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (err: any) {
    console.error('接口初始化错误:', err);
    return new Response(JSON.stringify({ detail: '服务器内部错误' }), { status: 500 });
  }
}
