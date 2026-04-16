import { NextRequest, NextResponse } from 'next/server';
import { ChatSession } from '@/services/server/chat';

export interface AddMessageRequest {
  session_id: string;
  role: 'user' | 'assistant';
  content: any;
  use_rag?: number;
  md5?: string | null;
}

function serializeContent(content: any): string {
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

export async function POST(req: NextRequest) {
  try {
    const request = (await req.json()) as AddMessageRequest;

    if (!request.session_id?.trim()) {
      return NextResponse.json(
        {
          code: 400,
          message: '会话ID不能为空',
          data: null,
        },
        { status: 400 }
      );
    }

    if (!request.role || !['user', 'assistant'].includes(request.role)) {
      return NextResponse.json(
        {
          code: 400,
          message: '角色必须是 user 或 assistant',
          data: null,
        },
        { status: 400 }
      );
    }

    const contentStr = serializeContent(request.content);
    const sessionManager = new ChatSession();
    const success = await sessionManager.addMessage(
      request.session_id,
      request.role,
      contentStr,
      request.use_rag || 0,
      request.md5 || null
    );

    if (!success) {
      return NextResponse.json(
        {
          code: 500,
          message: '保存消息失败',
          data: null,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      code: 200,
      message: '保存成功',
      data: {
        session_id: request.session_id,
        role: request.role,
      },
    });
  } catch (error) {
    console.error('保存消息异常:', error);
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    return NextResponse.json(
      {
        code: 500,
        message: `保存消息失败: ${errorMessage}`,
        data: null,
      },
      { status: 500 }
    );
  }
}
