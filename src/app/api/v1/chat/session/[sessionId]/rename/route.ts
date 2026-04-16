// 重命名会话
import { NextRequest, NextResponse } from 'next/server';
import { ChatSession } from '@/services/server/chat';

export interface RenameSessionRequest {
  session_name: string;
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await context.params;
    const request = (await req.json()) as RenameSessionRequest;

    if (!request.session_name?.trim()) {
      return NextResponse.json(
        {
          code: 400,
          message: '会话名称不能为空',
          data: null,
        },
        { status: 400 }
      );
    }

    if (sessionId === 'default-0') {
      return NextResponse.json(
        {
          code: 403,
          message: '默认会话不可重命名',
          data: null,
        },
        { status: 403 }
      );
    }

    const sessionManager = new ChatSession();
    const success = await sessionManager.renameSession(sessionId, request.session_name);

    if (!success) {
      return NextResponse.json(
        {
          code: 500,
          message: '重命名失败',
          data: null,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      code: 200,
      message: '重命名成功',
      data: {
        session_id: sessionId,
        session_name: request.session_name,
      },
    });
  } catch (error) {
    console.error('重命名会话异常:', error);
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    return NextResponse.json(
      {
        code: 500,
        message: `重命名失败: ${errorMessage}`,
        data: null,
      },
      { status: 500 }
    );
  }
}
