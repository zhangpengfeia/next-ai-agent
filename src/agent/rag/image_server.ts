import axios from 'axios';
import { logger } from '@/agent/utils/loggerHandler';

/**
 * 通义千问图像生成配置接口
 */
interface ImageGenerationConfig {
  model?: string;
  default_size?: string;
  negative_prompt?: string;
  prompt_extend?: boolean;
  watermark?: boolean;
  stream?: boolean;
}

/**
 * 图像生成结果接口
 */
export interface ImageGenerationResult {
  success: boolean;
  data: {
    image_url: string | null;
    raw_response: any | null;
  };
  error: string | null;
}

/**
 * API 响应接口
 */
interface DashScopeResponse {
  output: {
    choices: Array<{
      message: {
        content: Array<{
          image?: string;
          text?: string;
        }>;
      };
    }>;
  };
  status_code?: number;
  code?: string;
  message?: string;
}

/**
 * 通义千问图像生成服务
 */
export class QwenImageService {
  private apiKey: string;
  private imageConfig: ImageGenerationConfig;
  private defaultSize: string;
  private defaultNegativePrompt: string;
  private model: string;
  private promptExtend: boolean;
  private watermark: boolean;
  private stream: boolean;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.DASHSCOPE_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('DASHSCOPE_API_KEY 环境变量未设置');
    }
    this.imageConfig = {
      model: 'qwen-image-2.0',
      default_size: '2048*2048',
      negative_prompt: '低分辨率，低画质，肢体畸形，手指畸形，画面过饱和，蜡像感，人脸无细节，过度光滑，画面具有AI感。构图混乱。文字模糊，扭曲。',
      prompt_extend: true,
      watermark: false,
      stream: false,
    };
    this.defaultSize = this.imageConfig.default_size || '2048*2048';
    this.defaultNegativePrompt = this.imageConfig.negative_prompt || '';
    this.model = this.imageConfig.model || 'qwen-image-2.0';
    this.promptExtend = this.imageConfig.prompt_extend ?? true;
    this.watermark = this.imageConfig.watermark ?? false;
    this.stream = this.imageConfig.stream ?? false;
  }
  /**
   * 根据文本描述生成图像
   * @param prompt - 图像描述文本
   * @param negativePrompt - 负向提示词
   * @param size - 图像尺寸（如：2048*2048）
   * @param stream - 是否流式返回
   * @param watermark - 是否添加水印
   * @param promptExtend - 是否启用提示词扩展
   * @returns 包含生成结果的字典
   */
  async generateImage(
    prompt: string,
    negativePrompt?: string,
    size?: string,
    stream?: boolean,
    watermark?: boolean,
    promptExtend?: boolean
  ): Promise<ImageGenerationResult> {
    const messages = [
      {
        role: 'user',
        content: [{ text: prompt }],
      },
    ];
    try {
      const response = await axios.post<DashScopeResponse>(
        'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation',
        {
          model: this.model,
          input: {
            messages,
          },
          parameters: {
            result_format: 'message',
            stream: stream ?? this.stream,
            watermark: watermark ?? this.watermark,
            prompt_extend: promptExtend ?? this.promptExtend,
            negative_prompt: negativePrompt ?? this.defaultNegativePrompt,
            size: size ?? this.defaultSize,
          },
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
          },
        }
      );
      if (response.status === 200) {
        const imageUrl = this.extractImageUrl(response.data);
        return {
          success: true,
          data: {
            image_url: imageUrl,
            raw_response: response.data,
          },
          error: null,
        };
      } else {
        return {
          success: false,
          data: {
            image_url: null,
            raw_response: null,
          },
          error: `HTTP返回码：${response.status}, 错误信息：${response.statusText}`,
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      logger.error(`图像生成异常：${errorMessage}`);

      // 处理 axios 错误
      if (axios.isAxiosError(error) && error.response) {
        const errorData = error.response.data;
        return {
          success: false,
          data: {
            image_url: null,
            raw_response: null,
          },
          error: `API错误：${errorData?.message || error.message}`,
        };
      }

      return {
        success: false,
        data: {
          image_url: null,
          raw_response: null,
        },
        error: `图像生成异常：${errorMessage}`,
      };
    }
  }

  /**
   * 从响应中提取图像URL
   * @param output - API响应的output字段
   * @returns 图像URL，如果提取失败则返回null
   */
  private extractImageUrl(output: DashScopeResponse): string | null {
    try {
      const choices = output.output?.choices || [];
      if (choices && choices.length > 0) {
        const message = choices[0].message;
        const content = message?.content || [];
        if (content && content.length > 0) {
          return content[0].image || null;
        }
      }
    } catch (error) {
      logger.warn('提取图像URL失败');
    }
    return null;
  }
}

// 导出单例实例
export const imageService = new QwenImageService();

// 测试入口
if (require.main === module) {
  (async () => {
    const testPrompt = '生成一只可爱的小猫';
    const result = await imageService.generateImage(testPrompt);
    if (result.success) {
      const imageUrl = result.data.image_url;
      console.log(`图片地址: ${imageUrl}`);
      // 如需原始完整响应
      const rawData = result.data.raw_response;
      console.log('原始响应:', JSON.stringify(rawData, null, 2));
    } else {
      console.error('生成失败:', result.error);
    }
  })();
}
