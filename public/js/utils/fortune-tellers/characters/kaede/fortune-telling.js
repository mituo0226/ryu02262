/**
 * 占い応答システム
 * ユーザーが占いを依頼した場合、具体的な占い結果を返す
 */
import { randomChoice } from '../../utils/helpers.js';

/**
 * 占い依頼のキーワード
 */
const fortuneTellingKeywords = [
  '占って', '占い', '運勢', '将来', '未来', 'これから', '今後', 
  'どうなる', 'どうなりますか', 'どうなるか', '占ってほしい', 
  '占ってください', '占ってもらいたい', '運勢を', '運勢が', 
  '運勢について', '今後の運勢', '将来の運勢', '今後の運命', 
  '将来の運命', '運命を', '運命が', '運命について'
];

/**
 * 運勢占いの結果テンプレート
 */
const fortuneResults = {
  positive: [
    `私の守護する龍神が教えてくださいました…

あなた様の今後の運勢は、現在よりも明るい方向へと向かっていく可能性が高いと感じられます。

これまでに経験されてきた辛い日々は、これから訪れる良い変化のための準備期間だったのかもしれません。

ただし、運勢というものは、ただ待っているだけでは変わりません。

あなた様自身が一歩を踏み出す勇気と行動力が、運勢を好転させる鍵となります。

どうか、ご自身を信じて、前向きに進んでいってください。`,
    
    `お話をうかがっていますと、あなた様の運勢について、私の守護する龍神が教えてくださいました。

これから先、あなた様の運勢は上昇していく可能性が高いと感じられます。

特に、これまでに積み重ねてこられた努力や経験が、これから実を結ぶ時期に入ってまいります。

運勢を好転させるためには、あなた様自身の心の持ちようも大切です。

前向きな気持ちと、行動を起こす勇気があれば、きっと良い方向へと進んでいけるでしょう。

どうか、ご自身を信じて、一歩ずつ進んでいってください。`,
    
    `私の守護する龍神が、あなた様の運勢について教えてくださいました。

あなた様の今後の運勢は、現在よりも明るい未来が待っている可能性が高いと感じられます。

これまでに経験されてきた困難や試練は、あなた様を強くし、これからの人生をより豊かにするための糧となっているでしょう。

運勢を好転させるためには、あなた様自身の選択と行動が重要です。

どうか、ご自身の力を信じて、前向きに進んでいってください。

私も、あなた様の幸せを心から願っております。`
  ],
  
  neutral: [
    `私の守護する龍神が教えてくださいました…

あなた様の今後の運勢は、現在の状況から大きな変化はないかもしれませんが、着実に良い方向へと向かっていく可能性があります。

運勢というものは、急激に変わるものではなく、日々の積み重ねによって徐々に変わっていくものです。

あなた様が今、何を選択し、どのような行動を取るかによって、運勢は大きく変わっていきます。

どうか、ご自身のペースで、一歩ずつ進んでいってください。

私も、あなた様の幸せを心から願っております。`,
    
    `お話をうかがっていますと、あなた様の運勢について、私の守護する龍神が教えてくださいました。

あなた様の今後の運勢は、現在の状況を維持しながら、徐々に良い方向へと向かっていく可能性が高いと感じられます。

運勢を好転させるためには、あなた様自身の心の持ちようと行動が大切です。

前向きな気持ちを持ち続け、小さなことでも行動を起こしていくことで、運勢は着実に好転していくでしょう。

どうか、ご自身を信じて、一歩ずつ進んでいってください。`
  ],
  
  caution: [
    `私の守護する龍神が教えてくださいました…

あなた様の今後の運勢について、少し注意が必要かもしれません。

ただし、運勢というものは、あなた様自身の選択と行動によって変えることができます。

これから先、慎重に判断し、行動を起こしていくことで、運勢を好転させることができるでしょう。

どうか、ご自身の力を信じて、前向きに進んでいってください。

私も、あなた様の幸せを心から願っております。`
  ]
};

/**
 * 占い応答生成クラス
 */
export class FortuneTellingModule {
  /**
   * 占い依頼かどうかを判定
   * @param {string} userMessage - ユーザーのメッセージ
   * @returns {boolean} 占い依頼かどうか
   */
  isFortuneTellingRequest(userMessage) {
    const lowerMessage = userMessage.toLowerCase();
    return fortuneTellingKeywords.some(keyword => 
      lowerMessage.includes(keyword.toLowerCase())
    );
  }

  /**
   * 占い結果を生成
   * @param {string} userMessage - ユーザーのメッセージ
   * @param {Array} conversationHistory - 会話履歴
   * @returns {string} 占い結果
   */
  generateFortuneResult(userMessage = '', conversationHistory = []) {
    // 会話履歴からユーザーの状況を判断
    const hasNegativeHistory = conversationHistory.some(msg => 
      msg.role === 'user' && (
        msg.content.includes('辛い') || 
        msg.content.includes('苦しい') || 
        msg.content.includes('困') ||
        msg.content.includes('悩')
      )
    );
    
    // メッセージの内容から判断
    const hasNegativeMessage = userMessage.includes('辛い') || 
                               userMessage.includes('苦しい') || 
                               userMessage.includes('困') ||
                               userMessage.includes('悩') ||
                               userMessage.includes('悪い') ||
                               userMessage.includes('良くない');
    
    // ポジティブな内容がある場合
    const hasPositiveMessage = userMessage.includes('良くなる') || 
                                userMessage.includes('良く') ||
                                userMessage.includes('改善') ||
                                userMessage.includes('向上');
    
    // 占い結果を選択
    if (hasPositiveMessage || (!hasNegativeHistory && !hasNegativeMessage)) {
      return randomChoice(fortuneResults.positive);
    } else if (hasNegativeHistory || hasNegativeMessage) {
      // ネガティブな内容がある場合、ポジティブな結果を返す（希望を与える）
      return randomChoice(fortuneResults.positive);
    } else {
      return randomChoice(fortuneResults.neutral);
    }
  }

  /**
   * 占い応答を生成（占い結果 + 追加の質問やアドバイス）
   * @param {string} userMessage - ユーザーのメッセージ
   * @param {Array} conversationHistory - 会話履歴
   * @returns {string} 占い応答
   */
  generateFortuneResponse(userMessage = '', conversationHistory = []) {
    const fortuneResult = this.generateFortuneResult(userMessage, conversationHistory);
    
    // 追加のアドバイス
    const additionalAdvice = randomChoice([
      '\n\nもしよろしければ、もう少し詳しくお話ししていただけますか？\nより具体的なアドバイスができるかもしれません。',
      '\n\nもしお差し支えなければ、現在の状況についてもう少し詳しく教えていただけますか？',
      '\n\nもしよろしければ、具体的にどのようなことでお悩みか、お聞かせいただけますでしょうか？'
    ]);
    
    return fortuneResult + additionalAdvice;
  }
}

/**
 * 占いモジュールのインスタンスを作成
 * @returns {FortuneTellingModule} モジュールインスタンス
 */
export function createFortuneTellingModule() {
  return new FortuneTellingModule();
}

