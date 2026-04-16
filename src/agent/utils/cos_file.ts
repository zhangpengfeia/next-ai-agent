import cos from '@/lib/config/db/cos_client';

const BUCKET = 'aiagent-1301349525';
const REGION = 'ap-beijing';
const PROMPT_PREFIX = 'robotVacuumCleaner_prompts/';

/**
 * 根据文件名从 COS 获取文件内容
 * @param fileName - 文件名（例如：main_prompt.txt 或 main_prompt）
 * @returns 文件内容字符串
 */
export async function getFileContent(fileName: string): Promise<string> {
  return new Promise((resolve, reject) => {
    let key = fileName;

    if (!fileName.startsWith(PROMPT_PREFIX)) {
      key = `${PROMPT_PREFIX}${fileName}`;
    }

    if (!fileName.endsWith('.txt')) {
      key = `${key}.txt`;
    }

    cos.getObject(
      {
        Bucket: BUCKET,
        Region: REGION,
        Key: key,
      },
      (err, data) => {
        if (err) {
          console.error(`[COS 读取文件失败] ${key}:`, err);
          reject(new Error(`Failed to read file from COS: ${key}`));
          return;
        }

        const content = data.Body.toString('utf-8');
        console.log(`[成功从 COS 读取文件] ${key}`);
        resolve(content);
      }
    );
  });
}

/**
 * 批量获取多个文件的内容
 * @param fileNames - 文件名数组
 * @returns 文件名到内容的映射
 */
export async function getMultipleFileContents(fileNames: string[]): Promise<Record<string, string>> {
  const results: Record<string, string> = {};

  for (const fileName of fileNames) {
    try {
      const content = await getFileContent(fileName);
      const cleanName = fileName.replace('.txt', '').replace(PROMPT_PREFIX, '');
      results[cleanName] = content;
    } catch (error) {
      console.warn(`[警告] 无法读取文件 ${fileName}:`, error);
    }
  }

  return results;
}

/**
 * 获取指定目录下的所有文件列表
 * @param prefix - 目录前缀，默认为 robotVacuumCleaner_prompts/
 * @returns 文件名数组（不含路径前缀）
 */
export async function listFiles(prefix: string = PROMPT_PREFIX): Promise<string[]> {
  return new Promise((resolve, reject) => {
    cos.getBucket(
      {
        Bucket: BUCKET,
        Region: REGION,
        Prefix: prefix,
      },
      (err, data) => {
        if (err) {
          console.error('[COS 获取文件列表失败]:', err);
          reject(err);
          return;
        }

        const files = data.Contents.filter(item => item.Size !== '0');
        const fileNames = files.map(item => item.Key.replace(prefix, ''));
        resolve(fileNames);
      }
    );
  });
}
