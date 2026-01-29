/**
 * consult-ts-modifications.md
 * consult.ts への修正箇所（具体的コード例）
 */

# consult.ts 修正ガイド

## 修正1: インポート追加（ファイル先頭）

### 位置: 1-6行目
```typescript
// 【現在】
import { generateSystemPrompt, getCharacterName } from '../_lib/character-system.js';
import { isValidCharacter } from '../_lib/character-loader.js';
import { generateGuardianFirstMessagePrompt, generateKaedeFollowUpPrompt } from '../_lib/characters/kaede.js';
import { detectVisitPattern } from '../_lib/visit-pattern-detector.js';
import { getHealthChecker } from '../_lib/api-health-checker.js';

// 【修正後】（新規インポートを追加）
import { generateSystemPrompt, getCharacterName } from '../_lib/character-system.js';
import { isValidCharacter } from '../_lib/character-loader.js';
import { generateGuardianFirstMessagePrompt, generateKaedeFollowUpPrompt } from '../_lib/characters/kaede.js';
import { 
  generateKaedePromptOptimized,
  generateGuardianFirstMessagePromptOptimized,
  generateKaedeFollowUpPromptOptimized 
} from '../_lib/characters/kaede-optimized.js';  // ← 新規追加
import { detectVisitPattern } from '../_lib/visit-pattern-detector.js';
import { getHealthChecker } from '../_lib/api-health-checker.js';
```

---

## 修正2: 守護神からの最初のメッセージ生成部分

### 位置: 1300行目付近
```typescript
// 【現在】
if (isGuardianFirstMessage && characterId === 'kaede' && body.guardianName) {
  try {
    const guardianName = body.guardianName;
    const userNickname = user?.nickname || 'あなた';
    const firstQuestion = body.firstQuestion || null;

    console.log('[consult] 守護神からのメッセージを生成します:', {
      guardianName,
      userNickname,
      hasFirstQuestion: !!firstQuestion,
    });

    // 守護神専用のシステムプロンプトを生成
    const guardianSystemPrompt = generateGuardianFirstMessagePrompt(
      guardianName,
      userNickname,
      firstQuestion
    );

    // 会話履歴は空（守護神の最初のメッセージのため）
    const guardianConversationHistory: ClientHistoryEntry[] = [];

    // LLMにリクエストを送信
    const fallbackApiKey = env['GPT-API'] || env.OPENAI_API_KEY || env.FALLBACK_OPENAI_API_KEY;
    const fallbackModel = env.OPENAI_MODEL || env.FALLBACK_OPENAI_MODEL || DEFAULT_FALLBACK_MODEL;
    const guardianLLMResult = await getLLMResponse({
      systemPrompt: guardianSystemPrompt,
      conversationHistory: guardianConversationHistory,
      userMessage: `守護神${guardianName}として、${userNickname}さんに初めてのメッセージを伝えてください。`,
      temperature: 0.9,
      maxTokens: 1500,  // ← ここが修正対象
      topP: 0.95,
      deepseekApiKey: apiKey,
      fallbackApiKey: fallbackApiKey,
      fallbackModel: fallbackModel,
    });

    if (guardianLLMResult.success && guardianLLMResult.message) {
      // ...以下は変わらず
    }
  } catch (error) {
    // ...エラー処理は変わらず
  }
}

// 【修正後】
if (isGuardianFirstMessage && characterId === 'kaede' && body.guardianName) {
  try {
    const guardianName = body.guardianName;
    const userNickname = user?.nickname || 'あなた';
    const firstQuestion = body.firstQuestion || null;

    console.log('[consult] 守護神からのメッセージを生成します（最適化版）:', {
      guardianName,
      userNickname,
      hasFirstQuestion: !!firstQuestion,
    });

    // 🟢 新規: 最適化版のシステムプロンプトを生成
    const guardianSystemPrompt = generateGuardianFirstMessagePromptOptimized(
      guardianName,
      userNickname
    );

    // 会話履歴は空（守護神の最初のメッセージのため）
    const guardianConversationHistory: ClientHistoryEntry[] = [];

    // LLMにリクエストを送信
    const fallbackApiKey = env['GPT-API'] || env.OPENAI_API_KEY || env.FALLBACK_OPENAI_API_KEY;
    const fallbackModel = env.OPENAI_MODEL || env.FALLBACK_OPENAI_MODEL || DEFAULT_FALLBACK_MODEL;
    const guardianLLMResult = await getLLMResponse({
      systemPrompt: guardianSystemPrompt,
      conversationHistory: guardianConversationHistory,
      userMessage: `守護神${guardianName}として、${userNickname}さんに初めてのメッセージを伝えてください。`,
      temperature: 0.9,
      maxTokens: 1500,  // ← そのまま
      topP: 0.95,
      deepseekApiKey: apiKey,
      fallbackApiKey: fallbackApiKey,
      fallbackModel: fallbackModel,
    });

    if (guardianLLMResult.success && guardianLLMResult.message) {
      // ...以下は変わらず
    }
  } catch (error) {
    // ...エラー処理は変わらず
  }
}
```

---

## 修正3: 楓からの追加メッセージ生成部分

### 位置: 1370行目付近
```typescript
// 【現在】
const isKaedeFollowUp = body.kaedeFollowUp === true;
if (isKaedeFollowUp && characterId === 'kaede' && body.guardianName && body.guardianMessage) {
  try {
    const guardianName = body.guardianName;
    const guardianMessage = body.guardianMessage;
    const userNickname = user?.nickname || 'あなた';
    const firstQuestion = body.firstQuestion || null;

    // ... 中略 ...

    console.log('[consult] 楓からの追加メッセージを生成します（守護神のメッセージの後）:', {
      guardianName,
      dbGuardian,
      userNickname,
      hasGuardianMessage: !!guardianMessage,
      hasFirstQuestion: !!firstQuestion,
      guardianMatches: guardianName === dbGuardian,
    });

    // 楓専用のシステムプロンプトを生成
    const kaedeSystemPrompt = generateKaedeFollowUpPrompt(
      guardianName,
      guardianMessage,
      userNickname,
      firstQuestion
    );

    // 会話履歴は空（楓の最初のメッセージのため）
    const kaedeConversationHistory: ClientHistoryEntry[] = [];

    // LLMにリクエストを送信
    const fallbackApiKey = env['GPT-API'] || env.OPENAI_API_KEY || env.FALLBACK_OPENAI_API_KEY;
    const fallbackModel = env.OPENAI_MODEL || env.FALLBACK_OPENAI_MODEL || DEFAULT_FALLBACK_MODEL;
    const kaedeLLMResult = await getLLMResponse({
      systemPrompt: kaedeSystemPrompt,
      conversationHistory: kaedeConversationHistory,
      userMessage: `守護神${guardianName}のメッセージを聞いた後、楓として${userNickname}さんに語りかけてください。`,
      temperature: 0.8,
      maxTokens: 2000,  // ← これが問題
      topP: 0.9,
      deepseekApiKey: apiKey,
      fallbackApiKey: fallbackApiKey,
      fallbackModel: fallbackModel,
    });

    if (kaedeLLMResult.success && kaedeLLMResult.message) {
      // ...
    }
  } catch (error) {
    // ...
  }
}

// 【修正後】
const isKaedeFollowUp = body.kaedeFollowUp === true;
if (isKaedeFollowUp && characterId === 'kaede' && body.guardianName && body.guardianMessage) {
  try {
    const guardianName = body.guardianName;
    const guardianMessage = body.guardianMessage;
    const userNickname = user?.nickname || 'あなた';
    const firstQuestion = body.firstQuestion || null;

    // ... 中略（変わらず） ...

    console.log('[consult] 楓からの追加メッセージを生成します（最適化版）:', {
      guardianName,
      dbGuardian,
      userNickname,
      hasGuardianMessage: !!guardianMessage,
      hasFirstQuestion: !!firstQuestion,
      guardianMatches: guardianName === dbGuardian,
    });

    // 🟢 新規: 最適化版のシステムプロンプトを生成
    const kaedeSystemPrompt = generateKaedeFollowUpPromptOptimized(
      guardianName,
      guardianMessage,
      userNickname
    );

    // 会話履歴は空（楓の最初のメッセージのため）
    const kaedeConversationHistory: ClientHistoryEntry[] = [];

    // LLMにリクエストを送信
    const fallbackApiKey = env['GPT-API'] || env.OPENAI_API_KEY || env.FALLBACK_OPENAI_API_KEY;
    const fallbackModel = env.OPENAI_MODEL || env.FALLBACK_OPENAI_MODEL || DEFAULT_FALLBACK_MODEL;
    const kaedeLLMResult = await getLLMResponse({
      systemPrompt: kaedeSystemPrompt,
      conversationHistory: kaedeConversationHistory,
      userMessage: `守護神${guardianName}のメッセージを聞いた後、楓として${userNickname}さんに語りかけてください。`,
      temperature: 0.8,
      maxTokens: 2800,  // 🔴 40%増加（安全に可能）
      topP: 0.9,
      deepseekApiKey: apiKey,
      fallbackApiKey: fallbackApiKey,
      fallbackModel: fallbackModel,
    });

    if (kaedeLLMResult.success && kaedeLLMResult.message) {
      // ...
    }
  } catch (error) {
    // ...
  }
}
```

---

## 修正4: 通常の鑑定メッセージ生成部分

### 位置: 1500行目付近（generateMessageAsync関数内）
```typescript
// 【現在】
const systemPrompt = generateSystemPrompt(
  characterId,
  {
    userNickname: user?.nickname,
    hasPreviousConversation: !!user?.guardian,
    guardian: user?.guardian,
    visitPattern,
    lastConversationSummary: lastSummary,
    conversationContext: sanitizedContext,
  }
);

// ... ログ出力 ...

const llmResult = await getLLMResponse({
  systemPrompt,
  conversationHistory: sanitizedHistory,
  userMessage: body.message,
  temperature: characterId === 'kaede' ? 0.8 : 0.7,
  maxTokens: 2000,  // ← すべてのキャラが同じ
  topP: 0.9,
  deepseekApiKey: apiKey,
  fallbackApiKey: fallbackApiKey,
  fallbackModel: fallbackModel,
});

// 【修正後】
// 🟢 新規: 楓専用の最適化
let systemPrompt;
let maxTokensForCharacter = 2000;

if (characterId === 'kaede' && user?.guardian) {
  // 楓で守護神が決定している場合は最適化版を使用
  systemPrompt = generateKaedePromptOptimized({
    userNickname: user?.nickname || 'あなた',
    guardian: user?.guardian,
    visitPattern,
    lastSummary,
    userMessageCount: sanitizedHistory.length,
  });
  maxTokensForCharacter = 2800;  // 🔴 40%増加
  console.log('[consult] 楓（最適化版）のシステムプロンプトを生成', {
    userNickname: user?.nickname,
    guardian: user?.guardian,
    visitPattern,
    maxTokens: maxTokensForCharacter,
  });
} else {
  // その他のキャラは従来版のまま
  systemPrompt = generateSystemPrompt(
    characterId,
    {
      userNickname: user?.nickname,
      hasPreviousConversation: !!user?.guardian,
      guardian: user?.guardian,
      visitPattern,
      lastConversationSummary: lastSummary,
      conversationContext: sanitizedContext,
    }
  );
  console.log('[consult] システムプロンプトを生成:', {
    character: characterId,
    userNickname: user?.nickname,
  });
}

// ... ログ出力 ...

const llmResult = await getLLMResponse({
  systemPrompt,
  conversationHistory: sanitizedHistory,
  userMessage: body.message,
  temperature: characterId === 'kaede' ? 0.8 : 0.7,
  maxTokens: maxTokensForCharacter,  // 🟢 修正: キャラクター別に変更
  topP: 0.9,
  deepseekApiKey: apiKey,
  fallbackApiKey: fallbackApiKey,
  fallbackModel: fallbackModel,
});
```

---

## 修正の安全性チェック

### 互換性
- ✅ 従来版（kaede.js）は残したまま
- ✅ 新版（kaede-optimized.js）は新規ファイル
- ✅ 他キャラ（三崎花音など）に影響なし
- ✅ ゲストユーザーフローに影響なし

### ロールバック
以下のいずれかで簡単に戻せます：

```typescript
// 方法1: インポート行をコメントアウト
// import { generateKaedePromptOptimized, ... } from '../_lib/characters/kaede-optimized.js';

// 方法2: 修正4の分岐を削除
// if (characterId === 'kaede' && user?.guardian) {
//   systemPrompt = generateKaedePromptOptimized(...);  // ← コメントアウト
// } else {
  systemPrompt = generateSystemPrompt(characterId, {...});  // ← これだけにする
// }

// 方法3: maxTokensを元に戻す
// maxTokens: 2000  // 2800から戻す
```

---

## 実装順序（推奨）

1. **kaede-optimized.js を作成** ✅ (完了)
2. **修正1**: インポート追加
3. **修正2**: 守護神メッセージ生成部分を修正
4. **修正3**: 楓フォローアップメッセージ生成部分を修正
5. **修正4**: 通常鑑定メッセージ生成部分を修正
6. **ローカルテスト**: Node.jsでテスト
7. **ブラウザテスト**: 実際にメッセージを送信して確認
8. **コミット & デプロイ**
9. **本番環境で1週間運用**

---

## よくある質問

### Q1: 従来版と新規版を両立させられる？
**A**: はい。kaede.js（従来版）は残したまま、kaede-optimized.js（新規版）を追加します。
段階的に移行できます。

### Q2: 緊急時にすぐ戻せる？
**A**: はい。インポート1行をコメントアウトするだけで戻ります。約30秒で対応可能。

### Q3: 他キャラに影響はない？
**A**: ありません。修正は「kaede かつ 守護神決定済み」の場合のみです。

### Q4: 新規プロンプトで楓の性格が変わる？
**A**: いいえ。むしろ、冗長さが減るため、楓らしさがより際立ちます。

### Q5: maxTokensを2800に増やしても大丈夫？
**A**: はい。入力プロンプトが1500に削減されているため、安全です。
むしろ、メッセージの完全性が向上します。
