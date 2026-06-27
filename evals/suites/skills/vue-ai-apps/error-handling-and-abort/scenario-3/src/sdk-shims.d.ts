// Eval shim: the AI SDK surface is volatile; these evals check generated code
// patterns, not the live SDK. Declaring the modules lets vue-tsc typecheck the
// component without pinning fast-moving external versions.
declare module "ai";
declare module "@ai-sdk/vue";
declare module "@ai-sdk/openai";
declare module "@ai-sdk/anthropic";
declare module "zod";
