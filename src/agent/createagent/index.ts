import {
  AIMessageChunk
} from "@langchain/core/messages";
import { createAgent } from "langchain";
import { ChatAlibabaTongyiModel } from "@/agent/model/factory";
import { getFileContent } from '@/agent/utils/cos_file';
import agentMiddleware from "@/agent/createagent/tools/middleware";
import {
  fetchExternalData, fillContextForReport, generateImageFromText,
  getCurrentMonth,
  getUserId,
  getUserLocation,
  getWeather,
  ragSummarize
} from "@/agent/createagent/tools/agent_tools";

// 上下文类型
interface AgentContext {
  report: boolean;
  isImageGeneration: boolean;
}

export class ReactAgent {
  private agent: any;
  private initPromise: Promise<void> | null = null; // 核心：保证只初始化一次

  constructor() {
  }
  // 私有初始化方法
  private async init() {
    if (this.agent) return;
    const systemPrompt = await getFileContent('main_prompt.txt');
    this.agent = createAgent({
      model: ChatAlibabaTongyiModel,
      systemPrompt: systemPrompt,
      tools: [
        ragSummarize,
        getWeather,
        getUserLocation,
        getUserId,
        getCurrentMonth,
        fetchExternalData,
        fillContextForReport,
        generateImageFromText
      ],
      middleware: [agentMiddleware]
    });
  }

  private async ensureReady() {
    if (!this.initPromise) {
      this.initPromise = this.init();
    }
    await this.initPromise;
  }

  async *executeStream(
    query: string
  ): AsyncGenerator<string, void, unknown> {
    await this.ensureReady();

    const inputDict = {
      messages: [{ role: "user", content: query }]
    };
    const fullContent: string[] = [];
    const context: AgentContext = {
      report: false,
      isImageGeneration: false
    };

    const stream = await this.agent.stream(inputDict, {
      streamMode: "messages",
      configurable: context
    });

    for await (const chunk of stream) {
      const [message] = Array.isArray(chunk) ? chunk : [chunk, null];
      if (message instanceof AIMessageChunk && message.content) {
        const content = typeof message.content === 'string' ? message.content : JSON.stringify(message.content);
        fullContent.push(content);
        yield content;
      }
    }
  }
}

async function runTest() {
  const query = '你好,我在那个城市？';
  console.log('-'.repeat(60));
  const agent = new ReactAgent(); // ✅ 直接 new
  const resultChunks: string[] = [];
  for await (const chunk of agent.executeStream(query)) {
    resultChunks.push(chunk);
    process.stdout.write(chunk);
  }
  console.log('\n\n完整输出:', resultChunks.join(''));
}

if (require.main === module) {
  runTest();
}