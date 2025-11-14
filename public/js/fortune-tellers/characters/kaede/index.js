/**
 * 楓（かえで）のキャラクター設定
 */
import { CharacterBase } from '../../character-base.js';
import { createBuddhistModule } from './buddhist.js';
import { createResponseModule } from './responses.js';
import { randomChoice } from '../../utils/helpers.js';

export const kaedeConfig = {
  id: 'kaede',
  name: '楓',
  nameKana: 'かえで',
  birthday: '1974年2月26日',
  zodiac: '虎',
  birthplace: '東京都台東区',
  imagePath: '../photo/kaede.png',
  profile: `東京の下町で生まれ育ったが、14歳の頃から未来予知や人の心が読めることを知られ、霊能力、予知能力があると周囲から認識されるようになる。

20代まで社会人として普通に生活をしていたが、30代後半より周囲の人からの相談を受けるようになり、カウンセリングという形で鑑定を開始。

40代の時に枕元に宇宙神が現れ、自らが現世で唯一の龍神の化身だと知らされ、それ以降、神界と現実を行き来しながら生活するようになる。

普段は誰にも知られず生活しているが、その存在は世界中の霊能者や特殊能力者から知られるようになり、日本の霊能者のほとんどが事実上の楓の能力の一部を授かり恩恵を受けている。

普段は一般人として過ごすことを日課としており、本当の姿を見せることは特別な条件の整った時、その対象者のみである。

人間の持つ運命を操る力を持っている。また、夢を現実に変えることを実現できる。

しかしそれは、悪用される危険をはらむものであり、決して人に知らされることなく、一般市民として人生を全うすることが務めであると考えている。`,
  message: `今回、あるご縁をいただき、期間限定で鑑定をすることになりました。

私は特殊能力や霊能力や神通力のようなものがあると周りから言われておりますが、自分ではただただ穏やかに日常を過ごすことが何よりの幸福の道だと考えております。

もし少しでも興味があったら、ご連絡の方よろしくお願いいたします。`,
};

/**
 * 楓の戒め応答テンプレート（龍神の威厳で厳しく戒める）
 */
const warningResponses = [
  '私は現世で唯一の龍神の化身として、そのような悪しき願いを聞き入れることはできません。',
  '龍神としての私の力は、悪用される危険をはらむものには決して向けられません。そのような願いは、神界の秩序を乱すものです。',
  '申し訳ございませんが、そのようなご相談にはお答えできません。龍神としての威厳と責任を持って、私はそれを拒否いたします。',
  'そのような願いは、一般市民としての務めを忘れた行為です。龍神の力は、正しい道を歩む者のためにのみ使われるのです。',
  '私は神界と現実を行き来する存在として、そのような悪用を許すことはできません。穏やかな日常を守ることが、私の務めです。',
];

/**
 * 楓の拡張キャラクタークラス
 */
class KaedeCharacter extends CharacterBase {
  constructor(config) {
    super(config);
    
    // 専門モジュールを登録
    this.registerModule('buddhist', createBuddhistModule());
    this.registerModule('response', createResponseModule());
  }

  /**
   * 不適切なユーザーへの戒め応答を生成（龍神の威厳で厳しく戒める）
   * @param {Array<string>} keywords - 検出された不適切なキーワード
   * @returns {string} 戒めの応答
   */
  generateWarningResponse(keywords = []) {
    const baseResponse = randomChoice(warningResponses);
    
    // キーワードに応じた追加の戒め
    if (keywords.some(k => k.includes('宝くじ') || k.includes('ギャンブル'))) {
      return `${baseResponse}\n\n宝くじやギャンブルに関する願いは、龍神の力の悪用であり、決して許されません。正しい道を歩むことが、運命を好転させる唯一の方法です。`;
    }
    
    if (keywords.some(k => k.includes('不倫') || k.includes('浮気'))) {
      return `${baseResponse}\n\n他人を不幸にするような願いは、神界の秩序を乱すものです。愛と誠実さこそが、真の幸福への道です。`;
    }
    
    return baseResponse;
  }

  /**
   * 通常の応答を生成
   * @param {string} message - ユーザーのメッセージ
   * @returns {string} 応答テキスト
   */
  generateNormalResponse(message = '') {
    const responseModule = this.getModule('response');
    const buddhistModule = this.getModule('buddhist');
    
    // メッセージの内容に応じて適切なモジュールを選択
    const lowerMessage = message.toLowerCase();
    
    // 仏教的な内容が含まれている場合
    if (lowerMessage.includes('悩み') || lowerMessage.includes('運命') || lowerMessage.includes('日常')) {
      const buddhistResponse = buddhistModule.generateResponse(message);
      const responseModuleResult = responseModule.generateResponse(message);
      
      // 組み合わせて応答
      return `${responseModuleResult.response}\n\n${buddhistResponse}`;
    }
    
    // 通常の応答
    const result = responseModule.generateResponse(message);
    return result.response;
  }
}

/**
 * 楓のキャラクターインスタンスを作成
 */
export function createKaede() {
  return new KaedeCharacter(kaedeConfig);
}

