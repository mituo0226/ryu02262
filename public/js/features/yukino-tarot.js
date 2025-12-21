// public/js/features/yukino-tarot.js
// 笹岡雪乃のタロット占い機能

/**
 * タロットカード自動表示機能
 * AIの応答に「次のカード」への案内が含まれていたら、自動的に次のカードを表示する
 */

// タロットカードのデータ
const tarotCards = [
  { name: "愚者", upright: "新しい始まり", reversed: "無謀" },
  { name: "魔術師", upright: "創造性", reversed: "操作" },
  { name: "女教皇", upright: "直感", reversed: "秘密" },
  { name: "女帝", upright: "豊かさ", reversed: "依存" },
  { name: "皇帝", upright: "安定", reversed: "支配" },
  { name: "教皇", upright: "伝統", reversed: "反抗" },
  { name: "恋人", upright: "調和", reversed: "不和" },
  { name: "戦車", upright: "勝利", reversed: "暴走" },
  { name: "力", upright: "勇気", reversed: "弱さ" },
  { name: "隠者", upright: "内省", reversed: "孤立" },
  { name: "運命の輪", upright: "変化", reversed: "停滞" },
  { name: "正義", upright: "公正", reversed: "不公平" },
  { name: "吊された男", upright: "犠牲", reversed: "無駄" },
  { name: "死神", upright: "終わり", reversed: "停止" },
  { name: "節制", upright: "調整", reversed: "不均衡" },
  { name: "悪魔", upright: "束縛", reversed: "解放" },
  { name: "塔", upright: "破壊", reversed: "回避" },
  { name: "星", upright: "希望", reversed: "失望" },
  { name: "月", upright: "不安", reversed: "解決" },
  { name: "太陽", upright: "成功", reversed: "失敗" },
  { name: "審判", upright: "再生", reversed: "後悔" },
  { name: "世界", upright: "完成", reversed: "未完" }
];

/**
 * ランダムに3枚のカードを選ぶ
 */
function drawThreeCards() {
  const shuffled = [...tarotCards].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 3).map(card => ({
    ...card,
    isReversed: Math.random() < 0.5
  }));
}

/**
 * カード情報を整形してメッセージに追加
 */
function formatCardMessage(card, position) {
  const orientation = card.isReversed ? "逆位置" : "正位置";
  const meaning = card.isReversed ? card.reversed : card.upright;
  
  const positionLabel = {
    '過去': '過去のカード',
    '現在': '現在のカード', 
    '未来': '未来のカード'
  }[position];
  
  return `【${positionLabel}】\n${card.name}（${orientation}）\nキーワード: ${meaning}`;
}

/**
 * タロット占いセッションを開始
 */
export function startTarotSession() {
  console.log('[タロットカード] セッション開始');
  
  // 3枚のカードを引く
  const threeCards = drawThreeCards();
  
  // セッションストレージに保存
  sessionStorage.setItem('yukinoAllThreeCards', JSON.stringify(threeCards));
  sessionStorage.setItem('yukinoRemainingCards', JSON.stringify(['過去', '現在', '未来']));
  
  console.log('[タロットカード] 3枚のカードを準備:', threeCards);
  
  // 最初のカード（過去）を表示
  return showNextCard();
}

/**
 * 次のカードを表示
 */
export function showNextCard() {
  const allCards = JSON.parse(sessionStorage.getItem('yukinoAllThreeCards') || '[]');
  const remaining = JSON.parse(sessionStorage.getItem('yukinoRemainingCards') || '[]');
  
  console.log('[タロットカード] showNextCard 呼び出し:', {
    全カード数: allCards.length,
    残りカード: remaining
  });
  
  if (remaining.length === 0) {
    console.log('[タロットカード] すべてのカードを表示済み');
    return null;
  }
  
  const position = remaining[0];
  const cardIndex = ['過去', '現在', '未来'].indexOf(position);
  const card = allCards[cardIndex];
  
  if (!card) {
    console.error('[タロットカード] カードが見つかりません');
    return null;
  }
  
  // 表示したカードを残りから削除
  const newRemaining = remaining.slice(1);
  sessionStorage.setItem('yukinoRemainingCards', JSON.stringify(newRemaining));
  
  console.log('[タロットカード] カード表示:', {
    位置: position,
    カード: card.name,
    向き: card.isReversed ? '逆位置' : '正位置',
    残り: newRemaining
  });
  
  return formatCardMessage(card, position);
}

/**
 * AIの応答から「次のカード」への案内を検出
 */
function detectNextCardGuidance(text) {
    console.log('[タロットカード] detectNextCardGuidance 呼び出し:', {
        AIメッセージ長: text.length,
        '「次に現在のカードをめくりましょう」含む': text.includes('それでは次に現在のカードをめくりましょう！'),
        '「次に未来のカードをめくりましょう」含む': text.includes('それでは次に未来のカードをめくりましょう！'),
        '「まとめて解説しましょう」含む': text.includes('それでは、まとめて解説しましょう！！'),
        sessionStorage_残りカード: sessionStorage.getItem('yukinoRemainingCards'),
        sessionStorage_全カード: sessionStorage.getItem('yukinoAllThreeCards')
    });
    
    // 完全一致で検出（言い回しのバリエーションを許容しない）
    if (text.includes('それでは次に現在のカードをめくりましょう！')) {
        console.log('[タロットカード] 現在のカードへの案内を検出');
        return '現在';
    }
    if (text.includes('それでは次に未来のカードをめくりましょう！')) {
        console.log('[タロットカード] 未来のカードへの案内を検出');
        return '未来';
    }
    if (text.includes('それでは、まとめて解説しましょう！！')) {
        console.log('[タロットカード] まとめへの案内を検出');
        return 'まとめ';
    }
    return null;
}

/**
 * AIの応答を監視して、必要に応じて次のカードを表示
 */
export function handleAIResponse(aiMessage) {
  const guidance = detectNextCardGuidance(aiMessage);
  
  if (!guidance) {
    console.log('[タロットカード] 次のカードへの案内なし');
    return null;
  }
  
  if (guidance === 'まとめ') {
    console.log('[タロットカード] まとめに移行、カード表示終了');
    sessionStorage.removeItem('yukinoAllThreeCards');
    sessionStorage.removeItem('yukinoRemainingCards');
    return null;
  }
  
  // 次のカードを表示
  return showNextCard();
}

/**
 * タロットセッションをクリア
 */
export function clearTarotSession() {
  sessionStorage.removeItem('yukinoAllThreeCards');
  sessionStorage.removeItem('yukinoRemainingCards');
  console.log('[タロットカード] セッションをクリア');
}

// グローバルに公開（他のスクリプトから使用できるように）
window.yukinoTarot = {
  startTarotSession,
  showNextCard,
  handleAIResponse,
  clearTarotSession
};
