interface RagConfig {
    chat_model_name: string;
    embedding_model_name: string
}

const ragConfig: RagConfig = {
    chat_model_name: process.env.CHAT_MODEL_NAME || "MiniMax-M2.1",
    embedding_model_name: process.env.EMBEDDING_MODEL_NAME || "text-embedding-v1"
};


export default ragConfig