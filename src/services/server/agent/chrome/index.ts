// src/services/server/agent/chrome/index.ts
import { getConnection } from '@/lib/config/db/mysql_client';

/**
 * 检查文件 MD5 是否存在
 * @param md5Hex - 文件 MD5 哈希值
 * @returns 是否存在
 */
export async function checkFileMd5Exists(md5Hex: string): Promise<boolean> {
  try {
    const pool = await getConnection();
    const [rows]: any = await pool.execute(
      'SELECT 1 FROM file_md5_record WHERE md5 = ? LIMIT 1',
      [md5Hex]
    );
    return Array.isArray(rows) && rows.length > 0;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : '未知错误';
    console.error('查询 MD5 失败:', errorMessage);
    return false;
  }
}

/**
 * 保存文件 MD5 记录
 * @param md5Hex - 文件 MD5 哈希值
 * @param fileName - 文件名（可选）
 */
export async function saveFileMd5(md5Hex: string, fileName?: string): Promise<void> {
  try {
    const pool = await getConnection();
    await pool.execute(
      `INSERT IGNORE INTO file_md5_record 
       (md5, file_name, create_time) 
       VALUES (?, ?, NOW())`,
      [md5Hex, fileName || null]
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : '未知错误';
    console.error('保存 MD5 失败:', errorMessage);
    throw new Error(`保存 MD5 失败: ${errorMessage}`);
  }
}

/**
 * 获取所有已处理的文件 MD5 列表
 * @returns MD5 记录数组
 */
export async function getAllProcessedFiles(): Promise<Array<{ md5: string; file_name: string; create_time: Date }>> {
  try {
    const pool = await getConnection();
    const [rows]: any = await pool.execute(
      'SELECT md5, file_name, create_time FROM file_md5_record ORDER BY create_time DESC'
    );
    return rows;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : '未知错误';
    console.error('查询已处理文件列表失败:', errorMessage);
    return [];
  }
}

/**
 * 删除指定的 MD5 记录
 * @param md5Hex - 文件 MD5 哈希值
 */
export async function deleteFileMd5(md5Hex: string): Promise<boolean> {
  try {
    const pool = await getConnection();
    const [result]: any = await pool.execute(
      'DELETE FROM file_md5_record WHERE md5 = ?',
      [md5Hex]
    );
    return result.affectedRows > 0;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : '未知错误';
    console.error('删除 MD5 记录失败:', errorMessage);
    return false;
  }
}

/**
 * 批量保存文件 MD5 记录
 * @param records - MD5 记录数组
 */
export async function batchSaveFileMd5(records: Array<{ md5: string; fileName?: string }>): Promise<void> {
  try {
    const pool = await getConnection();
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      for (const record of records) {
        await connection.execute(
          `INSERT IGNORE INTO file_md5_record 
           (md5, file_name, create_time) 
           VALUES (?, ?, NOW())`,
          [record.md5, record.fileName || null]
        );
      }

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : '未知错误';
    console.error('批量保存 MD5 失败:', errorMessage);
    throw new Error(`批量保存 MD5 失败: ${errorMessage}`);
  }
}
