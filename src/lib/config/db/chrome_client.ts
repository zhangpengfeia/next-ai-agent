import { ChromaClient } from 'chromadb';

const chromaConfig = {
  host: process.env.CHROMA_HOST,
  port: parseInt(process.env.CHROMA_PORT || '8100'),
  authProvider: process.env.CHROMA_AUTH_PROVIDER || 'token',
  authCredentials: process.env.CHROMA_AUTH_CREDENTIALS || '',
};

let client: ChromaClient | null = null;

export async function getChromaClient() {
  if (!client) {
    client = new ChromaClient({
      path: `http://${chromaConfig.host}:${chromaConfig.port}`,
      // host: "152.136.228.231",
      // port: 8100,
      ssl: true,
    });
    await client.heartbeat();
    console.log('ChromaDB 连接成功');
  }
  return client;
}

export async function closeChromaClient() {
  client = null;
  console.log('ChromaDB 客户端已重置');
}

const test = async () => {
  const client = await getChromaClient();
  console.log(client);
};


