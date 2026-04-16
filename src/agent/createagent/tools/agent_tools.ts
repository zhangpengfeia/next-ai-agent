import { tool } from "@langchain/core/tools";
import { RagSummarizeService } from "@/agent/rag/rag_server";
import { logger } from "@/agent/utils/loggerHandler";
import { imageService } from "@/agent/rag/image_server";
import * as fs from "fs";
import { z } from "zod";
import {apiCity, apiWeather} from "@/agent/createagent/tools/api_gaode";

interface ExternalDataRecord {
  特征: string;
  效率: string;
  耗材: string;
  对比: string;
}

interface ExternalData {
  [userId: string]: {
    [month: string]: ExternalDataRecord;
  };
}

const rag = new RagSummarizeService();
const externalData: ExternalData = {};
/**
 * 从向量存储中检索参考资料
 */
export const ragSummarize = tool(
  async (query: string) => {
    return rag.ragSummarize(query);
  },
  {
    name: "rag_summarize",
    description: "从向量存储中检索参考资料",
  }
);

/**
 * 获取当前城市天气,消息字符串形式返回
 */
export const getWeather = tool(
  async () => {
    const cityInfo = await apiCity();
    const weather = await apiWeather(cityInfo.adcode);
    if (weather) {
      return `城市：${weather.city}\n天气：${weather.weather}\n温度：${weather.temperature}°C\n风向：${weather.winddirection}\n风力：${weather.windpower}级\n湿度：${weather.humidity}%\n更新时间：${weather.reporttime}`;
    } else {
      return '无法获取天气信息';
    }
  },
  {
    name: "get_weather",
    description: "获取当前城市天气,消息字符串形式返回",
  }
);

/**
 * 获取用户所在城市名称，字符串形式返回
 */
export const getUserLocation = tool(
  async () => {
    const cityInfo = await apiCity();
    return JSON.stringify(cityInfo);
  },
  {
    name: "get_user_location",
    description: "获取用户所在城市名称，字符串形式返回",
  }
);

/**
 * 获取用户id
 */
export const getUserId = tool(
  () => {
    return "1003";
  },
  {
    name: "get_user_id",
    description: "获取用户id",
  }
);

/**
 * 获取用户当前月份，字符串形式返回
 */
export const getCurrentMonth = tool(
  () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  },
  {
    name: "get_current_month",
    description: "获取用户当前月份，字符串形式返回",
  }
);

// ==============================
function generateExternalData() {
  if (Object.keys(externalData).length === 0) {
    const externalDataPath = '../../../../agent_demo/data/external/records.csv'; // 链接可以上传cos
    if (!fs.existsSync(externalDataPath)) {
      throw new Error(`外部数据文件${externalDataPath}不存在`);
    }
    const fileContent = fs.readFileSync(externalDataPath, "utf-8");
    const lines = fileContent.split("\n").slice(1); // 跳过表头
    for (const line of lines) {
      if (!line.trim()) continue;
      const arr = line.trim().split(",");
      const userId = arr[0].replace(/"/g, "");
      const feature = arr[1].replace(/"/g, "");
      const efficiency = arr[2].replace(/"/g, "");
      const consumables = arr[3].replace(/"/g, "");
      const comparison = arr[4].replace(/"/g, "");
      const time = arr[5].replace(/"/g, "");

      if (!(userId in externalData)) {
        externalData[userId] = {};
      }
      externalData[userId][time] = {
        特征: feature,
        效率: efficiency,
        耗材: consumables,
        对比: comparison,
      };
    }
  }
}

/**
 * 从外部系统中获取指定用户指定月份的使用记录
 */
export const fetchExternalData = tool(
  async (input: { userId: string; month: string }) => {
    generateExternalData();
    try {
      const data = externalData[input.userId][input.month];
      return JSON.stringify(data);
    } catch (error) {
      logger.warn(`[外部数据] 未找到用户${input.userId}的${input.month}月数据`);
      return "";
    }
  },
  {
    name: "fetch_external_data",
    description: "从外部系统中获取指定用户指定月份的使用记录，以字符串形式返回，未检索则返回空字符串",
    schema: z.object({
      userId: z.string().describe("用户ID"),
      month: z.string().describe("月份，格式：YYYY-MM"),
    }),
  }
);

/**
 * 无入参，无返回值，调用后触发中间件自动为报告生成的场景动态注入上下文信息
 */
export const fillContextForReport = tool(
  () => {
    return "fill_context_for_report已调用";
  },
  {
    name: "fill_context_for_report",
    description: "无入参，无返回值，调用后触发中间件自动为报告生成的场景动态注入上下文信息，为后续提示词切换提供上下文信息",
  }
);

/**
 * 根据文本描述生成静态图像
 */
export const generateImageFromText = tool(
  async (input: { prompt: string; negativePrompt?: string; size?: string }) => {
    try {
      const result = await imageService.generateImage(
        input.prompt,
        input.negativePrompt,
        input.size || "2048*2048"
      );

      if (result.success && result.data.image_url) {
        return result.data.image_url;
      } else {
        logger.error(`图像生成失败: ${result.error}`);
        return "";
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "未知错误";
      logger.error(`图像生成异常: ${errorMessage}`);
      return "";
    }
  },
  {
    name: "generate_image_from_text",
    description: "根据文本描述生成静态图像(不支持视频/动图生成),只返回图片链接,不需要任何文字信息",
    schema: z.object({
      prompt: z.string().describe("图像描述文本"),
      negativePrompt: z.string().optional().describe("负向提示词，默认为空"),
      size: z.string().optional().describe("图像尺寸，默认格式为2048*2048"),
    }),
  }
);

// ==============================
// 测试入口（对应 __main__）
// ==============================
if (require.main === module) {
  (async () => {
    const result = await fetchExternalData.invoke({ userId: "1001", month: "2025-01" });
    console.log(result);
  })();
}