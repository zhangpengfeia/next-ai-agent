
// 会话列表
import { NextRequest, NextResponse } from 'next/server';
import { ChatSession } from '@/services/server/chat';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 20;

    const sessionManager = new ChatSession();
    const sessions = await sessionManager.listSessions(limit);

    return NextResponse.json({
      code: 200,
      message: '获取成功',
      data: {
        sessions,
        total: sessions.length,
      },
    });
  } catch (error) {
    console.error('获取会话列表异常:', error);
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    return NextResponse.json(
      {
        code: 500,
        message: `获取会话列表失败: ${errorMessage}`,
        data: null,
      },
      { status: 500 }
    );
  }
}
