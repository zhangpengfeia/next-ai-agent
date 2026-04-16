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
import {Avatar, Button, Flex, type GetProp, Input, message, Modal, Pagination, Space} from 'antd';
import React, {useRef, useState, useEffect} from 'react';
import '@ant-design/x-markdown/themes/light.css';
import '@ant-design/x-markdown/themes/dark.css';
import { BubbleListRef } from '@ant-design/x/es/bubble';
import { useMarkdownTheme } from './Xmarkdown/utils';
import locale from '@/app/utils/locale';
import styles from './styles.module.css';
import {createSession, deleteSession, getMessageHistory, listSessions, renameSession} from "@/services/client/chat";

// 类型定义：自定义聊天系统的输入输出和消息结构
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
const HOT_TOPICS = {
  key: '1',
  label: locale.hotTopics,
  children: [
    { key: '1-1', description: locale.whatComponentsAreInAntDesignX, icon: <span style={{ color: '#f93a4a', fontWeight: 700 }}>1</span> },
    { key: '1-2', description: locale.newAgiHybridInterface, icon: <span style={{ color: '#ff6565', fontWeight: 700 }}>2</span> },
  ],
};
const DESIGN_GUIDE = {
  key: '2',
  label: locale.designGuide,
  children: [
    { key: '2-1', icon: <HeartOutlined />, label: locale.intention, description: locale.aiUnderstandsUserNeedsAndProvidesSolutions },
    { key: '2-2', icon: <SmileOutlined />, label: locale.role, description: locale.aiPublicPersonAndImage },
    { key: '2-3', icon: <CommentOutlined />, label: locale.chat, description: locale.howAICanExpressItselfWayUsersUnderstand },
    { key: '2-4', icon: <PaperClipOutlined />, label: locale.interface, description: locale.aiBalances },
  ],
};
const SENDER_PROMPTS: GetProp<typeof Prompts, 'items'> = [
  { key: '1', description: locale.upgrades, icon: <ScheduleOutlined /> },
  { key: '2', description: locale.components, icon: <ProductOutlined /> }
];
const THOUGHT_CHAIN_CONFIG = {
  loading: { title: locale.modelIsRunning, status: 'loading' },
  updating: { title: locale.modelIsRunning, status: 'loading' },
  success: { title: locale.modelExecutionCompleted, status: 'success' },
  error: { title: locale.executionFailed, status: 'error' },
  abort: { title: locale.aborted, status: 'abort' },
};
const DEFAULT_CONVERSATIONS_ITEMS = [
  { key: 'default-0', label: "默认会话", group: "默认会话" },
];

// ==================== Context ====================
const ChatContext = React.createContext<{
  onReload?: ReturnType<typeof useXChat>['onReload'];
  setMessage?: ReturnType<typeof useXChat<ChatMessage>>['setMessage'];
}>({});

// ==================== Sub Component ====================
const ThinkComponent = React.memo((props: ComponentProps) => {
  const [title, setTitle] = useState(`${locale.deepThinking}...`);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (props.streamStatus === 'done') {
      setTitle(locale.completeThinking);
      setLoading(false);
    }
  }, [props.streamStatus]);

  return <Think title={title} loading={loading}>{props.children}</Think>;
});
ThinkComponent.displayName = 'ThinkComponent';

// 自定义Provider实现
class CustomProvider<
  ChatMessage extends CustomMessage = CustomMessage,
  Input extends CustomInput = CustomInput,
  Output extends CustomOutput = CustomOutput,
> extends AbstractChatProvider<ChatMessage, Input, Output> {
  transformParams(
    requestParams: Partial<Input>,
    options: XRequestOptions<Input, Output, ChatMessage>,
  ): Input {
    if (typeof requestParams !== 'object') throw new Error('requestParams must be an object');

    if (requestParams.userAction === 'retry') {
      const messages = this.getMessages();
      const queryMessage = (messages || [])?.reverse().find(({ role }) => role === 'user');
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

  transformLocalMessage(requestParams: Partial<Input>): ChatMessage {
    const lastMessage = requestParams.messages?.[requestParams.messages.length - 1];
    return { content: lastMessage?.content || '', role: lastMessage?.role || 'user' } as ChatMessage;
  }

  transformMessage(info: any): ChatMessage {
    const { originMessage, chunk } = info || {};
    if (!chunk || !chunk?.data || chunk?.data?.includes('[DONE]')) {
      return { content: originMessage?.content || '', role: 'assistant' } as ChatMessage;
    }
    try {
      const data = JSON.parse(chunk.data);
      const content = originMessage?.content || '';
      const existingAttachments = originMessage?.attachments || [];
      const newAttachments: CustomMessage['attachments'] = data.attachments || [];
      const mergedAttachments = [...existingAttachments];
      newAttachments?.forEach((newAttach: NonNullable<CustomMessage['attachments']>[0]) => {
        if (!mergedAttachments.some((existing) => existing.url === newAttach.url)) {
          mergedAttachments.push(newAttach);
        }
      });
      return { content: `${content}${data.content || ''}`, role: 'assistant' } as ChatMessage;
    } catch (_error) {
      return { content: `${originMessage?.content || ''}${chunk.data || ''}`, role: 'assistant' } as ChatMessage;
    }
  }
}

// 从后端获取会话历史消息
const getApiHistoryMessages = async (conversationKey: string): Promise<DefaultMessageInfo<ChatMessage>[]> => {
  try {
    const response = await getMessageHistory(conversationKey, 50);
    if (response.code === 200 && response.data?.messages && Array.isArray(response.data.messages)) {
      return response.data.messages.map((msg: any) => ({
        message: { role: msg.role as 'user' | 'assistant', content: msg.content },
        status: 'success' as const,
      }));
    }
  } catch (error) {
    console.error('获取历史消息失败:', error);
  }
  return [];
};

const Independent: React.FC = () => {
  // ==================== 核心修复：客户端渲染标识 ✅
  const [isClient, setIsClient] = useState(false);
  useEffect(() => { setIsClient(true); }, []);

  // ==================== State（所有状态延迟到客户端初始化）✅
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingText, setLoadingText] = useState('正在初始化...');

  // 监听窗口大小（仅客户端执行）✅
  useEffect(() => {
    if (!isClient) return;
    const handleResize = () => {
      const mobile = window.innerWidth < 680;
      setIsMobile(mobile);
      if (mobile) setIsSidebarCollapsed(true);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isClient]);
  const handleOverlayClick = () => { if (isMobile) setIsSidebarCollapsed(true); };
  // 缓存Provider
  const providerCaches = useRef<Map<string, CustomProvider<CustomMessage, CustomInput, CustomOutput>>>(new Map());
  const getProvider = (conversationKey: string) => {
    if (!providerCaches.current.has(conversationKey)) {
      providerCaches.current.set(
        conversationKey,
        new CustomProvider<CustomMessage, CustomInput, CustomOutput>({
          request: XRequest('/api/v1/chat/stream', {
            manual: true,
            params: { stream: true, messages: [], model: 'qwen2.5-7b-instruct', session_id: conversationKey },
          }),
        }),
      );
    }
    return providerCaches.current.get(conversationKey)!;
  };

  const {
    conversations, activeConversationKey, setActiveConversationKey, addConversation, setConversations,
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
      if (messages.length === 0) { messageApi.error(locale.itIsNowANewConversation); return; }
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
      }
    } catch (error) {
      console.error('创建新会话失败:', error);
      messageApi.error('创建新会话失败，请稍后重试');
    }
  };

  // 重命名会话
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [renameSessionId, setRenameSessionId] = useState<string>('');
  const [renameValue, setRenameValue] = useState('');

  const handleOpenRenameModal = (conversation: any) => {
    const currentLabel = typeof conversation.label === 'string' ? conversation.label : '';
    const cleanLabel = currentLabel.replace(/\[.*?\]/, '');
    setRenameSessionId(conversation.key);
    setRenameValue(cleanLabel);
    setRenameModalOpen(true);
  };

  const handleConfirmRename = async () => {
    if (!renameValue.trim()) { messageApi.warning('会话名称不能为空'); return; }
    try {
      const response = await renameSession(renameSessionId, { session_name: renameValue.trim() });
      if (response.code === 200) { messageApi.success('重命名成功'); await getApiDefaultConversations(); }
    } catch (error) {
      console.error('重命名失败:', error);
      messageApi.error('重命名失败，请稍后重试');
    } finally { setRenameModalOpen(false); }
  };

  // 加载会话列表
  useEffect(() => { if (isClient) getApiDefaultConversations(); }, [isClient]);

  const [attachmentsOpen, setAttachmentsOpen] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<GetProp<typeof Attachments, 'items'>>([]);
  const [inputValue, setInputValue] = useState('');
  const listRef = useRef<BubbleListRef>(null);
  const senderRef = useRef<any>(null);

  // 获取历史消息
  const getDefaultMessages: (info: { conversationKey?: string }) => Promise<DefaultMessageInfo<ChatMessage>[]> = async ({ conversationKey }) => {
    if (!conversationKey || !isClient) return [];
    try { return await getApiHistoryMessages(conversationKey); }
    catch (error) { console.error('加载历史消息失败:', error); return []; }
  };

  // 当前会话Provider
  const currentProvider = activeConversationKey && isClient ? getProvider(activeConversationKey) : undefined;

  const { onRequest, messages, isRequesting, abort, onReload, setMessage } = useXChat({
    provider: currentProvider,
    conversationKey: activeConversationKey,
    defaultMessages: getDefaultMessages,
    requestPlaceholder: { content: locale.noData, role: 'assistant' as const },
    requestFallback: (_, { error, errorInfo, messageInfo }) => {
      if (error.name === 'AbortError') {
        return { content: messageInfo?.message?.content || locale.requestAborted, role: 'assistant' as const };
      }
      return { content: errorInfo?.error?.message || locale.requestFailed, role: 'assistant' as const };
    },
  });

  // 切换会话清空输入框
  useEffect(() => { if (isClient) senderRef.current?.clear(); }, [activeConversationKey, isClient]);

  // ==================== Event ====================
  const onSubmit = (val: string) => {
    if (!val) return;
    onRequest({ messages: [{ role: 'user', content: val }] });
    listRef.current?.scrollTo({ top: 'bottom' });
  };

  // ==================== Nodes ====================
  const Footer: React.FC<{ id?: string | number; content: string; status?: string; extraInfo?: ChatMessage['extraInfo'] }> = ({ id, content, extraInfo, status }) => {
    const lastAssistant = [...messages].reverse().find(i=>i.message?.role==='assistant');
    const isLastMessage = lastAssistant && lastAssistant.id != null && String(lastAssistant.id) === String(id) && lastAssistant.status === status;
    const context = React.useContext(ChatContext);
    const Items = [
      { key: 'pagination', actionRender: <Pagination simple total={1} pageSize={1} /> },
      ...(isLastMessage ? [{
        key: 'retry', label: locale.retry, icon: <SyncOutlined />,
        onItemClick: () => { if (id) context?.onReload?.(id, { userAction: 'retry' }); }
      }] : []),
      { key: 'copy', actionRender: <Actions.Copy text={content} /> },
      { key: 'audio', actionRender: <Actions.Audio onClick={() => message.info(locale.isMock)} /> },
      { key: 'feedback', actionRender: (
        <Actions.Feedback
          styles={{ liked: { color: '#f759ab' } }}
          value={extraInfo?.feedback || 'default'}
          onChange={(val) => {
            if (id) {
              context?.setMessage?.(id, () => ({ extraInfo: { feedback: val } }));
              message.success(`${id}: ${val}`);
            } else message.error('has no id!');
          }}
        />
      )},
    ];
    return status !== 'updating' && status !== 'loading' ? <div style={{ display: 'flex' }}>{id && <Actions items={Items} />}</div> : null;
  };

  const getRole = (className: string): BubbleListProps['role'] => ({
    assistant: {
      placement: 'start',
      header: (_, { status }) => {
        const config = THOUGHT_CHAIN_CONFIG[status as keyof typeof THOUGHT_CHAIN_CONFIG];
        return config ? (
          <ThoughtChain.Item
            style={{ marginBottom: 8 }}
            status={config.status as ThoughtChainItemProps['status']}
            variant="solid"
            icon={<GlobalOutlined />}
            title={config.title}
          />
        ) : null;
      },
      footer: (content, { status, key, extraInfo }) => (
        <Footer content={content} status={status} extraInfo={extraInfo as ChatMessage['extraInfo']} id={key as string} />
      ),
      contentRender: (content: any, { status }) => {
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
                      <img src={item.image_url} alt="uploaded" style={{ maxWidth: '100%', borderRadius: '8px', display: 'block' }} />
                      <Button type="primary" icon={<DownloadOutlined />} onClick={handleDownload} style={{ position: 'absolute', bottom: '12px', right: '12px', opacity: 0.9 }}>下载</Button>
                    </div>
                  );
                }
                return null;
              })}
            </div>
          );
        }
        const contentStr = typeof content === 'string' ? content : String(content || '');
        const newContent = contentStr.replace(/\n\n/g, '<br/><br/>');
        return (
          <XMarkdown
            paragraphTag="div"
            components={{ think: ThinkComponent }}
            className={className}
            streaming={{ hasNextChunk: status === 'updating', enableAnimation: true }}
          >
            {newContent}
          </XMarkdown>
        );
      },
    },
    user: { placement: 'end' },
  });

  const chatSide = (
    <div className={`${styles.side}${isSidebarCollapsed ? ` ${styles.collapsed}` : ''}${isMobile && !isSidebarCollapsed ? ` ${styles.mobileOverlay}` : ''}`}
      style={{ width: isSidebarCollapsed ? '0' : undefined, padding: isSidebarCollapsed ? '0' : undefined }}>
      {!isSidebarCollapsed && (
        <>
          <div className={styles.logo}>
            <img src="/assets/logo.jpg" draggable={false} alt="logo" width={60} height={60} />
            <span>AI扫地机器人助手</span>
          </div>
          <Conversations
            creation={{ onClick: handleCreateNewConversation }}
            items={conversations.map(({ key, label, ...other }) => ({
              key, label: key === activeConversationKey ? `[${locale.curConversation}]${label}` : label, ...other
            }))}
            className={styles.conversations}
            activeKey={activeConversationKey}
            onActiveChange={(key) => setActiveConversationKey(key)}
            groupable
            styles={{ item: { padding: '0 8px' } }}
            menu={(conversation) => ({
              items: [
                {
                  label: locale.rename, key: 'rename', icon: <EditOutlined />,
                  disabled: conversation.key === 'default-0',
                  onClick: () => handleOpenRenameModal(conversation),
                },
                {
                  label: locale.delete, key: 'delete', icon: <DeleteOutlined />, danger: true,
                  disabled: conversation.key === 'default-0',
                  onClick: async () => {
                    try {
                      const response = await deleteSession(conversation.key);
                      if (response.code === 200) {
                        const newList = conversations.filter((item) => item.key !== conversation.key);
                        const newKey = newList?.[0]?.key;
                        setConversations(newList);
                        if (conversation.key === activeConversationKey) setActiveConversationKey(newKey);
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
          style={{ fontSize: '18px', height: 'auto', padding: '4px' }}
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
        <Bubble.List
          ref={listRef}
          items={messages?.map((i) => ({
            ...i.message, key: i.id, status: i.status, loading: i.status === 'loading', extraInfo: i.extraInfo,
          }))}
          styles={{ root: { maxWidth: 940 } }}
          role={getRole(className)}
        />
      ) : (
        <Flex vertical style={{ maxWidth: 840 }} gap={16} align="center" className={styles.placeholder}>
          <Welcome
            style={{ width: '100%' }}
            variant="borderless"
            icon="https://mdn.alipayobjects.com/huamei_iwk9zp/afts/img/A*s5sNRo5LjfQAAAAAAAAAAAAADgCCAQ/fmt.webp"
            title={locale.welcome}
            description={locale.welcomeDescription}
            extra={<Space><Button icon={<ShareAltOutlined />} /><Button icon={<EllipsisOutlined />} /></Space>}
          />
          <Flex gap={16} justify="center" style={{ width: '100%' }}>
            <Prompts
              items={[HOT_TOPICS]}
              styles={{
                list: { height: '100%' },
                item: { flex: 1, backgroundImage: 'linear-gradient(123deg, #e5f4ff 0%, #efe7ff 100%)', borderRadius: 12, border: 'none' },
                subItem: { padding: 0, background: 'transparent' },
              }}
              onItemClick={(info) => onSubmit(info.data.description as string)}
              className={styles.chatPrompt}
            />
            <Prompts
              items={[DESIGN_GUIDE]}
              styles={{
                item: { flex: 1, backgroundImage: 'linear-gradient(123deg, #e5f4ff 0%, #efe7ff 100%)', borderRadius: 12, border: 'none' },
                subItem: { background: '#ffffffa6' },
              }}
              onItemClick={(info) => onSubmit(info.data.description as string)}
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
            : { icon: <CloudUploadOutlined />, title: locale.uploadFiles, description: locale.clickOrDragFilesToUpload }
        }
      />
    </Sender.Header>
  );

  const chatSender = (
    <Flex vertical gap={8} align="center" style={{ margin: '4px 8px 8px 8px', flexShrink: 0, paddingBottom: 'env(safe-area-inset-bottom, 8px)' }}>
      {!attachmentsOpen && (
        <Prompts
          items={SENDER_PROMPTS}
          onItemClick={(info) => onSubmit(info.data.description as string)}
          styles={{ item: { padding: '6px 12px' } }}
          className={styles.senderPrompt}
        />
      )}
      {/* 核心修复：禁用allowSpeech，解决语音按钮水合错误 ✅ */}
      <Sender
        ref={senderRef}
        value={inputValue}
        header={senderHeader}
        onSubmit={() => { onSubmit(inputValue); setInputValue(''); }}
        onChange={setInputValue}
        onCancel={() => abort()}
        prefix={
          <Button type="text" icon={<PaperClipOutlined style={{ fontSize: 18 }} />} onClick={() => setAttachmentsOpen(!attachmentsOpen)} />
        }
        loading={isRequesting}
        className={styles.sender}
        allowSpeech={false} // 🔥 修复水合错误的关键
        placeholder={locale.askOrInputUseSkills}
      />
    </Flex>
  );

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
  // ==================== 核心修复：仅客户端渲染整个组件 ✅
  if (!isClient) return null;
  return (
    <XProvider locale={locale}>
      <ChatContext.Provider value={{ onReload, setMessage }}>
        {contextHolder}
        {renameModal}
        <div className={styles.layout}>
          {chatSide}
          {isMobile && !isSidebarCollapsed && <div className={styles.overlay} onClick={handleOverlayClick} />}
          <div className={styles.chatWrapper}>
            {header}
            <div className={styles.chat}>{chatList}{chatSender}</div>
          </div>
        </div>
      </ChatContext.Provider>
    </XProvider>
  );
};

export default Independent;