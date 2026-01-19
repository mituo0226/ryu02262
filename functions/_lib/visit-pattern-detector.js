/**
 * visit-pattern-detector.js
 * ユーザーの訪問パターンを判定
 * Cloudflare D1データベース対応版
 */

/**
 * 訪問パターンを判定
 * @param {Object} params
 * @param {number} params.userId - ユーザーID
 * @param {string} params.characterId - キャラクターID
 * @param {Object} params.database - D1データベース接続
 * @param {boolean} params.isRegisteredUser - ユーザーが登録済みかどうか（nicknameが存在するか）
 * @returns {Promise<Object>} 訪問パターン情報
 */
export async function detectVisitPattern({ userId, characterId, database, isRegisteredUser = false }) {
  try {
    console.log('[VisitPatternDetector] 訪問パターン判定開始:', { userId, characterId, isRegisteredUser });

    // 1. データベースから会話履歴を確認
    const conversationHistory = await getConversationHistory(database, userId, characterId);
    
    // 2. パターン判定
    const hasDbHistory = conversationHistory && conversationHistory.length > 0;

    if (!hasDbHistory) {
      // データベースに履歴がない場合
      if (isRegisteredUser) {
        // パターンC: 履歴なしの再訪問（継続セッション）
        // ユーザーが登録済みだが、このキャラクターとの会話履歴がない場合
        console.log('[VisitPatternDetector] 判定結果: continuing（履歴なしの再訪問）');
        return {
          pattern: 'continuing',
          conversationHistory: [],
          sessionContext: '前回の会話の継続です。同じセッション内での継続的な会話として応答してください。',
          lastConversationSummary: null
        };
      } else {
        // パターンA: 初回訪問
        console.log('[VisitPatternDetector] 判定結果: first_visit');
        return {
          pattern: 'first_visit',
          conversationHistory: [],
          sessionContext: null,
          lastConversationSummary: null
        };
      }
    }

    // パターンB: 履歴ありの再訪問
    const lastConversation = conversationHistory[0];
    const summary = generateConversationSummary(lastConversation, conversationHistory);
    
    console.log('[VisitPatternDetector] 判定結果: returning（履歴ありの再訪問）');
    return {
      pattern: 'returning',
      conversationHistory: conversationHistory,
      sessionContext: null,
      lastConversationSummary: summary
    };
  } catch (error) {
    console.error('[VisitPatternDetector] エラー:', error);
    // エラー時は初回訪問として扱う
    return {
      pattern: 'first_visit',
      conversationHistory: [],
      sessionContext: null,
      lastConversationSummary: null
    };
  }
}

/**
 * データベースから会話履歴を取得
 */
async function getConversationHistory(database, userId, characterId) {
  try {
    // Cloudflare D1の場合
    const result = await database.prepare(`
      SELECT 
        id,
        role,
        message as content,
        COALESCE(timestamp, created_at) as created_at
      FROM conversations 
      WHERE user_id = ? AND character_id = ?
      ORDER BY COALESCE(timestamp, created_at) DESC
      LIMIT 10
    `).bind(userId, characterId).all();

    return result.results || [];
  } catch (error) {
    console.error('[VisitPatternDetector] 履歴取得エラー:', error);
    return [];
  }
}

/**
 * 前回の会話を要約
 */
function generateConversationSummary(lastConversation, allHistory) {
  if (!lastConversation) {
    return '前回の会話の詳細が見つかりません';
  }

  try {
    // 前回の会話から主要なトピックを抽出
    const userMessage = lastConversation.content || '';
    const createdAt = lastConversation.created_at || '';

    // トピックを抽出
    const topic = extractTopicFromMessage(userMessage);
    
    // 会話の日時を整形
    const conversationDate = formatDate(createdAt);

    // 花音の最後の応答を探す
    const lastAssistantMessage = allHistory.find(h => h.role === 'assistant');
    const lastAdvice = lastAssistantMessage?.content?.substring(0, 150) || '';

    return `
前回(${conversationDate})の相談:
${topic}

花音からの言葉:
「${lastAdvice}${lastAdvice.length > 150 ? '...' : ''}」
`.trim();
  } catch (error) {
    console.error('[VisitPatternDetector] 要約生成エラー:', error);
    return '前回の会話を思い出しています…';
  }
}

/**
 * メッセージからトピックを抽出
 */
function extractTopicFromMessage(message) {
  if (!message) return '(詳細不明)';

  // キーワードマッチング
  const topicKeywords = {
    '恋愛': ['恋', '彼氏', '彼女', '好き', '愛', 'デート', '告白', '片思い', '別れ'],
    '仕事': ['仕事', '職場', '会社', '上司', '同僚', '転職', 'キャリア', '就職'],
    '人間関係': ['友達', '友人', '人間関係', '付き合い', '関係'],
    '家族': ['家族', '両親', '父', '母', '兄弟', '姉妹', '夫', '妻', '子供'],
    '将来': ['将来', '未来', '夢', '目標', 'やりたい'],
    '悩み': ['悩', '困', '辛い', '苦しい', '不安'],
    '決断': ['決める', '選ぶ', '迷', '決断']
  };

  for (const [topic, keywords] of Object.entries(topicKeywords)) {
    for (const keyword of keywords) {
      if (message.includes(keyword)) {
        // メッセージの最初の50文字を添えて返す
        const preview = message.substring(0, 50);
        return `${topic}について(「${preview}${message.length > 50 ? '...' : ''}」)`;
      }
    }
  }

  // キーワードが見つからない場合は、メッセージの最初の部分を返す
  const preview = message.substring(0, 60);
  return `「${preview}${message.length > 60 ? '...' : ''}」について`;
}

/**
 * 日時を整形
 */
function formatDate(dateString) {
  if (!dateString) return '前回';

  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return '今日';
    } else if (diffDays === 1) {
      return '昨日';
    } else if (diffDays < 7) {
      return `${diffDays}日前`;
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `${weeks}週間前`;
    } else {
      const month = date.getMonth() + 1;
      const day = date.getDate();
      return `${month}月${day}日`;
    }
  } catch (error) {
    return '前回';
  }
}
