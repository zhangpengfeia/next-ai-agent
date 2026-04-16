"use client"
import {
  CloudUploadOutlined,
  CommentOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  EllipsisOutlined,
  GlobalOutlined,
  HeartOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  PaperClipOutlined,
  ProductOutlined,
  QuestionCircleOutlined,
  ScheduleOutlined,
  ShareAltOutlined,
  SmileOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import type { ActionsFeedbackProps, BubbleListProps, ThoughtChainItemProps } from '@ant-design/x';
import {
  Actions,
  Attachments,
  Bubble,
  Conversations,
  Prompts,
  Sender,
  Think,
  ThoughtChain,
  Welcome,
  XProvider,
} from '@ant-design/x';
import type { ComponentProps } from '@ant-design/x-markdown';
import XMarkdown from '@ant-design/x-markdown';
import {
  useXChat,
  useXConversations,
  XModelMessage,
  XRequest,
  AbstractChatProvider, DefaultMessageInfo, XRequestOptions
} from '@ant-design/x-sdk';
import {Avatar, Button,  Flex, type GetProp, Input, message, Modal, Pagination, Space} from 'antd';
import React, {useRef, useState} from 'react';
import '@ant-design/x-markdown/themes/light.css';
import '@ant-design/x-markdown/themes/dark.css';
import { BubbleListRef } from '@ant-design/x/es/bubble';
import { useMarkdownTheme } from './Xmarkdown/utils';
import locale from '@/app/utils/locale';
import styles from './styles.module.css';
import {createSession, deleteSession, getMessageHistory, listSessions, renameSession} from "@/services/client/chat";


// 类型定义：自定义聊天系统的输入输出和消息结构
// Type definitions: custom chat system input/output and message structure
interface CustomInput {
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
  userAction?: string
  stream?: boolean;
  model?: string;
  session_id?: string;
}

interface CustomOutput {
  data: {
    content: string;
    attachments?: {
      name: string;
      url: string;
      type: string;
      size?: number;
    }[];
  };
}

interface TransformMessageInfo {
  originMessage?: ChatMessage;
  chunk?: {
    data?: string;
  };
}

// ==================== Type ====================
interface ChatMessage extends CustomMessage {
  extraInfo?: {
    feedback: ActionsFeedbackProps['value'];
  };
}

interface CustomMessage extends XModelMessage{
  content: string;
  role: 'user' | 'assistant' | 'system';
}

// ==================== Static Config ====================
// 热门话题
const HOT_TOPICS = {
  key: '1',
  label: locale.hotTopics,
  children: [
    {
      key: '1-1',
      description: locale.whatComponentsAreInAntDesignX,
      icon: <span style={{ color: '#f93a4a', fontWeight: 700 }}>1</span>,
    },
    {
      key: '1-2',
      description: locale.newAgiHybridInterface,
      icon: <span style={{ color: '#ff6565', fontWeight: 700 }}>2</span>,
    },
  ],
};
// 设计指南
const DESIGN_GUIDE = {
  key: '2',
  label: locale.designGuide,
  children: [
    {
      key: '2-1',
      icon: <HeartOutlined />,
      label: locale.intention,
      description: locale.aiUnderstandsUserNeedsAndProvidesSolutions,
    },
    {
      key: '2-2',
      icon: <SmileOutlined />,
      label: locale.role,
      description: locale.aiPublicPersonAndImage,
    },
    {
      key: '2-3',
      icon: <CommentOutlined />,
      label: locale.chat,
      description: locale.howAICanExpressItselfWayUsersUnderstand,
    },
    {
      key: '2-4',
      icon: <PaperClipOutlined />,
      label: locale.interface,
      description: locale.aiBalances,
    },
  ],
};
// 对话footer
const SENDER_PROMPTS: GetProp<typeof Prompts, 'items'> = [
  {
    key: '1',
    description: locale.upgrades,
    icon: <ScheduleOutlined />,
  },
  {
    key: '2',
    description: locale.components,
    icon: <ProductOutlined />,
  }
];
// 对话状态码
const THOUGHT_CHAIN_CONFIG = {
  loading: {
    title: locale.modelIsRunning,
    status: 'loading',
  },
  updating: {
    title: locale.modelIsRunning,
    status: 'loading',
  },
  success: {
    title: locale.modelExecutionCompleted,
    status: 'success',
  },
  error: {
    title: locale.executionFailed,
    status: 'error',
  },
  abort: {
    title: locale.aborted,
    status: 'abort',
  },
};
// 本地默认对话
const DEFAULT_CONVERSATIONS_ITEMS = [
  {
    key: 'default-0',
    label: "默认会话",
    group: "默认会话",
  },
];

// ==================== Context ====================
const ChatContext = React.createContext<{
  onReload?: ReturnType<typeof useXChat>['onReload'];
  setMessage?: ReturnType<typeof useXChat<ChatMessage>>['setMessage'];
}>({});

// ==================== Sub Component ====================
const ThinkComponent = React.memo((props: ComponentProps) => {
  const [title, setTitle] = React.useState(`${locale.deepThinking}...`);
  const [loading, setLoading] = React.useState(true);
  React.useEffect(() => {
    if (props.streamStatus === 'done') {
      setTitle(locale.completeThinking);
      setLoading(false);
    }
  }, [props.streamStatus]);

  return (
    <Think title={title} loading={loading}>
      {props.children}
    </Think>
  );
});
ThinkComponent.displayName = 'ThinkComponent';

// 自定义Provider实现：继承AbstractChatProvider实现自定义聊天逻辑
class CustomProvider<
  ChatMessage extends CustomMessage = CustomMessage,
  Input extends CustomInput = CustomInput,
  Output extends CustomOutput = CustomOutput,
> extends AbstractChatProvider<ChatMessage, Input, Output> {
  // 转换请求参数：将用户输入消息，转换为参数标准格式
  transformParams(
    requestParams: Partial<Input>,
    options: XRequestOptions<Input, Output, ChatMessage>,
  ): Input {
    if (typeof requestParams !== 'object') {
      throw new Error('requestParams must be an object');
    }

    if (requestParams.userAction === 'retry') {
      const messages = this.getMessages();
      const queryMessage = (messages || [])?.reverse().find(({ role }) => {
        return role === 'user';
      });
      return {
        messages: queryMessage ? [{ role: queryMessage.role, content: queryMessage.content }] : [],
        stream: requestParams.stream ?? options?.params?.stream ?? true,
        model: requestParams.model ?? options?.params?.model ?? 'qwen2.5-7b-instruct',
        session_id: requestParams.session_id ?? options?.params?.session_id ?? '',
      } as Input;
    }

    return {
      messages: requestParams.messages || [],
      stream: requestParams.stream ?? options?.params?.stream ?? true,
      model: requestParams.model ?? options?.params?.model ?? 'qwen2.5-7b-instruct',
      session_id: requestParams.session_id ?? options?.params?.session_id ?? '',
    } as Input;
  }

  // 转换本地消息：将请求参数转换为本地消息格式
  // Transform local message: convert request parameters to local message format
  transformLocalMessage(requestParams: Partial<Input>): ChatMessage {
    const lastMessage = requestParams.messages?.[requestParams.messages.length - 1];
    return {
      content: lastMessage?.content || '',
      role: lastMessage?.role || 'user',
    } as ChatMessage;
  }

  // 转换消息：处理流式响应数据
  // Transform message: process streaming response data
  transformMessage(info: any): ChatMessage {
    const { originMessage, chunk } = info || {};
    // 处理完成标记或空数据
    // Handle completion marker or empty data
    if (!chunk || !chunk?.data || chunk?.data?.includes('[DONE]')) {
      return {
        content: originMessage?.content || '',
        role: 'assistant'
      } as ChatMessage;
    }
    try {
      // 处理流式数据：解析JSON格式
      // Process streaming data: parse JSON format
      const data = JSON.parse(chunk.data);
      const content = originMessage?.content || '';

      // 合并附件信息，避免数据丢失
      // Merge attachment information to avoid data loss
      const existingAttachments = originMessage?.attachments || [];
      const newAttachments: CustomMessage['attachments'] = data.attachments || [];
      const mergedAttachments = [...existingAttachments];

      // 只添加新的附件，避免重复
      // Only add new attachments to avoid duplicates
      newAttachments?.forEach((newAttach: NonNullable<CustomMessage['attachments']>[0]) => {
        if (!mergedAttachments.some((existing) => existing.url === newAttach.url)) {
          mergedAttachments.push(newAttach);
        }
      });

      return {
        content: `${content}${data.content || ''}`,
        role: 'assistant'
      } as ChatMessage;
    } catch (_error) {
      // 如果解析失败，直接使用原始数据
      // If parsing fails, use raw data directly
      return {
        content: `${originMessage?.content || ''}${chunk.data || ''}`,
        role: 'assistant'
      } as ChatMessage;
    }
  }
}

// 从后端获取会话历史消息
const getApiHistoryMessages = async (conversationKey: string): Promise<DefaultMessageInfo<ChatMessage>[]> => {
  try {
    const response = await getMessageHistory(conversationKey, 50);

    if (response.code === 200 && response.data?.messages && Array.isArray(response.data.messages)) {
      return response.data.messages.map((msg: any) => ({
        message: {
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        },
        status: 'success' as const,
      }));
    }
  } catch (error) {
    console.error('获取历史消息失败:', error);
  }
  return [];
};

const Independent: React.FC = () => {
  // ==================== State ====================

  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);
  const [isMobile, setIsMobile] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadingProgress, setLoadingProgress] = React.useState(0);
  const [loadingText, setLoadingText] = React.useState('正在初始化...');

  // 监听窗口大小变化，当屏幕宽度小于680px时自动折叠侧边栏
  React.useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 680;
      setIsMobile(mobile);
      if (mobile) {
        setIsSidebarCollapsed(true);
      }
    };

    // 初始化时检查
    handleResize();

    // 添加事件监听
    window.addEventListener('resize', handleResize);

    // 清理函数
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // 首屏加载动画控制
  React.useEffect(() => {
    let progress = 0;
    const loadingSteps = [
      { threshold: 20, text: '正在连接服务器...' },
      { threshold: 40, text: '正在加载会话列表...' },
      { threshold: 60, text: '正在初始化聊天环境...' },
      { threshold: 80, text: '正在准备就绪...' },
      { threshold: 100, text: '加载完成' },
    ];
    let currentStep = 0;

    const progressInterval = setInterval(() => {
      if (progress < 95) {
        progress += Math.random() * 3 + 1;
        if (progress > 95) progress = 95;

        // 更新加载文本
        if (currentStep < loadingSteps.length - 1 && progress >= loadingSteps[currentStep].threshold) {
          setLoadingText(loadingSteps[currentStep].text);
          currentStep++;
        }

        setLoadingProgress(Math.min(progress, 95));
      }
    }, 100);

    // 模拟加载完成
    const loadTimer = setTimeout(() => {
      clearInterval(progressInterval);
      setLoadingProgress(100);
      setLoadingText('加载完成');

      setTimeout(() => {
        setIsLoading(false);
      }, 300);
    }, 2000);

    return () => {
      clearInterval(progressInterval);
      clearTimeout(loadTimer);
    };
  }, []);

  // 点击遮罩层关闭侧边栏
  const handleOverlayClick = () => {
    if (isMobile) {
      setIsSidebarCollapsed(true);
    }
  };

  // 缓存每个会话的 Provider 实例
  const providerCaches = React.useRef<Map<string, CustomProvider<CustomMessage, CustomInput, CustomOutput>>>(new Map());

  // 根据会话 key 获取或创建 Provider
  const getProvider = (conversationKey: string) => {
    if (!providerCaches.current.has(conversationKey)) {
      providerCaches.current.set(
        conversationKey,
        new CustomProvider<CustomMessage, CustomInput, CustomOutput>({
          request: XRequest('/api/v1/chat/stream', {
            manual: true,
            params: {
              stream: true,
              messages: [],
              model: 'qwen2.5-7b-instruct',
              session_id: conversationKey,
            },
          }),
        }),
      );
    }
    return providerCaches.current.get(conversationKey)!;
  };

  const {
    conversations,
    activeConversationKey,
    setActiveConversationKey,
    addConversation,
    setConversations,
  } = useXConversations({
    defaultConversations: DEFAULT_CONVERSATIONS_ITEMS,
    defaultActiveConversationKey: DEFAULT_CONVERSATIONS_ITEMS[0].key,
  });

  const [className] = useMarkdownTheme();
  const [messageApi, contextHolder] = message.useMessage();

  const getApiDefaultConversations = async () => {
  try {
    const response = await listSessions(50);

    if (response.code === 200 && response.data?.sessions && Array.isArray(response.data.sessions)) {
      const conversations = response.data.sessions.map((item: any) => ({
        key: item.session_id,
        label: item.session_name || '未命名会话',
        group: item.group || locale.today,
      }));
      setConversations(conversations);
      if (!activeConversationKey || !conversations.find((c: { key: string }) => c.key === activeConversationKey)) {
        setActiveConversationKey(conversations[0].key);
      }
      return conversations;
    }
  } catch (error) {
    console.error('获取会话列表失败:', error);
    messageApi.error('获取会话列表失败，请稍后重试');
  }
  return [];
};

  // 创建新会话
  const handleCreateNewConversation = async () => {
    try {
      if (messages.length === 0) {
        messageApi.error(locale.itIsNowANewConversation);
        return;
      }

      const response = await createSession({
        session_name: `${locale.newConversation} ${conversations.length + 1}`,
      });

      if (response.code === 200 && response.data?.session_id) {
        const newSessionId = response.data.session_id;

        addConversation({
          key: newSessionId,
          label: response.data.session_name || `${locale.newConversation} ${conversations.length + 1}`,
          group: locale.today,
        });

        setActiveConversationKey(newSessionId);

        messageApi.success('创建新会话成功');
      } else {
        throw new Error('创建会话失败');
      }
    } catch (error) {
      console.error('创建新会话失败:', error);
      messageApi.error('创建新会话失败，请稍后重试');
    }
  };

  // 打开重命名弹窗
  const handleOpenRenameModal = (conversation: any) => {
    const currentLabel = typeof conversation.label === 'string' ? conversation.label : '';
    // 移除 [当前会话] 前缀
    const cleanLabel = currentLabel.replace(/\[.*?\]/, '');
    setRenameSessionId(conversation.key);
    setRenameValue(cleanLabel);
    setRenameModalOpen(true);
  };

  // 确认重命名
  const handleConfirmRename = async () => {
    if (!renameValue.trim()) {
      messageApi.warning('会话名称不能为空');
      return;
    }

    try {
      const response = await renameSession(renameSessionId, {
        session_name: renameValue.trim(),
      });

      if (response.code === 200) {
        messageApi.success('重命名成功');
        await getApiDefaultConversations();
      }
    } catch (error) {
      console.error('重命名失败:', error);
      messageApi.error('重命名失败，请稍后重试');
    } finally {
      setRenameModalOpen(false);
    }
  };

  // 组件挂载时加载会话列表
  React.useEffect(() => {
    getApiDefaultConversations();
  }, []);

  const [attachmentsOpen, setAttachmentsOpen] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<GetProp<typeof Attachments, 'items'>>([]);

  const [inputValue, setInputValue] = useState('');

  const listRef = useRef<BubbleListRef>(null);
  const senderRef = useRef<any>(null);
  // 检测是否在客户端环境
  const [isClient, setIsClient] = useState(false);

  // 重命名相关状态
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [renameSessionId, setRenameSessionId] = useState<string>('');
  const [renameValue, setRenameValue] = useState('');

  React.useEffect(() => {
    setIsClient(true);
  }, []);
  // ==================== Runtime ====================
  // 获取历史消息列表：从服务器加载历史聊天记录
  const getDefaultMessages: (info: {
    conversationKey?: string;
  }) => Promise<DefaultMessageInfo<ChatMessage>[]> = async ({ conversationKey }) => {
    if (!conversationKey) return [];
    // 否则从后端异步获取历史消息
    try {
      const historyMessages = await getApiHistoryMessages(conversationKey);
      return historyMessages;
    } catch (error) {
      console.error('加载历史消息失败:', error);
      return [];
    }
  };

  // 获取当前会话的 Provider
  const currentProvider = activeConversationKey ? getProvider(activeConversationKey) : undefined;

  const { onRequest, messages, isRequesting, abort, onReload, setMessage } = useXChat({
    provider: currentProvider,
    conversationKey: activeConversationKey,
    defaultMessages: getDefaultMessages,
    requestPlaceholder: {
        content: locale.noData,
        role: 'assistant' as const,
    },
    requestFallback:  (_, { error, errorInfo, messageInfo }) => {
      if (error.name === 'AbortError') {
        return {
          content: messageInfo?.message?.content || locale.requestAborted,
          role: 'assistant' as const,
        };
      }
      return {
        content: errorInfo?.error?.message || locale.requestFailed,
        role: 'assistant' as const,
      };
    },
  });

  // 当会话切换时，清空输入框
  React.useEffect(() => {
    senderRef.current?.clear();
  }, [activeConversationKey]);




  // ==================== Event ====================
  const onSubmit = (val: string) => {
    if (!val) return;
    // useXChat 会自动携带当前会话的历史消息
    onRequest({
      messages: [{ role: 'user', content: val }],
    });
    listRef.current?.scrollTo({ top: 'bottom' });
  };


  // ==================== Nodes ====================
  const Footer: React.FC<{
  id?: string | number;
  content: string;
  status?: string;
  extraInfo?: ChatMessage['extraInfo'];
}> = ({ id, content, extraInfo, status }) => {
      const lastAssistant = [...messages].reverse().find(i=>i.message?.role==='assistant')
      const isLastMessage = lastAssistant && lastAssistant.id != null && String(lastAssistant.id) === String(id) && lastAssistant.status === status
      const context = React.useContext(ChatContext);
      const Items = [
        {
          key: 'pagination',
          actionRender: <Pagination simple total={1} pageSize={1} />,
        },
        ...(isLastMessage ? [{
          key: 'retry',
          label: locale.retry,
          icon: <SyncOutlined />,
          onItemClick: () => {
            if (id) {
              // onReload 会自动使用当前会话的历史消息重新生成
              context?.onReload?.(id, {
                userAction: 'retry'
              });
            }
          }
        }] : []),
        {
          key: 'copy',
          actionRender: <Actions.Copy text={content} />,
        },
        {
          key: 'audio',
          actionRender: (
            <Actions.Audio
              onClick={() => {
                message.info(locale.isMock);
              }}
            />
          ),
        },
        {
          key: 'feedback',
          actionRender: (
            <Actions.Feedback
              styles={{
                liked: {
                  color: '#f759ab',
                },
              }}
              value={extraInfo?.feedback || 'default'}
              key="feedback"
              onChange={(val) => {
                if (id) {
                  context?.setMessage?.(id, () => ({
                    extraInfo: {
                      feedback: val,
                    },
                  }));
                  message.success(`${id}: ${val}`);
                } else {
                  message.error('has no id!');
                }
              }}
            />
          ),
        },
      ];
      return status !== 'updating' && status !== 'loading' ? (
        <div style={{ display: 'flex' }}>{id && <Actions items={Items} />}</div>
      ) : null;
  };
  const getRole = (className: string): BubbleListProps['role'] => ({
    assistant: {
      placement: 'start',
      header: (_, { status }) => {
        const config = THOUGHT_CHAIN_CONFIG[status as keyof typeof THOUGHT_CHAIN_CONFIG];
        return config ? (
          <ThoughtChain.Item
            style={{
              marginBottom: 8,
            }}
            status={config.status as ThoughtChainItemProps['status']}
            variant="solid"
            icon={<GlobalOutlined />}
            title={config.title}
          />
        ) : null;
      },
      footer: (content, { status, key, extraInfo }) => (
        <Footer
          content={content}
          status={status}
          extraInfo={extraInfo as ChatMessage['extraInfo']}
          id={key as string}
        />
      ),
      contentRender: (content: any, { status }) => {
        // 如果 content 是数组（如图片数组），直接渲染
        if (Array.isArray(content)) {
          return (
            <div>
              {content.map((item, index) => {
                if (item.type === 'image' && item.image_url) {
                  const handleDownload = async () => {
                    try {
                      messageApi.loading('正在下载...');
                      const response = await fetch(item.image_url);
                      const blob = await response.blob();
                      const url = window.URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = `image_${Date.now()}_${index}.png`;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      window.URL.revokeObjectURL(url);
                      messageApi.success('下载成功');
                    } catch (error) {
                      console.error('下载失败:', error);
                      messageApi.error('下载失败，请稍后重试');
                    }
                  };

                  return (
                    <div key={index} style={{ position: 'relative', display: 'inline-block', margin: '8px 0' }}>
                      <img
                        src={item.image_url}
                        alt="uploaded"
                        style={{ maxWidth: '100%', borderRadius: '8px', display: 'block' }}
                      />
                      <Button
                        type="primary"
                        icon={<DownloadOutlined />}
                        onClick={handleDownload}
                        style={{
                          position: 'absolute',
                          bottom: '12px',
                          right: '12px',
                          opacity: 0.9,
                        }}
                      >
                        下载
                      </Button>
                    </div>
                  );
                }
                return null;
              })}
            </div>
          );
        }

        // 如果是字符串，进行换行处理
        const contentStr = typeof content === 'string' ? content : String(content || '');
        const newContent = contentStr.replace(/\n\n/g, '<br/><br/>');
        return (
          <XMarkdown
            paragraphTag="div"
            components={{
              think: ThinkComponent,
            }}
            className={className}
            streaming={{
              hasNextChunk: status === 'updating',
              enableAnimation: true,
            }}
          >
            {newContent}
          </XMarkdown>
        );
      },
    },
    user: { placement: 'end' },
  });
  const chatSide = (
    <div
      className={`${styles.side}${isSidebarCollapsed ? ` ${styles.collapsed}` : ''}${isMobile && !isSidebarCollapsed ? ` ${styles.mobileOverlay}` : ''}`}
      style={{
        width: isSidebarCollapsed ? '0' : undefined,
        padding: isSidebarCollapsed ? '0' : undefined,
      }}
    >
      {!isSidebarCollapsed && (
        <>
          {/* 🌟 Logo */}
          <div  className={styles.logo}>
            <img
              src="/assets/logo.jpg"
              draggable={false}
              alt="logo"
              width={60}
              height={60}
            />
            <span>AI扫地机器人助手</span>
          </div>
          {/* 🌟 会话管理 */}
          <Conversations
            creation={{
              onClick: handleCreateNewConversation,
            }}
            items={conversations.map(({ key, label, ...other }) => ({
              key,
              label: key === activeConversationKey ? `[${locale.curConversation}]${label}` : label,
              ...other,
            }))}
            className={styles.conversations}
            activeKey={activeConversationKey}
            onActiveChange={(key) => {
              setActiveConversationKey(key);
            }}
            groupable
            styles={{ item: { padding: '0 8px' } }}
            menu={(conversation) => ({
              items: [
                {
                  label: locale.rename,
                  key: 'rename',
                  icon: <EditOutlined />,
                  disabled: conversation.key === 'default-0',
                  onClick: () => {
                    handleOpenRenameModal(conversation);
                  },
                },
                {
                  label: locale.delete,
                  key: 'delete',
                  icon: <DeleteOutlined />,
                  danger: true,
                  disabled: conversation.key === 'default-0',
                  onClick: async () => {
                    try {
                      const response = await deleteSession(conversation.key);
                      if (response.code === 200) {
                        const newList = conversations.filter((item) => item.key !== conversation.key);
                        const newKey = newList?.[0]?.key;
                        setConversations(newList);
                        if (conversation.key === activeConversationKey) {
                          setActiveConversationKey(newKey);
                        }
                        messageApi.success('删除成功');
                      }
                    } catch (error) {
                      console.error('删除失败:', error);
                      messageApi.error('删除失败，请稍后重试');
                    }
                  },

                },
              ],
            })}
          />

          <div className={styles.sideFooter}>
            <Avatar size={24} />
            <Button type="text" icon={<QuestionCircleOutlined />} />
          </div>
        </>
      )}
    </div>
  );

  const header = (
    <div className={styles.header}>
      <Flex className={styles.headerLeft} align="center">
        <Button
          type="text"
          icon={isSidebarCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          style={{
            fontSize: '18px',
            height: 'auto',
            padding: '4px',
          }}
        />
        <h1 className={styles.headerTitle}>
          {conversations.find(c => c.key === activeConversationKey)?.label || 'AI扫地机器人助手'}
        </h1>
      </Flex>
    </div>
  );

  const chatList = (
    <div className={styles.chatList}>
      {messages?.length ? (
        /* 🌟 消息列表 */
        <Bubble.List
          ref={listRef}
          items={messages?.map((i) => ({
            ...i.message,
            key: i.id,
            status: i.status,
            loading: i.status === 'loading',
            extraInfo: i.extraInfo,
          }))}
          styles={{
            root: {
              maxWidth: 940,
            },
          }}
          role={getRole(className)}
        />
      ) : (
        <Flex
          vertical
          style={{
            maxWidth: 840,
          }}
          gap={16}
          align="center"
          className={styles.placeholder}
        >
          <Welcome
            style={{
              width: '100%',
            }}
            variant="borderless"
            icon="https://mdn.alipayobjects.com/huamei_iwk9zp/afts/img/A*s5sNRo5LjfQAAAAAAAAAAAAADgCCAQ/fmt.webp"
            title={locale.welcome}
            description={locale.welcomeDescription}
            extra={
              <Space>
                <Button icon={<ShareAltOutlined />} />
                <Button icon={<EllipsisOutlined />} />
              </Space>
            }
          />
          <Flex
            gap={16}
            justify="center"
            style={{
              width: '100%',
            }}
          >
            <Prompts
              items={[HOT_TOPICS]}
              styles={{
                list: { height: '100%' },
                item: {
                  flex: 1,
                  backgroundImage: 'linear-gradient(123deg, #e5f4ff 0%, #efe7ff 100%)',
                  borderRadius: 12,
                  border: 'none',
                },
                subItem: { padding: 0, background: 'transparent' },
              }}
              onItemClick={(info) => {
                onSubmit(info.data.description as string);
              }}
              className={styles.chatPrompt}
            />
            <Prompts
              items={[DESIGN_GUIDE]}
              styles={{
                item: {
                  flex: 1,
                  backgroundImage: 'linear-gradient(123deg, #e5f4ff 0%, #efe7ff 100%)',
                  borderRadius: 12,
                  border: 'none',
                },
                subItem: { background: '#ffffffa6' },
              }}
              onItemClick={(info) => {
                onSubmit(info.data.description as string);
              }}
              className={styles.chatPrompt}
            />
          </Flex>
        </Flex>
      )}
    </div>
  );
  const senderHeader = (
    <Sender.Header
      title={locale.uploadFile}
      open={attachmentsOpen}
      onOpenChange={setAttachmentsOpen}
      styles={{ content: { padding: 0 } }}
    >
      <Attachments
        beforeUpload={() => false}
        items={attachedFiles}
        onChange={(info) => setAttachedFiles(info.fileList)}
        placeholder={(type) =>
          type === 'drop'
            ? { title: locale.dropFileHere }
            : {
                icon: <CloudUploadOutlined />,
                title: locale.uploadFiles,
                description: locale.clickOrDragFilesToUpload,
              }
        }
      />
    </Sender.Header>
  );
  const chatSender = (
    <Flex
      vertical
      gap={8}
      align="center"
      style={{
        margin: '4px 8px 8px 8px',
        flexShrink: 0,
        paddingBottom: 'env(safe-area-inset-bottom, 8px)',
      }}
    >
      {/* 🌟 提示词 */}
      {!attachmentsOpen && (
        <Prompts
          items={SENDER_PROMPTS}
          onItemClick={(info) => {
            onSubmit(info.data.description as string);
          }}
          styles={{
            item: { padding: '6px 12px' },
          }}
          className={styles.senderPrompt}

        />
      )}
      {/* 🌟 输入框 */}
      <Sender
        ref={senderRef}
        value={inputValue}
        header={senderHeader}
        onSubmit={() => {
          onSubmit(inputValue);
          setInputValue('');
        }}
        onChange={setInputValue}
        onCancel={() => {
          abort();
        }}
        prefix={
          <Button
            type="text"
            icon={<PaperClipOutlined style={{ fontSize: 18 }} />}
            onClick={() => setAttachmentsOpen(!attachmentsOpen)}
          />
        }
        loading={isRequesting}
        className={styles.sender}
        allowSpeech
        placeholder={locale.askOrInputUseSkills}
      />
    </Flex>
  );

  // 重命名弹窗
  const renameModal = (
    <Modal
      title="重命名会话"
      open={renameModalOpen}
      onOk={handleConfirmRename}
      onCancel={() => setRenameModalOpen(false)}
      okText="确定"
      cancelText="取消"
    >
      <div style={{ marginTop: 16 }}>
        <Input
          placeholder="请输入会话名称"
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          onPressEnter={handleConfirmRename}
          autoFocus
        />
      </div>
    </Modal>
  );

  // ==================== Render =================

  // 加载动画组件
  const LoadingScreen = () => (
    <div className={`${styles.loadingContainer}${!isLoading ? ` ${styles.loadingFadeOut}` : ''}`}>
      <div className={styles.loadingContent}>
        <div className={styles.loadingLogo}>
          <img
            src="/assets/logo.jpg"
            draggable={false}
            alt="logo"
          />
          <span>AI扫地机器人助手</span>
        </div>

        <div className={styles.progressBarContainer}>
          <div className={styles.progressBarTrack}>
            <div
              className={styles.progressBarFill}
              style={{ width: `${loadingProgress}%` }}
            />
          </div>
          <div className={styles.progressText}>
            {Math.round(loadingProgress)}%
          </div>
        </div>

        <div className={styles.loadingTips}>
          {loadingText}
        </div>
      </div>
    </div>
  );

  return (
    <XProvider locale={locale}>
      <ChatContext.Provider value={{ onReload, setMessage }}>
        {contextHolder}
        {renameModal}
        {LoadingScreen()}
        <div className={styles.layout} suppressHydrationWarning>
          {chatSide}
          {isMobile && !isSidebarCollapsed && (
            <div className={styles.overlay} onClick={handleOverlayClick} />
          )}
          <div className={styles.chatWrapper}>
            {header}
            <div className={styles.chat}>
              {chatList}
              {chatSender}
            </div>
          </div>
        </div>

      </ChatContext.Provider>
    </XProvider>
  );
};
export default Independent;