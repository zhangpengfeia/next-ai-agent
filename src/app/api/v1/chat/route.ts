// 接口
import type { NextApiHandler  } from 'next';
import { getTest } from '@/services/server/chat'
import { Err } from '@/lib/error';
import { NextRequest, NextResponse } from 'next/server';

export type RawItem = {
  组别: string;
  排名: string;
  分公司: string;
  累计认证客户数: number;
  累计后续开户数: number;
};

export type GroupedData = {
  group: string;
  data: RawItem[];
};

export type getReturn = RawItem[];
export type ApiHandler<T> = NextApiHandler<T | Err>;

// POST
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await getTest(body);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message });
  }
}
