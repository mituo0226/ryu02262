// Cloudflare Pages Functions の型定義

interface Env {
  DEEPSEEK_API_KEY: string;
}

interface PagesFunctionContext {
  request: Request;
  env: Env;
  params: Record<string, string>;
  waitUntil: (promise: Promise<any>) => void;
  next: () => Promise<Response>;
  data: Record<string, any>;
}

type PagesFunction = (context: PagesFunctionContext) => Response | Promise<Response>;


