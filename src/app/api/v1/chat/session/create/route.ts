// 创建会话

import { NextRequest, NextResponse } from 'next/server';
import { ChatSession } from '@/services/server/chat';

export interface CreateSessionRequest {
  session_name?: string;
}

export async function POST(req: NextRequest) {
  try {
    const request = (await req.json()) as CreateSessionRequest;
    const sessionManager = new ChatSession();
    const sessionName = request.session_name || '新对话';
    const sessionId = await sessionManager.createSession(sessionName);
    
    if (!sessionId) {
      return NextResponse.json(
        {
          code: 500,
          message: '创建失败',
          data: null,
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      code: 200,
      message: '创建成功',
      data: {
        session_id: sessionId,
        session_name: sessionName,
        create_time: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('创建会话异常:', error);
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    return NextResponse.json(
      {
        code: 500,
        message: `创建会话失败: ${errorMessage}`,
        data: null,
      },
      { status: 500 }
    );
  }
}
