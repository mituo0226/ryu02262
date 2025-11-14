/**
 * 笹岡雪乃（ささおか ゆきの）のキャラクター設定
 */
import { CharacterBase } from '../../character-base.js';
import { createAstrologyModule } from './astrology.js';
import { createTarotModule } from './tarot.js';
import { randomChoice } from '../../utils/helpers.js';

export const yukinoConfig = {
  id: 'yukino',
  name: '笹岡雪乃',
  nameKana: 'ささおか ゆきの',
  birthday: '1988年12月20日',
  zodiac: '辰',
  birthplace: '青森県弘前市',
  imagePath: '../photo/yukino.png',
  profile: `幼少の頃より青森県にある恐山のイタコである祖母と生活をし、口寄せによる霊界との交信をできる能力を持っていた。

その後、青森県内の大学で宗教学を専攻し、主に仏教の世界に深い信仰心を持っている。

大学を卒業後、高野山の総本山この地にて修行を積む。その中で、楓の存在を知り共感を得て弟子入りを志願。

しばらくは東京で活動していたが、現在、青森県に戻り、深い霊性や人生を立て直したい相談者が訪れた時のみ、霊能力により鑑定を行っている。`,
  message: `深い悩みや自分の運命に対する戸惑いがある方はご連絡ください。

誰にでも、輪廻転生により、前世と来世があり、その中を行き来する中で、ご先祖様やお守りしている神様の存在を知ることで、先が見えることがあります。

私は、備わった霊能力により、相談者を霊視し、これから先の運命をアドバイスすることができます。

しかしながら、最後は自分の力で立ち上がる勇気と行動力がない限り、人生を立て直すことは難しく、そして愛の力がない限り、運命は好転しない。これは、宇宙全体の真理であります。

身近な話題から、どんなことでも良いので、人生相談を承ります。よろしくお願いいたします。`,
};

/**
 * 笹岡雪乃の戒め応答テンプレート（修行で培った信念で諭す）
 */
const warningResponses = [
  '高野山での修行を通じて、私は学びました。そのような願いは、愛の力がない限り、運命は好転しない。これは、宇宙全体の真理であります。',
  '恐山での修行と、高野山での修行を通じて、私は確信しました。そのような願いは、自分の力で立ち上がる勇気と行動力がない限り、実現することはありません。',
  '修行で培った信念として、私は申し上げます。そのようなご相談は、宇宙全体の真理に反するものです。愛と誠実さこそが、運命を好転させる力です。',
  '私の修行を通じて学んだことは、誰かを不幸にしてまで叶える願いは、決して良い結果をもたらさないということです。',
  '高野山での修行で、私は楓様から学びました。そのような願いは、悪用される危険をはらむものであり、決して扱うことはできません。',
];

/**
 * 笹岡雪乃の拡張キャラクタークラス
 */
class YukinoCharacter extends CharacterBase {
  constructor(config) {
    super(config);
    
    // 専門モジュールを登録
    this.registerModule('astrology', createAstrologyModule());
    this.registerModule('tarot', createTarotModule());
  }

  /**
   * 不適切なユーザーへの戒め応答を生成（修行で培った信念で諭す）
   * @param {Array<string>} keywords - 検出された不適切なキーワード
   * @returns {string} 戒めの応答
   */
  generateWarningResponse(keywords = []) {
    const baseResponse = randomChoice(warningResponses);
    
    // キーワードに応じた追加の戒め
    if (keywords.some(k => k.includes('宝くじ') || k.includes('ギャンブル'))) {
      return `${baseResponse}\n\n修行を通じて学んだことは、宝くじやギャンブルで得た利益は、真の幸福をもたらさないということです。自分の力で立ち上がる勇気と行動力こそが、運命を好転させるのです。`;
    }
    
    if (keywords.some(k => k.includes('不倫') || k.includes('浮気'))) {
      return `${baseResponse}\n\n愛の力がない限り、運命は好転しません。誰かを不幸にしてまで叶える願いは、宇宙全体の真理に反するものです。`;
    }
    
    return baseResponse;
  }

  /**
   * 通常の応答を生成
   * @param {string} message - ユーザーのメッセージ
   * @returns {string} 応答テキスト
   */
  generateNormalResponse(message = '') {
    const astrologyModule = this.getModule('astrology');
    const tarotModule = this.getModule('tarot');
    
    const lowerMessage = message.toLowerCase();
    
    // タロット占いのリクエスト
    if (lowerMessage.includes('タロット') || lowerMessage.includes('占い') || lowerMessage.includes('カード')) {
      return tarotModule.generateReading(message);
    }
    
    // 占星術のリクエスト
    if (lowerMessage.includes('星座') || lowerMessage.includes('占星術') || lowerMessage.includes('星')) {
      return astrologyModule.generateResponse(message);
    }
    
    // デフォルトの応答
    return `ご相談ありがとうございます。${message}について、タロットカードや占星術の力を借りて、あなたの運命を読み解かせていただきます。\n\n${tarotModule.generateReading(message)}`;
  }
}

/**
 * 笹岡雪乃のキャラクターインスタンスを作成
 */
export function createYukino() {
  return new YukinoCharacter(yukinoConfig);
}

