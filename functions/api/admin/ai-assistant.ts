// Admin AI Assistant API - テスト結果についての相談機能

interface RequestBody {
  message: string;
  testContext?: {
    character: string;
    testType: 'first_visit' | 'returning';
    welcomeMessage: string;
  };
}

interface ResponseBody {
  response: string;
  error?: string;
}

interface LLMRequestParams {
  systemPrompt: string;
  userMessage: string;
  deepseekApiKey: string;
  fallbackApiKey?: string;
}

/**
 * DeepSeekまたはOpenAIでテスト相談を処理
 */
async function callAIAssistant(params: LLMRequestParams): Promise<string> {
  const { systemPrompt, userMessage, deepseekApiKey, fallbackApiKey } = params;

  const conversation = [
    {
      role: 'system' as const,
      content: systemPrompt,
    },
    {
      role: 'user' as const,
      content: userMessage,
    },
  ];

  // DeepSeekを試行
  try {
    const deepseekResponse = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${deepseekApiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: conversation,
        temperature: 0.7,
        max_tokens: 1024,
        top_p: 0.95,
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (deepseekResponse.ok) {
      const data = (await deepseekResponse.json()) as any;
      const message = data.choices?.[0]?.message?.content;
      if (message) {
        return message;
      }
    }
  } catch (error) {
    console.error('[AI Assistant] DeepSeekエラー:', error);
  }

  // OpenAIフォールバック
  if (fallbackApiKey) {
    try {
      const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${fallbackApiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: conversation,
          temperature: 0.7,
          max_tokens: 1024,
          top_p: 0.95,
        }),
        signal: AbortSignal.timeout(15000),
      });

      if (openaiResponse.ok) {
        const data = (await openaiResponse.json()) as any;
        const message = data.choices?.[0]?.message?.content;
        if (message) {
          return message;
        }
      }
    } catch (error) {
      console.error('[AI Assistant] OpenAIエラー:', error);
    }
  }

  throw new Error('All LLM providers failed');
}

/**
 * テスト相談用のシステムプロンプト生成
 */
function generateSystemPrompt(testContext?: any): string {
  let contextInfo = '';

  if (testContext) {
    contextInfo = `
【テスト結果情報】
- 鑑定士: ${testContext.character}
- テストタイプ: ${testContext.testType === 'first_visit' ? '初回訪問' : '再訪問'}
- ウェルカムメッセージ:
${testContext.welcomeMessage}

上記のテスト結果に対して、テスターからの質問や相談に丁寧に応答してください。
`;
  }

  return `あなたは「運命の扉」というAI占い/鑑定アプリのテストを支援するAIアシスタントです。

役割:
- テストウィンドウのテスト結果について相談を受ける
- 鑑定士のウェルカムメッセージの適切性を分析
- テスト実行時の問題や改善案についてアドバイス
- テスターの質問に対して建設的で丁寧に応答

指針:
- テスト結果に基づいた具体的なアドバイスをする
- 鑑定士のキャラクターや世界観を尊重する
- テスターの効率的なテスト運用をサポート
- 分かりやすく、実行可能な提案をする

${contextInfo}`;
}

export default {
  async fetch(request: Request, env: any): Promise<Response> {
    // CORS対応
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    try {
      const body = (await request.json()) as RequestBody;
      const { message, testContext } = body;

      if (!message || !message.trim()) {
        return new Response(
          JSON.stringify({ error: 'Message is required' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const systemPrompt = generateSystemPrompt(testContext);
      const deepseekApiKey = env.DEEPSEEK_API_KEY;
      const openaiApiKey = env.OPENAI_API_KEY;

      if (!deepseekApiKey) {
        return new Response(
          JSON.stringify({ error: 'API key not configured' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const response = await callAIAssistant({
        systemPrompt,
        userMessage: message,
        deepseekApiKey,
        fallbackApiKey: openaiApiKey,
      });

      return new Response(
        JSON.stringify({ response }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    } catch (error) {
      console.error('[AI Assistant] Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      return new Response(
        JSON.stringify({ error: errorMessage }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }
  },
};
