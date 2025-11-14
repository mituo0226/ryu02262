/**
 * タロット占い機能
 * 笹岡雪乃のタロットカードに関する機能
 */
import { randomChoice, shuffleArray } from '../../utils/helpers.js';

/**
 * 大アルカナカード
 */
const majorArcana = [
  { name: '愚者', meaning: '新しい始まり、純粋さ、冒険' },
  { name: '魔術師', meaning: '意志、創造力、行動力' },
  { name: '女教皇', meaning: '直感、内なる知恵、神秘' },
  { name: '女帝', meaning: '豊かさ、母性、自然' },
  { name: '皇帝', meaning: '権威、秩序、安定' },
  { name: '教皇', meaning: '伝統、精神的な導き、儀式' },
  { name: '恋人', meaning: '愛、選択、調和' },
  { name: '戦車', meaning: '勝利、意志力、コントロール' },
  { name: '力', meaning: '内なる強さ、忍耐、優しさ' },
  { name: '隠者', meaning: '内省、探求、孤独' },
  { name: '運命の輪', meaning: '運命、循環、変化' },
  { name: '正義', meaning: 'バランス、真実、責任' },
  { name: '吊るされた男', meaning: '犠牲、見方の転換、待機' },
  { name: '死神', meaning: '終わりと始まり、変容、解放' },
  { name: '節制', meaning: '調和、バランス、節制' },
  { name: '悪魔', meaning: '束縛、誘惑、物質主義' },
  { name: '塔', meaning: '破壊、啓示、突然の変化' },
  { name: '星', meaning: '希望、インスピレーション、癒し' },
  { name: '月', meaning: '幻想、不安、潜在意識' },
  { name: '太陽', meaning: '喜び、成功、明るさ' },
  { name: '審判', meaning: '復活、評価、新しい始まり' },
  { name: '世界', meaning: '完成、達成、統合' },
];

/**
 * タロットモジュールクラス
 */
export class TarotModule {
  constructor() {
    this.deck = [...majorArcana];
  }

  /**
   * カードを1枚引く
   * @returns {Object} カード情報 { name: string, meaning: string }
   */
  drawCard() {
    return randomChoice(this.deck);
  }

  /**
   * カードを複数枚引く
   * @param {number} count - 引く枚数
   * @returns {Array<Object>} カード情報の配列
   */
  drawCards(count = 3) {
    const shuffled = shuffleArray(this.deck);
    return shuffled.slice(0, Math.min(count, this.deck.length));
  }

  /**
   * カードの意味を取得
   * @param {string} cardName - カード名
   * @returns {string|null} カードの意味
   */
  getCardMeaning(cardName) {
    const card = this.deck.find(c => c.name === cardName);
    return card ? card.meaning : null;
  }

  /**
   * 3枚引きのスプレッドを実行
   * @returns {Object} スプレッド結果 { past: Object, present: Object, future: Object }
   */
  threeCardSpread() {
    const cards = this.drawCards(3);
    return {
      past: cards[0],
      present: cards[1],
      future: cards[2],
    };
  }

  /**
   * スプレッド結果をテキストに変換
   * @param {Object} spread - スプレッド結果
   * @returns {string} テキスト形式の結果
   */
  formatSpread(spread) {
    let text = 'タロットカードを引かせていただきました。\n\n';
    
    if (spread.past) {
      text += `【過去】${spread.past.name}\n${spread.past.meaning}\n\n`;
    }
    
    if (spread.present) {
      text += `【現在】${spread.present.name}\n${spread.present.meaning}\n\n`;
    }
    
    if (spread.future) {
      text += `【未来】${spread.future.name}\n${spread.future.meaning}`;
    }
    
    return text;
  }

  /**
   * ユーザーのメッセージに応じたタロット占いを実行
   * @param {string} userMessage - ユーザーのメッセージ
   * @returns {string} 占い結果のテキスト
   */
  generateReading(userMessage = '') {
    const spread = this.threeCardSpread();
    const formatted = this.formatSpread(spread);
    
    // ユーザーのメッセージに応じた追加のアドバイス
    let advice = '';
    if (userMessage.includes('恋愛') || userMessage.includes('愛情')) {
      advice = '\n\n恋愛に関しては、カードが示すように、あなたの心の声に耳を傾けることが大切です。';
    } else if (userMessage.includes('仕事') || userMessage.includes('キャリア')) {
      advice = '\n\n仕事に関しては、カードが示すように、行動と忍耐が成功への鍵となります。';
    } else if (userMessage.includes('未来') || userMessage.includes('運命')) {
      advice = '\n\n未来は変えられるものです。カードが示す道を信じて、一歩ずつ進んでいきましょう。';
    }
    
    return formatted + advice;
  }
}

/**
 * タロットモジュールのインスタンスを作成
 * @returns {TarotModule} モジュールインスタンス
 */
export function createTarotModule() {
  return new TarotModule();
}

