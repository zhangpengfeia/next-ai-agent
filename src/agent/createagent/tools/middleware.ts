import { createMiddleware } from "langchain";

const agentMiddleware = createMiddleware({
  name: "agentMiddleware",
  beforeModel: (state) => {
    console.log(`beforeModel_middleware:${state}`);
    return;
  },
  afterModel: (state) => {
    const lastMessage = state.messages[state.messages.length - 1];
    console.log(`afterModel_middleware:${lastMessage}`);
    return;
  },
  wrapModelCall: (request, handler) => {
    // Access context from runtime
    // Add user context to system message
    console.log(`wrapModelCall_middleware`);
    return handler({
      ...request
    });
  },
});

export default agentMiddleware