// src/services/server/chat/index.ts
import { getConnection } from '@/lib/config/db/mysql_client';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/agent/utils/loggerHandler';

// 会话接口定义
interface ChatSessionData {
  session_id: string;
  session_name: string;
  create_time: Date;
  update_time: Date;
}

interface ChatMessageData {
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  use_rag: number;
  md5: string | null;
  create_time: Date;
}

export class ChatSession {
  /**
   * 创建新会话，返回 session_id
   */
  async createSession(sessionName: string = "新对话"): Promise<string | null> {
    const sessionId = uuidv4().replace(/-/g, '');
      const pool = await getConnection();
      await pool.execute(
        'INSERT INTO chat_session (session_id, session_name, create_time, update_time) VALUES (?, ?, NOW(), NOW())',
        [sessionId, sessionName]
      );
      return sessionId;
  }

  /**
   * 获取会话列表
   */
 async listSessions(limit: number = 20): Promise<ChatSessionData[]> {
  const pool = await getConnection();
  const [rows] = await pool.execute(
    `SELECT session_id, session_name, create_time, update_time 
     FROM chat_session 
     ORDER BY update_time DESC 
     LIMIT ${parseInt(String(limit), 10)}`
  );
  return Array.isArray(rows) ? (rows as ChatSessionData[]) : [];
}

  /**
   * 重命名会话
   */
  async renameSession(sessionId: string, newName: string): Promise<boolean> {
      const pool = await getConnection();
      const [result] = await pool.execute(
        'UPDATE chat_session SET session_name = ?, update_time = NOW() WHERE session_id = ?',
        [newName, sessionId]
      );
      return (result as any).affectedRows > 0;
  }

  /**
   * 保存单条聊天记录
   * @param sessionId - 会话ID
   * @param role - 角色: user / assistant
   * @param content - 消息内容
   * @param useRag - 是否使用RAG
   * @param md5 - MD5哈希值（可选）
   */
  async addMessage(
    sessionId: string,
    role: 'user' | 'assistant',
    content: string,
    useRag: number = 0,
    md5: string | null = null
  ): Promise<boolean> {
      const pool = await getConnection();
      await pool.execute(
        'INSERT INTO chat_message (session_id, role, content, use_rag, md5, create_time) VALUES (?, ?, ?, ?, ?, NOW())',
        [sessionId, role, content, useRag, md5]
      );
      return true;
  }

  /**
   * 获取一个会话的历史消息（用于上下文）
   */
async getHistory(sessionId: string, limit: number = 10): Promise<ChatMessageData[]> {
  const pool = await getConnection();
  const [rows] = await pool.execute(
    `SELECT session_id, role, content, use_rag, md5, create_time 
     FROM chat_message 
     WHERE session_id = ? 
     ORDER BY create_time ASC 
     LIMIT ${parseInt(String(limit), 10)}`,
    [sessionId]
  );
  return Array.isArray(rows) ? (rows as ChatMessageData[]) : [];
}

  /**
   * 清空会话消息
   */
  async clearHistory(sessionId: string): Promise<boolean> {
      const pool = await getConnection();
      const [result] = await pool.execute(
        'DELETE FROM chat_message WHERE session_id = ?',
        [sessionId]
      );
      return (result as any).affectedRows > 0;
  }

  /**
   * 删除会话及其所有消息
   */
  async deleteSession(sessionId: string): Promise<boolean> {
      const pool = await getConnection();
      // 开始事务
      const connection = await pool.getConnection();
      await connection.beginTransaction();
      try {
        // 先删除该会话的所有消息
        await connection.execute('DELETE FROM chat_message WHERE session_id = ?', [sessionId]);
        // 再删除会话记录
        await connection.execute('DELETE FROM chat_session WHERE session_id = ?', [sessionId]);

        await connection.commit();
        return true;
      } finally {
        connection.release();
      }
  }
}

// 导出单例实例
export const chatSessionService = new ChatSession();

// 原有的 getTest 函数保持不变
export async function getTest(body: { start_date: number; query_type: number }) {
    const pool = await getConnection('crmcounter');

    // MySQL 使用预处理语句，参数用 ? 占位
    const [rows] = await pool.execute(
      'CALL p_counter_get_poster_enterprise_certification(?, ?)',
      [body.start_date, body.query_type]
    );
    // execute 返回的是 [rows, fields]，rows 就是结果集
    return rows;
}
