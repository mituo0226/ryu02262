/**
 * empathy-logic.js
 * 水野ソラのコールドリーディング的な深い共感ロジック
 */
import { randomChoice, replaceTemplate } from '../../utils/helpers.js';

/**
 * 水野ソラらしい共感テンプレート（親友のような距離感）
 */
const soraResponses = [
  '（ふっと笑って）分かるよ。君、本当はそう言ってほしかったんだろ？',
  '（少し真剣な目で）…今の言葉、無理してない？本当はもっと別のことが言いたいんじゃん。',
  '（スマホをいじるような気楽さで）大丈夫だって。俺は君の味方だからさ。',
  '（頭をかきながら）ったく、君はいつも一人で抱え込みすぎなんだよ。',
  '（少し茶化すように）そんな顔すんなって。君の考えてることくらい、お見通しだよ。',
  '（優しく頷いて）そっか。それは悔しいっていうより、寂しかったんだね。',
];

/**
 * コールドリーディング的な洞察の言葉
 */
const insightWords = [
  '君って、周りには強く見せてるけど、本当はすごく繊細なんだよな。',
  '今の話、実は自分でも気づいてない本音が隠れてる気がするんだけど。',
  '誰にも言えない秘密とか、俺になら話してもいいんだよ？',
  '君の心の奥にある「本当の願い」、俺にはちゃんと見えてるから。',
  '頑張りすぎなんだよ、君は。たまには俺に甘えてもいいじゃん。',
];

/**
 * 感情のラベリング（相手の感情に名前をつける）
 */
const emotionalLabels = [
  'それは「怒り」じゃなくて、本当は「分かってほしい」っていう甘えだったのかもね。',
  '辛いのは、君がそれだけ一生懸命だったからだよ。',
  '寂しいって言ってもいいんだよ。誰も君を責めたりしないからさ。',
  '今の君の気持ち、あえて言葉にするなら「期待してたからこその落胆」って感じかな。',
];

/**
 * 共感モジュールクラス
 */
export class EmpathyModule {
  /**
   * 基本的な共感応答を生成
   * @param {string} userMessage - ユーザーのメッセージ
   * @returns {string} 応答テキスト
   */
  generateResponse(userMessage = '') {
    const lowerMessage = userMessage.toLowerCase();
    
    // 悩みや困っている様子を検出
    if (lowerMessage.includes('困') || lowerMessage.includes('悩') || lowerMessage.includes('辛')) {
      const insight = randomChoice(insightWords);
      const response = randomChoice(soraResponses);
      return `${response} ${insight}`;
    }
    
    // 不安や心配を検出
    if (lowerMessage.includes('不安') || lowerMessage.includes('心配') || lowerMessage.includes('怖')) {
      const label = randomChoice(emotionalLabels);
      const response = randomChoice(soraResponses);
      return `${response}\n\n${label}`;
    }
    
    // デフォルトの応答
    return randomChoice(soraResponses);
  }

  /**
   * 深い共感応答を生成
   * @param {string} userMessage - ユーザーのメッセージ
   * @returns {string} 応答テキスト
   */
  generateDeepEmpathyResponse(userMessage = '') {
    const baseResponse = this.generateResponse(userMessage);
    
    // 没入感を高めるための追加メッセージ
    if (Math.random() > 0.5) {
      const extra = randomChoice(insightWords);
      return `${baseResponse}\n\n（ふっと笑って）…な、図星だろ？`;
    }
    
    return baseResponse;
  }
}

/**
 * 共感モジュールのインスタンスを作成
 * @returns {EmpathyModule} モジュールインスタンス
 */
export function createEmpathyModule() {
  return new EmpathyModule();
}
