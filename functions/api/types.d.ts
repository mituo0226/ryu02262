// Cloudflare Pages Functions の型定義

interface D1PreparedStatement<T = unknown> {
  bind(...values: any[]): D1PreparedStatement<T>;
  first<R = T>(): Promise<R | null>;
  all<R = T>(): Promise<{ results: R[] }>;
  run<R = unknown>(): Promise<R>;
}

interface D1Database {
  prepare<T = unknown>(query: string): D1PreparedStatement<T>;
}

interface Env {
  DEEPSEEK_API_KEY: string;
  AUTH_SECRET: string;
  DB: D1Database;
  ADMIN_TOKEN?: string;
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



