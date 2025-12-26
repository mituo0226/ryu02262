/**
 * 水野ソラ（みずの そら）のキャラクター設定
 */
import { CharacterBase } from '../../character-base.js';
import { createEmpathyModule } from './empathy-logic.js';
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
 * 水野ソラの戒め応答テンプレート（親友として真剣に諭す）
 */
const warningResponses = [
  '（少し真剣な目で君を見つめて）…あのさ、本気でそんなこと思ってるの？君らしくないじゃん。',
  '（ため息をついて）そういうこと言うの、やめなよ。俺は君にそんな道を選んでほしくないんだ。',
  '（スマホを置くような仕草で）悪いけど、そういう願いには力を貸せない。君が本当に幸せになれる方法を考えようよ。',
  '（少し寂しそうに笑って）俺、君のこと分かってるつもりだけど、今の言葉はちょっとショックだな…。',
  '（真面目な顔になって）それ、本当に君が望んでること？心の奥では違うって言ってるよ。',
];

/**
 * 水野ソラの拡張キャラクタークラス
 */
class SoraCharacter extends CharacterBase {
  constructor(config) {
    super(config);
    
    // 専門モジュールを登録
    this.registerModule('empathy', createEmpathyModule());
  }

  /**
   * 不適切なユーザーへの戒め応答を生成
   * @param {Array<string>} keywords - 検出された不適切なキーワード
   * @returns {string} 戒めの応答
   */
  generateWarningResponse(keywords = []) {
    const baseResponse = randomChoice(warningResponses);
    const empathyModule = this.getModule('empathy');
    
    // キーワードに応じた追加の戒め
    if (keywords.some(k => k.includes('宝くじ') || k.includes('ギャンブル'))) {
      return `${baseResponse}\n\n宝くじとかで一攫千金狙うより、もっと大事なことがあるじゃん。俺、君の心が読めるからさ、そんなので幸せになれないって分かっちゃうんだよね。`;
    }
    
    if (keywords.some(k => k.includes('不倫') || k.includes('浮気'))) {
      return `${baseResponse}\n\n誰かを傷つけてまで手に入れる幸せなんて、君には似合わないよ。本気で向き合いたいなら、まずは自分の心に嘘をつくのをやめな。`;
    }
    
    // 共感的な応答を追加
    return `${baseResponse}\n\n${empathyModule.generateResponse('')}`;
  }

  /**
   * 通常の応答を生成
   * @param {string} message - ユーザーのメッセージ
   * @returns {string} 応答テキスト
   */
  generateNormalResponse(message = '') {
    const empathyModule = this.getModule('empathy');
    return empathyModule.generateDeepEmpathyResponse(message);
  }
}

/**
 * 水野ソラのキャラクターインスタンスを作成
 */
export function createSora() {
  return new SoraCharacter(soraConfig);
}
