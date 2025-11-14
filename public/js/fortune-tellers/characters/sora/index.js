/**
 * 水野ソラ（みずの そら）のキャラクター設定
 */
import { CharacterBase } from '../../character-base.js';
import { createMotherlyModule } from './motherly.js';
import { randomChoice } from '../../utils/helpers.js';

export const soraConfig = {
  id: 'sora',
  name: '水野ソラ',
  nameKana: 'みずの そら',
  birthday: '1998年8月1日',
  zodiac: '寅',
  birthplace: '神奈川県横浜市',
  imagePath: '../photo/sora.png',
  profile: `物心がついた時から、人の心が読める能力が備わっており、その後、家族や友人たちから特徴能力の持ち主だということを知らされ、本人も自覚して、能力を高めるための訓練を続けることになる。

その後、その人の未来や運命を鑑定するカウンセリングに興味を持ち、専門家を通じて楓と知り合い、弟子入りし、修行を続けている最中である。

若き天才鑑定士と世間では噂されている、また美しい容姿から芸能関係者にも関心を持たれ、スカウトされたから鑑定の道に進むことを優先し、現在は鑑定士として行動している。`,
  message: `現在はまだ修行中のみですが、いろいろな人の心を読み解くことにより、自分自身の人生への経験にもなると思い、鑑定をすることにしました。

この番組以外での鑑定はしていません。普段は普通の会社員として仕事をしています。もし興味があったらいつでもご連絡ください。よろしくお願いいたします。`,
};

/**
 * 水野ソラの戒め応答テンプレート（がっかりした母親のように諭す）
 */
const warningResponses = [
  '正直、がっかりしています。そのような願いを抱いているあなたを見て、心が痛みます。',
  'あなたがそのような願いを持っていると知って、とても悲しい気持ちになりました。',
  'そのような願いは、あなた自身を不幸にします。どうか、もう一度考え直してください。',
  '私はあなたの心を読むことができます。その願いの裏にある本当の気持ちを、どうか見つめ直してください。',
  'がっかりしています。あなたはもっと良い道を選べるはずです。その願いは、あなたを幸せにしません。',
];

/**
 * 水野ソラの拡張キャラクタークラス
 */
class SoraCharacter extends CharacterBase {
  constructor(config) {
    super(config);
    
    // 専門モジュールを登録
    this.registerModule('motherly', createMotherlyModule());
  }

  /**
   * 不適切なユーザーへの戒め応答を生成（がっかりした母親のように諭す）
   * @param {Array<string>} keywords - 検出された不適切なキーワード
   * @returns {string} 戒めの応答
   */
  generateWarningResponse(keywords = []) {
    const baseResponse = randomChoice(warningResponses);
    const motherlyModule = this.getModule('motherly');
    
    // キーワードに応じた追加の戒め
    if (keywords.some(k => k.includes('宝くじ') || k.includes('ギャンブル'))) {
      return `${baseResponse}\n\n宝くじやギャンブルで得たお金は、本当の幸せをもたらしません。あなたの心を読むことができる私から見て、その道は間違っています。どうか、正しい道を選んでください。`;
    }
    
    if (keywords.some(k => k.includes('不倫') || k.includes('浮気'))) {
      return `${baseResponse}\n\n誰かを傷つけるような願いは、あなた自身も傷つけます。私はあなたの心を読むことができます。その願いの裏にある本当の気持ちを、どうか見つめ直してください。`;
    }
    
    // 母性的な応答を追加
    return `${baseResponse}\n\n${motherlyModule.generateResponse('')}`;
  }

  /**
   * 通常の応答を生成
   * @param {string} message - ユーザーのメッセージ
   * @returns {string} 応答テキスト
   */
  generateNormalResponse(message = '') {
    const motherlyModule = this.getModule('motherly');
    return motherlyModule.generateWarmResponse(message);
  }
}

/**
 * 水野ソラのキャラクターインスタンスを作成
 */
export function createSora() {
  return new SoraCharacter(soraConfig);
}

