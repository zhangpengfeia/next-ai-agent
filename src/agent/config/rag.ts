import { AlibabaTongyiEmbeddingsParams } from "@langchain/community/embeddings/alibaba_tongyi";

interface RagConfig {
    chat_model_name: string;
    embedding_model_name: AlibabaTongyiEmbeddingsParams['modelName']
}

const ragConfig: RagConfig = {
    chat_model_name: process.env.CHAT_MODEL_NAME || "MiniMax-M2.1",
    embedding_model_name: (process.env.EMBEDDING_MODEL_NAME || "text-embedding-v1" ) as AlibabaTongyiEmbeddingsParams['modelName'],
};


export default ragConfig