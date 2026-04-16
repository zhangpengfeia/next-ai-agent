import { Chroma } from "@langchain/community/vectorstores/chroma";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { Document } from "@langchain/core/documents";
import { embedModel } from "@/agent/model/factory";
import { getChromaClient } from "@/lib/config/db/chrome_client";
import { logger } from "@/agent/utils/loggerHandler";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
import {
  checkFileMd5Exists,
  saveFileMd5,
} from "@/services/server/agent/chrome";
import { PDFParse } from 'pdf-parse'

// ====================== 配置 ======================
const CHROMA_CONFIG = {
  collectionName: "knowledge_base",
  persistDirectory: "./chroma_db",
  separators: ["\n\n", "\n", " ", ""],
  chunkSize: 1000,
  chunkOverlap: 200,
  k: 5,
  dataPath: "../../../../agent_demo/data",
  allowKnowledgeFileType: [".txt", ".pdf"],
};

// ====================== 文件加载器 ======================
class FileLoader {
  /**
   * 加载 TXT 文件
   */
  async loadTxt(filePath: string): Promise<Document[]> {
    try {
      const content = await fs.readFile(filePath, "utf-8");
      return [
        new Document({
          pageContent: content,
          metadata: { source: filePath, type: "txt" },
        }),
      ];
    } catch (error) {
      logger.error(`加载 TXT 文件失败 ${filePath}: ${error}`);
      return [];
    }
  }

  /**
   * 加载 PDF 文件（需要安装 pdf-parse）
   */
  async loadPdf(filePath: string): Promise<Document[]> {
    try {
      const data = new PDFParse({ url: filePath });
      const result = await data.getText();
      return [
        new Document({
          pageContent: result.text,
          metadata: { source: filePath, type: "pdf" },
        }),
      ];
    } catch (error) {
      logger.error(`加载 PDF 文件失败 ${filePath}: ${error}`);
      return [];
    }
  }
  /**
   * 根据文件类型加载
   */
  async loadFile(filePath: string): Promise<Document[]> {
    if (filePath.endsWith(".txt")) {
      return this.loadTxt(filePath);
    }
    else if (filePath.endsWith(".pdf")) {
      return this.loadPdf(filePath);
    }
    return [];
  }
}

// ====================== 向量存储服务 ======================
export class VectorStoreService {
  private vectorStore: Chroma | null = null;
  private textSplitter: RecursiveCharacterTextSplitter;
  private fileLoader: FileLoader;

  constructor() {
    // 文本分块
    this.textSplitter = new RecursiveCharacterTextSplitter({
      separators: CHROMA_CONFIG.separators,
      chunkSize: CHROMA_CONFIG.chunkSize,
      chunkOverlap: CHROMA_CONFIG.chunkOverlap,
      lengthFunction: (text) => text.length,
    });

    // 文件加载器
    this.fileLoader = new FileLoader();
  }

  /**
   * 初始化向量存储（延迟初始化）
   */
  private async initVectorStore(): Promise<Chroma> {
    if (!this.vectorStore) {
      const chromaClient = await getChromaClient();
      this.vectorStore = new Chroma(embedModel, {
        index: chromaClient,
        collectionName: CHROMA_CONFIG.collectionName,
      });
    }
    return this.vectorStore;
  }

  /**
   * 获取检索器
   */
  async getRetriever() {
    const vectorStore = await this.initVectorStore();
    return vectorStore.asRetriever({
      k: CHROMA_CONFIG.k,
    });
  }

  /**
   * 计算文件 MD5
   */
  private async calculateFileMD5(filePath: string): Promise<string> {
    const fileBuffer = await fs.readFile(filePath);
    const hash = crypto.createHash("md5");
    hash.update(fileBuffer);
    return hash.digest("hex");
  }

  /**
   * 获取目录下允许的文件
   */
  private async getAllowedFiles(dirPath: string): Promise<string[]> {
    try {
      const files = await fs.readdir(dirPath);
      return files
        .filter((file) => {
          const ext = path.extname(file).toLowerCase();
          return CHROMA_CONFIG.allowKnowledgeFileType.includes(ext);
        })
        .map((file) => path.join(dirPath, file));
    } catch (error) {
      logger.error(`读取目录失败 ${dirPath}: ${error}`);
      return [];
    }
  }

  /**
   * 添加文档到向量库
   */
  async addDocuments(): Promise<void> {
    const vectorStore = await this.initVectorStore();
    const dataPath = path.resolve(CHROMA_CONFIG.dataPath);
    console.log(dataPath)
    const allowedFiles = await this.getAllowedFiles(dataPath);
    logger.info(`[加载知识库] 找到 ${allowedFiles.length} 个文件`);
    for (const filePath of allowedFiles) {
      try {
        // 计算 MD5
        const md5Hex = await this.calculateFileMD5(filePath);
        const fileName = path.basename(filePath);

        // 检查是否已处理
        if (await checkFileMd5Exists(md5Hex)) {
          logger.info(`[加载知识库] 文件 ${fileName} 已处理过（MySQL）`);
          continue;
        }
        // 加载文件
        const documents = await this.fileLoader.loadFile(filePath);
        if (documents.length === 0) {
          logger.warn(`[加载知识库] ${fileName} 没有有效文本，跳过`);
          continue;
        }
        // 分片
        const splitDocuments = await this.textSplitter.splitDocuments(documents);
        if (splitDocuments.length === 0) {
          logger.warn(`[加载知识库] ${fileName} 分片后没有有效文本，跳过`);
          continue;
        }
        // 添加到向量库
        await vectorStore.addDocuments(splitDocuments);
        // 保存 MD5
        await saveFileMd5(md5Hex, fileName);
        logger.info(`[加载知识库] 向量库添加文件 ${fileName} 成功，共 ${splitDocuments.length} 个分片`);
      } catch (error) {
        logger.error(`[加载知识库] 向量库添加文件 ${filePath} 失败：${error}`);
        continue;
      }
    }
  }

  /**
   * 检索相关文档
   */
  async search(query: string): Promise<Document[]> {
    const retriever = await this.getRetriever();
    return retriever.invoke(query);
  }
}

// ====================== 测试代码 ======================
if (require.main === module) {
  (async () => {
    // 测试嵌入模型
    try {
      const testEmbedding = await embedModel.embedQuery("测试");
      logger.info(`嵌入模型测试成功，向量维度：${testEmbedding.length}`);
    } catch (error) {
      logger.error(`嵌入模型测试失败：${error}`);
      process.exit(1);
    }

    // 测试向量库
    const vs = new VectorStoreService();
    await vs.addDocuments();

    const results = await vs.search("维护保养");
    results.forEach((doc, index) => {
      console.log(`结果 ${index + 1}:`);
      console.log(doc.pageContent);
      console.log("_".repeat(20));
    });
  })();
}

export default VectorStoreService;
