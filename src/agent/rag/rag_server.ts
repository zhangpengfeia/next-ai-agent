import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { Document } from "@langchain/core/documents";
import { VectorStoreService } from "@/agent/rag/vector_store";
import { getFileContent } from "@/agent/utils/cos_file";
import { ChatAlibabaTongyiModel } from "@/agent/model/factory";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { RunnableSequence } from "@langchain/core/runnables";

// 打印拼接后的完整 prompt
function printPrompt(prompt: any) {
  console.log("=".repeat(20));
  console.log(prompt.toString()); // 修复：TS 用 toString()，不是 to_string()
  console.log("=".repeat(20));
  return prompt;
}

export class RagSummarizeService {
  private vectorStore: VectorStoreService;
  private retriever: any;
  private promptText: any | string;
  private promptTemplate: any | PromptTemplate;
  private model: BaseChatModel;
  private chain: any;

  constructor() {
    this.vectorStore = new VectorStoreService();
    this.model = ChatAlibabaTongyiModel;
  }

  // 核心：初始化（加载文件、组装链）
  async init(): Promise<void> {
    this.promptText = await getFileContent("rag_summarize.txt");
    this.promptTemplate = PromptTemplate.fromTemplate(this.promptText);
    this.retriever = await this.vectorStore.getRetriever();

    // 组装 chain
    this.chain = RunnableSequence.from([
      this.promptTemplate,
      printPrompt,
      this.model,
      new StringOutputParser(),
    ]);

    console.log("✅ RAG 服务初始化完成");
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.chain) {
      console.log("🔄 首次调用，自动执行 init()...");
      await this.init();
    }
  }

  // 检索文档
  private async retrieveDocs(query: string): Promise<Document[]> {
    await this.ensureInitialized(); // ✅ 自动初始化
    return this.retriever.invoke(query);
  }

  // 非流式
  async ragSummarize(query: string): Promise<string> {
    await this.ensureInitialized(); // ✅ 自动初始化
    const contextDocs = await this.retrieveDocs(query);
    const context = this.buildContext(contextDocs);
    return this.chain.invoke({ input: query, context });
  }

  // 流式
  async *ragSummarizeStream(query: string): AsyncGenerator<string> {
    await this.ensureInitialized(); // ✅ 自动初始化
    const contextDocs = await this.retrieveDocs(query);
    const context = this.buildContext(contextDocs);
    const stream = await this.chain.stream({ input: query, context });
    for await (const chunk of stream) {
      if (chunk) yield chunk;
    }
  }

  // 拼接上下文
  private buildContext(docs: Document[]): string {
    let context = "";
    let counter = 0;
    for (const doc of docs) {
      counter++;
      context += `【参考资料${counter}】: ${doc.pageContent} | 元数据：${JSON.stringify(doc.metadata)}\n`;
    }
    return context;
  }
}

// ====================== 测试代码 ======================
if (require.main === module) {
  (async () => {
    const rag = new RagSummarizeService();
    const query = "你好, 机器人可以水洗吗";
    console.log("查询:", query);
    let full = "";
    for await (const chunk of rag.ragSummarizeStream(query)) {
      full += chunk;
      process.stdout.write(chunk);
    }
  })();
}