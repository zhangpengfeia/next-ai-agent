import { NextRequest, NextResponse } from 'next/server';
import { ChatSession } from '@/services/server/chat';

interface ParsedMessage {
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  use_rag: number;
  md5: string | null;
  create_time: Date;
}

function parseMessageContent(msg: any): ParsedMessage {
  return {
    session_id: msg.session_id,
    role: msg.role,
    content: msg.content,
    use_rag: msg.use_rag,
    md5: msg.md5,
    create_time: msg.create_time,
  };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('session_id') || 'default';
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 50;

    const sessionManager = new ChatSession();
    const messages = await sessionManager.getHistory(sessionId, limit);
    const parsedMessages = messages.map(parseMessageContent);

    return NextResponse.json({
      code: 200,
      message: '获取成功',
      data: {
        session_id: sessionId,
        history: parsedMessages,
        total: parsedMessages.length,
      },
    });
  } catch (error) {
    console.error('获取历史异常:', error);
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    return NextResponse.json(
      {
        code: 500,
        message: `获取失败: ${errorMessage}`,
        data: {
          session_id: 'default',
          history: [],
          total: 0,
        },
      },
      { status: 500 }
    );
  }
}
