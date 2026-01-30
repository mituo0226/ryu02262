/**
 * visit-pattern-detector.js
 * ユーザーの訪問パターンを判定（時間ベース判定対応版）
 * Cloudflare D1データベース対応版
 * 
 * 【改修内容】
 * - 時間ベースの訪問パターン判定を実装
 * - 3時間以内: returning_short
 * - 3時間以上12時間以内: returning_medium
 * - 12時間以上: returning_long
 * - 履歴なし: first_visit
 */

/**
 * 訪問パターンを判定（時間ベース判定対応）
 * @param {Object} params
 * @param {number} params.userId - ユーザーID
 * @param {string} params.characterId - キャラクターID
 * @param {Object} params.database - D1データベース接続
 * @param {boolean} params.isRegisteredUser - ユーザーが登録済みかどうか（nicknameが存在するか）
 * @param {Date} params.currentTime - 現在時刻（テスト用、省略可）
 * @returns {Promise<Object>} 訪問パターン情報
 */
export async function detectVisitPattern({ userId, characterId, database, isRegisteredUser = false, currentTime = null }) {
  try {
    console.log('[VisitPatternDetector] 訪問パターン判定開始:', { userId, characterId, isRegisteredUser });

    // 現在時刻を取得（UTC）
    const now = currentTime || new Date();
    const nowUtc = new Date(now.toISOString());

    // 1. 前回のユーザーメッセージ送信時刻を取得
    const lastVisitInfo = await getLastVisitInfo(database, userId, characterId);
    
    // 2. 履歴がない場合
    if (!lastVisitInfo || !lastVisitInfo.lastUpdatedAt) {
      console.log('[VisitPatternDetector] 判定結果: first_visit（履歴なし）');
      return {
        pattern: 'first_visit',
        timeSinceLastVisit: null,
        conversationHistory: [],
        sessionContext: null,
        lastConversationSummary: null
      };
    }

    // 3. 経過時間を計算（時間単位）
    const lastUpdatedAt = new Date(lastVisitInfo.lastUpdatedAt);
    const timeDiffMs = nowUtc.getTime() - lastUpdatedAt.getTime();
    const timeDiffHours = timeDiffMs / (1000 * 60 * 60);

    // エッジケース: 負の値（未来の時刻）の場合
    if (timeDiffHours < 0) {
      console.error('[VisitPatternDetector] エラー: 未来の時刻が検出されました', {
        lastUpdatedAt: lastUpdatedAt.toISOString(),
        now: nowUtc.toISOString(),
        timeDiffHours
      });
      // 安全のため初回訪問として扱う
      return {
        pattern: 'first_visit',
        timeSinceLastVisit: null,
        conversationHistory: [],
        sessionContext: null,
        lastConversationSummary: null
      };
    }

    // 4. 会話履歴を取得
    const conversationHistory = await getConversationHistory(database, userId, characterId);
    
    // 5. 会話要約を取得（データベースに保存されている場合はそれを使用、なければ生成）
    let lastConversationSummary = lastVisitInfo.conversationSummary;
    if (!lastConversationSummary && conversationHistory.length > 0) {
      // データベースに要約がない場合は、簡易的な要約を生成
      lastConversationSummary = generateConversationSummary(conversationHistory[0], conversationHistory);
    }

    // 6. 時間区分に応じてパターンを判定
    let pattern;
    if (timeDiffHours < 3) {
      pattern = 'returning_short';
    } else if (timeDiffHours < 12) {
      pattern = 'returning_medium';
    } else {
      pattern = 'returning_long';
      // 非常に長期間の未訪問の場合はログに記録
      if (timeDiffHours >= 24 * 30) { // 30日以上
        console.log('[VisitPatternDetector] 長期間未訪問を検出:', {
          userId,
          characterId,
          timeDiffHours: Math.floor(timeDiffHours / 24) + '日'
        });
      }
    }

    console.log('[VisitPatternDetector] 判定結果:', {
      pattern,
      timeSinceLastVisit: Math.round(timeDiffHours * 10) / 10, // 小数点第1位まで
      hasSummary: !!lastConversationSummary
    });

    return {
      pattern,
      timeSinceLastVisit: timeDiffHours,
      conversationHistory: conversationHistory,
      sessionContext: null,
      lastConversationSummary: lastConversationSummary
    };
  } catch (error) {
    console.error('[VisitPatternDetector] エラー:', error);
    // エラー時は初回訪問として扱う
    return {
      pattern: 'first_visit',
      timeSinceLastVisit: null,
      conversationHistory: [],
      sessionContext: null,
      lastConversationSummary: null
    };
  }
}

/**
 * 前回の訪問情報を取得（timestampとconversation_summary）
 */
async function getLastVisitInfo(database, userId, characterId) {
  try {
    // 最新のユーザーメッセージのtimestampを取得
    // 【重要】last_updated_atカラムはスキーマに存在しないため、timestampを使用
    const result = await database.prepare(`
      SELECT 
        COALESCE(timestamp, created_at) as last_updated_at
      FROM conversations 
      WHERE user_id = ? AND character_id = ? AND role = 'user'
      ORDER BY COALESCE(timestamp, created_at) DESC
      LIMIT 1
    `).bind(userId, characterId).first();

    if (!result || !result.last_updated_at) {
      console.log('[VisitPatternDetector] 前回訪問情報が見つかりません');
      return null;
    }

    return {
      lastUpdatedAt: result.last_updated_at,
      conversationSummary: null
    };
  } catch (error) {
    console.error('[VisitPatternDetector] 前回訪問情報取得エラー:', error);
    return null;
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
 * 前回の会話を要約（全キャラクター共通）
 * データベースに保存されている要約がない場合に使用
 */
function generateConversationSummary(lastConversation, allHistory) {
  if (!lastConversation || !allHistory || allHistory.length === 0) {
    return null;
  }

  try {
    // 直近の数メッセージから要点を抽出
    const recentMessages = allHistory.slice(-6); // 直近6メッセージ
    const lastUserMessages = recentMessages
      .filter(m => m.role === 'user')
      .map(m => m.content || '')
      .slice(-2); // 最後の2つのユーザーメッセージ
    
    // 最後の会話日時を整形
    const lastDate = new Date(lastConversation.created_at || Date.now());
    const dateStr = lastDate.toLocaleDateString('ja-JP', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    // 要約を生成（100〜200文字程度）
    const topics = lastUserMessages.filter(msg => msg.trim()).join('、');
    const messageCount = allHistory.length;
    
    // 文字列形式で返す（データベースに保存する形式に合わせる）
    const summaryText = topics || '前回の相談内容';
    
    return summaryText.length > 200 ? summaryText.substring(0, 200) + '...' : summaryText;
  } catch (error) {
    console.error('[VisitPatternDetector] 要約生成エラー:', error);
    return null;
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
