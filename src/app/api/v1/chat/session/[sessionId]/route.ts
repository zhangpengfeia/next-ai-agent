import { NextRequest, NextResponse } from 'next/server';
import { ChatSession } from '@/services/server/chat';

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await context.params;

    if (sessionId === 'default-0') {
      return NextResponse.json(
        {
          code: 403,
          message: '默认会话不可删除',
          data: null,
        },
        { status: 403 }
      );
    }

    const sessionManager = new ChatSession();
    const success = await sessionManager.deleteSession(sessionId);

    if (!success) {
      return NextResponse.json(
        {
          code: 500,
          message: '删除会话失败',
          data: null,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      code: 200,
      message: '删除成功',
      data: {
        session_id: sessionId,
      },
    });
  } catch (error) {
    console.error('删除会话异常:', error);
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    return NextResponse.json(
      {
        code: 500,
        message: `删除失败: ${errorMessage}`,
        data: null,
      },
      { status: 500 }
    );
  }
}
