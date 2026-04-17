import { NextRequest } from 'next/server'
import { ReactAgent } from '@/agent/createagent'
import { ChatSession } from '@/services/server/chat'

export interface CustomChatRequest {
  session_id?: string
  messages: Array<{
    role: string
    content: string
  }>
}

/**
 * 判断文本是否为图片URL
 */
function isImageUrl(text: string): boolean {
  if (!text || typeof text !== 'string') {
    return false
  }

  const textLower = text.toLowerCase().trim()

  // 检查是否以 http:// 或 https:// 开头
  if (!textLower.startsWith('http://') && !textLower.startsWith('https://')) {
    return false
  }

  // 检查是否包含图片扩展名
  const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.svg']
  return imageExtensions.some((ext) => textLower.includes(ext))
}

/**
 * 从内容中提取纯文本
 */
function extractTextFromContent(
  content:
    | string
    | Array<{
        type: 'text' | 'image'
        text?: string
        image_url?: string
        description?: string
      }>
): string {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content
      .map((c) => {
        if (typeof c === 'string') return c
        if (c.type === 'text') return c.text || ''
        if (c.type === 'image' && c.description) return `[图片: ${c.description}]`
        return ''
      })
      .join(' ')
  }
  return String(content)
}

/**
 * 序列化内容为字符串
 */
function serializeContent(text: string): string {
  return text
}

/**
 * 构建数据库存储的内容（支持图文混合）
 */
function buildContentForDb(responseText: string, hasImage: boolean): string {
  if (!hasImage) {
    return responseText
  }

  const contentItems: Array<{ type: string; text?: string; image_url?: string }> = []
  let currentText: string[] = []

  const lines = responseText.split('\n')
  for (const line of lines) {
    const lineStripped = line.trim()
    if (isImageUrl(lineStripped)) {
      if (currentText.length > 0) {
        contentItems.push({
          type: 'text',
          text: currentText.join('\n').trim()
        })
        currentText = []
      }
      contentItems.push({
        type: 'image',
        image_url: lineStripped
      })
    } else {
      currentText.push(line)
    }
  }

  if (currentText.length > 0) {
    contentItems.push({
      type: 'text',
      text: currentText.join('\n').trim()
    })
  }

  // 如果只有文本，直接返回文本
  if (contentItems.length === 1 && contentItems[0].type === 'text') {
    return contentItems[0].text || ''
  }

  // 否则返回 JSON 字符串
  return JSON.stringify(contentItems)
}

// POST
export async function POST(req: NextRequest) {
  try {
    const request = (await req.json()) as CustomChatRequest

    // 1. 校验消息列表
    if (!request.messages || request.messages.length === 0) {
      return new Response(JSON.stringify({ detail: '消息列表不能为空' }), { status: 400 })
    }

    // 2. 取最后一条用户消息
    let lastUserMessage: string | null = null
    for (const msg of [...request.messages].reverse()) {
      if (msg.role === 'user') {
        lastUserMessage = extractTextFromContent(msg.content)
        break
      }
    }

    if (!lastUserMessage?.trim()) {
      return new Response(JSON.stringify({ detail: '用户查询内容不能为空' }), { status: 400 })
    }

    // 3. 获取/创建会话
    const agent = new ReactAgent()
    const sessionManager = new ChatSession()
    let sessionId = request.session_id
    if (!sessionId) {
      sessionId = (await sessionManager.createSession('新对话')) || undefined
      if (!sessionId) {
        return new Response(JSON.stringify({ detail: '创建会话失败' }), { status: 500 })
      }
      console.log(`自动创建新会话: ${sessionId}`)
    }
    console.log(`收到请求 - 会话ID: ${sessionId}, 消息数: ${request.messages.length}`)

    // 4. 保存用户消息
    const contentStr = serializeContent(lastUserMessage)
    await sessionManager.addMessage(sessionId, 'user', contentStr, 0)

    // 5. SSE 流式生成器
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const fullResponse: string[] = []
          let hasImage = false

          // 流式执行 agent
          for await (const chunk of agent.executeStream(lastUserMessage)) {
            fullResponse.push(chunk)

            // 使用改进的图片 URL 判断函数
            const trimmedChunk = chunk.trim()
            const isImage = isImageUrl(trimmedChunk)
            let streamData

            if (isImage) {
              hasImage = true
              streamData = {
                type: 'image',
                image_url: trimmedChunk,
                isStreaming: false,
                progress: 100,
                session_id: sessionId
              }
            } else {
              streamData = {
                type: 'text',
                content: chunk,
                isStreaming: true,
                progress: 0,
                session_id: sessionId
              }
            }

            const data = `data: ${JSON.stringify(streamData)}\n\n`
            controller.enqueue(new TextEncoder().encode(data))
          }

          // 6. 保存助手消息（使用改进的构建函数）
          const assistantResponse = fullResponse.join('')
          const contentForDb = buildContentForDb(assistantResponse, hasImage)
          await sessionManager.addMessage(sessionId, 'assistant', contentForDb, 0)

          // 7. 发送完成信号
          const completeData = {
            type: 'complete',
            content: '',
            isComplete: true,
            session_id: sessionId
          }
          controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(completeData)}\n\n`))
          controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'))
        } catch (err: any) {
          console.error('Agent执行错误:', err)
          const errorData = {
            type: 'error',
            content: `⚠️ 系统错误: ${err.message}`,
            isStreaming: false,
            progress: 0,
            session_id: sessionId
          }
          controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(errorData)}\n\n`))
          controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'))
        }
        controller.close()
      }
    })

    // 返回 SSE 响应
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'Access-Control-Allow-Origin': '*'
      }
    })
  } catch (err) {
    console.error('接口初始化错误:', err)
    return new Response(JSON.stringify({ detail: '服务器内部错误' }), { status: 500 })
  }
}
