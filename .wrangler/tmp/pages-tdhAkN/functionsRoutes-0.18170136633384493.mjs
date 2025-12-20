import { onRequestPost as __api_auth_login_ts_onRequestPost } from "C:\\Users\\mituo\\Desktop\\kaede\\functions\\api\\auth\\login.ts"
import { onRequestPost as __api_auth_register_ts_onRequestPost } from "C:\\Users\\mituo\\Desktop\\kaede\\functions\\api\\auth\\register.ts"
import { onRequestPost as __api_auth_reset_passphrase_ts_onRequestPost } from "C:\\Users\\mituo\\Desktop\\kaede\\functions\\api\\auth\\reset-passphrase.ts"
import { onRequestPost as __api_auth_update_deity_ts_onRequestPost } from "C:\\Users\\mituo\\Desktop\\kaede\\functions\\api\\auth\\update-deity.ts"
import { onRequest as __api_admin_conversations_ts_onRequest } from "C:\\Users\\mituo\\Desktop\\kaede\\functions\\api\\admin\\conversations.ts"
import { onRequest as __api_admin_users_ts_onRequest } from "C:\\Users\\mituo\\Desktop\\kaede\\functions\\api\\admin\\users.ts"
import { onRequestGet as __api_cleanup_conversations_ts_onRequestGet } from "C:\\Users\\mituo\\Desktop\\kaede\\functions\\api\\cleanup-conversations.ts"
import { onRequestPost as __api_cleanup_conversations_ts_onRequestPost } from "C:\\Users\\mituo\\Desktop\\kaede\\functions\\api\\cleanup-conversations.ts"
import { onRequestPost as __api_consult_ts_onRequestPost } from "C:\\Users\\mituo\\Desktop\\kaede\\functions\\api\\consult.ts"
import { onRequestGet as __api_conversation_ts_onRequestGet } from "C:\\Users\\mituo\\Desktop\\kaede\\functions\\api\\conversation.ts"
import { onRequestPost as __api_conversation_ts_onRequestPost } from "C:\\Users\\mituo\\Desktop\\kaede\\functions\\api\\conversation.ts"
import { onRequestGet as __api_conversation_history_ts_onRequestGet } from "C:\\Users\\mituo\\Desktop\\kaede\\functions\\api\\conversation-history.ts"
import { onRequestGet as __api_last_conversations_ts_onRequestGet } from "C:\\Users\\mituo\\Desktop\\kaede\\functions\\api\\last-conversations.ts"

export const routes = [
    {
      routePath: "/api/auth/login",
      mountPath: "/api/auth",
      method: "POST",
      middlewares: [],
      modules: [__api_auth_login_ts_onRequestPost],
    },
  {
      routePath: "/api/auth/register",
      mountPath: "/api/auth",
      method: "POST",
      middlewares: [],
      modules: [__api_auth_register_ts_onRequestPost],
    },
  {
      routePath: "/api/auth/reset-passphrase",
      mountPath: "/api/auth",
      method: "POST",
      middlewares: [],
      modules: [__api_auth_reset_passphrase_ts_onRequestPost],
    },
  {
      routePath: "/api/auth/update-deity",
      mountPath: "/api/auth",
      method: "POST",
      middlewares: [],
      modules: [__api_auth_update_deity_ts_onRequestPost],
    },
  {
      routePath: "/api/admin/conversations",
      mountPath: "/api/admin",
      method: "",
      middlewares: [],
      modules: [__api_admin_conversations_ts_onRequest],
    },
  {
      routePath: "/api/admin/users",
      mountPath: "/api/admin",
      method: "",
      middlewares: [],
      modules: [__api_admin_users_ts_onRequest],
    },
  {
      routePath: "/api/cleanup-conversations",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_cleanup_conversations_ts_onRequestGet],
    },
  {
      routePath: "/api/cleanup-conversations",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_cleanup_conversations_ts_onRequestPost],
    },
  {
      routePath: "/api/consult",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_consult_ts_onRequestPost],
    },
  {
      routePath: "/api/conversation",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_conversation_ts_onRequestGet],
    },
  {
      routePath: "/api/conversation",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_conversation_ts_onRequestPost],
    },
  {
      routePath: "/api/conversation-history",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_conversation_history_ts_onRequestGet],
    },
  {
      routePath: "/api/last-conversations",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_last_conversations_ts_onRequestGet],
    },
  ]