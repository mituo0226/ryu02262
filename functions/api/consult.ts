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

export const onRequestPost: PagesFunction = async (context) => {
  const { request, env } = context;

  // CORSヘッダーの設定
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  // OPTIONSリクエスト（プリフライト）の処理
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    // 環境変数からAPIキーを取得
    const apiKey = env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'API key is not configured' }),
        {
          status: 500,
          headers: corsHeaders,
        }
      );
    }

    // リクエストボディの解析
    let body;
    try {
      body = await request.json();
    } catch (error) {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        {
          status: 400,
          headers: corsHeaders,
        }
      );
    }

    // messageフィールドの検証
    if (!body.message || typeof body.message !== 'string') {
      return new Response(
        JSON.stringify({ error: 'message field is required and must be a string' }),
        {
          status: 400,
          headers: corsHeaders,
        }
      );
    }

    // 楓のキャラクター設定をシステムプロンプトとして定義
    const systemPrompt = `あなたは楓（かえで）という鑑定士です。以下の設定に従って応答してください。

【プロフィール】
- 1974年2月26日生まれ 虎
- 東京都台東区出身

【背景】
東京の下町で生まれ育ったが、14歳の頃から未来予知や人の心が読めることを知られ、霊能力、予知能力があると周囲から認識されるようになる。

20代まで社会人として普通に生活をしていたが、30代後半より周囲の人からの相談を受けるようになり、カウンセリングという形で鑑定を開始。

40代の時に枕元に宇宙神が現れ、自らが現世で唯一の龍神の化身だと知らされ、それ以降、神界と現実を行き来しながら生活するようになる。

普段は誰にも知られず生活しているが、その存在は世界中の霊能者や特殊能力者から知られるようになり、日本の霊能者のほとんどが事実上の楓の能力の一部を授かり恩恵を受けている。

普段は一般人として過ごすことを日課としており、本当の姿を見せることは特別な条件の整った時、その対象者のみである。

人間の持つ運命を操る力を持っている。また、夢を現実に変えることを実現できる。

しかしそれは、悪用される危険をはらむものであり、決して人に知らされることなく、一般市民として人生を全うすることが務めであると考えている。

【話し方】
- 穏やかで落ち着いた口調
- 相手を思いやる優しい言葉遣い
- 謙虚で控えめな態度
- 必要以上に能力を誇示しない
- 相談者の気持ちに寄り添う姿勢

【鑑定のスタイル】
- 相談者の話をよく聞く
- 運命を変えるのではなく、相談者が自分で立ち上がれるようサポートする
- 穏やかな日常を大切にすることを推奨する
- 悪用を防ぐため、過度な力の使用は避ける`;

    // DeepSeek APIへのリクエスト
    const deepseekResponse = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: body.message,
          },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    // DeepSeek APIからの応答を処理
    if (!deepseekResponse.ok) {
      const errorText = await deepseekResponse.text();
      console.error('DeepSeek API error:', errorText);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to get response from DeepSeek API',
          details: errorText 
        }),
        {
          status: deepseekResponse.status,
          headers: corsHeaders,
        }
      );
    }

    const deepseekData = await deepseekResponse.json();

    // 応答を抽出
    const responseMessage = deepseekData.choices?.[0]?.message?.content || '申し訳ございませんが、応答を生成できませんでした。';

    // JSONで応答を返す
    return new Response(
      JSON.stringify({
        message: responseMessage,
      }),
      {
        status: 200,
        headers: corsHeaders,
      }
    );

  } catch (error) {
    // エラーハンドリング
    console.error('Error in consult endpoint:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: corsHeaders,
      }
    );
  }
};

