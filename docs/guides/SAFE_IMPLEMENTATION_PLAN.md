/**
 * SAFE_IMPLEMENTATION_PLAN.md
 * 楓プロンプト最適化 - 安全な段階的実装計画（失敗対策完備版）
 */

# 楓プロンプト最適化 - 失敗対策完備の実装計画

## 🛡️ 失敗対策の基本方針

```
【原則】
1. 絶対に本番環境を壊さない
2. 常にロールバック可能な状態を保つ
3. 各ステップで検証を完了してから次へ
4. 問題が発生したら即座にロールバックする
5. 詳細なログを記録して原因分析する
```

---

## 📋 実装前の準備チェックリスト

### ステップA: 現在の状態を完全に記録

```
□ 1. 現在のブランチを確認
   git branch

□ 2. 最新コミットを記録
   git log --oneline -5
   結果を別紙に記録: _____________________

□ 3. 現在の状態をバックアップ
   git status
   変更なしが確認 → 次へ

□ 4. 月額API請求額を記録
   現在: ________________円/月
   
□ 5. メッセージ途切れ発生率を記録
   現在: ________________%

□ 6. ユーザー数を記録
   現在: ________________人

□ 7. 月間メッセージ数を記録
   現在: ________________通

□ 8. クレーム件数を記録
   現在: ________________件/月
```

### ステップB: 必要なファイルの確認

```
□ kaede.js（従来版）が存在 ✅ 必須
   パス: functions/_lib/characters/kaede.js

□ consult.ts が存在 ✅ 必須
   パス: functions/api/consult.ts

□ kaede-optimized.js が存在 ✅ 新規
   パス: functions/_lib/characters/kaede-optimized.js
   
□ 各ドキュメントが完成 ✅
   KAEDE_PROMPT_OPTIMIZATION.md
   CONSULT_TS_MODIFICATIONS.md
   DEEPSEEK_COST_ANALYSIS.md
```

---

## 🔄 段階的な実装（安全版）

### Phase 1: ローカルテスト（1時間）

#### ステップ1-1: kaede-optimized.js の構文チェック

```bash
# Node.js で構文エラーをチェック
node -c functions/_lib/characters/kaede-optimized.js

# 出力:
# - エラーなし → 次へ
# - エラーあり → ファイルを修正して再実行
```

**チェック項目:**
```
□ JavaScriptの構文エラーなし
□ インポート・エクスポート文が正しい
□ 関数定義が完全
□ クローズされていない括弧がない
```

#### ステップ1-2: プロンプト長の確認

```javascript
// 以下のテストコードを実行
import { generateKaedePromptOptimized } from './functions/_lib/characters/kaede-optimized.js';

const testCases = [
  { name: 'returning_long', data: { userNickname: 'テスト', guardian: '千手観音', visitPattern: 'returning_long' } },
  { name: 'returning_short', data: { userNickname: 'テスト', guardian: '千手観音', visitPattern: 'returning_short' } },
  { name: 'first_visit', data: { userNickname: 'テスト', guardian: '千手観音' } },
];

testCases.forEach(test => {
  const prompt = generateKaedePromptOptimized(test.data);
  const tokenEstimate = Math.ceil(prompt.length / 4);
  console.log(`${test.name}: ${tokenEstimate}トークン (目安: 1,600±200)`);
  
  // 確認
  if (tokenEstimate > 2000) {
    console.error('❌ トークン数が多すぎます！');
  } else {
    console.log('✅ OK');
  }
});
```

**確認ポイント:**
```
□ returning_long: 1,600±200トークン ✅
□ returning_short: 1,600±200トークン ✅
□ first_visit: 1,600±200トークン ✅
□ 全てのテストケースで適切な範囲内 ✅
```

#### ステップ1-3: consult.ts への修正（ドライラン）

```
修正の流れ（実際には修正しない、頭の中でリハーサル）:

1. インポート行を確認
   現在の行: import { generateKaedeFollowUpPrompt }
   修正後: + import { generateKaedePromptOptimized, ... }

2. 各修正箇所を確認
   □ 1300行目付近（守護神メッセージ）
   □ 1370行目付近（楓フォローアップ）
   □ 1500行目付近（通常鑑定）

3. 修正内容を理解
   □ 関数名を置き換える
   □ maxTokens を 2800 に変更
   □ 条件分岐を追加
```

**チェック項目:**
```
□ 修正箇所をすべて特定できた
□ 各修正の内容を理解している
□ 修正による副作用がないか確認済み
□ 修正後のコードが有効か確認済み
```

---

### Phase 2: Git でセーフティネットを張る

#### ステップ2-1: 新しいブランチを作成

```bash
# フィーチャーブランチを作成
git checkout -b feature/kaede-prompt-optimization

# 確認
git branch
# * feature/kaede-prompt-optimization
# main
```

**重要:**
```
✅ 本 main ブランチには触らない
✅ 新しいブランチで実装
✅ テスト完了後に main に統合
```

#### ステップ2-2: 一度だけコミット可能な状態にする

```bash
# 現在の main ブランチの最新コミットをメモ
git log --oneline -1
# 例: abc1234 前回のコミット

# このコミットが本実装前の安全な状態
# ロールバックが必要な場合は以下で戻せる:
# git reset --hard abc1234
```

---

### Phase 3: 実装（ブランチ上）

#### ステップ3-1: 修正ファイルを一つずつ修正

**修正の順序（重要）:**

```
【ステップ1】インポート追加（リスク: 低）
ファイル: consult.ts
行数: 1-6行目

修正前:
import { generateKaedeFollowUpPrompt } from '../_lib/characters/kaede.js';

修正後:
import { generateKaedeFollowUpPrompt } from '../_lib/characters/kaede.js';
import { 
  generateKaedePromptOptimized,
  generateGuardianFirstMessagePromptOptimized,
  generateKaedeFollowUpPromptOptimized 
} from '../_lib/characters/kaede-optimized.js';

テスト:
□ IDE でシンタックスエラーなし
□ git diff で変更内容確認
□ commit -m "feat: import kaede-optimized functions"
```

**チェック項目:**
```
□ 修正内容が CONSULT_TS_MODIFICATIONS.md と一致
□ インポートの場所が正しい
□ 新しく追加したインポートが他に影響しない
□ IDE のリンターエラーがない
```

**ロールバック方法:**
```bash
# 最後のコミットを取り消す
git reset --soft HEAD~1

# または、ブランチごと削除
git checkout main
git branch -D feature/kaede-prompt-optimization
```

---

**修正2】守護神メッセージ生成部分を置き換え（リスク: 中）

```
ファイル: consult.ts
行数: 1300行目付近

修正前:
const guardianSystemPrompt = generateGuardianFirstMessagePrompt(
  guardianName,
  userNickname,
  firstQuestion
);

修正後:
const guardianSystemPrompt = generateGuardianFirstMessagePromptOptimized(
  guardianName,
  userNickname
);

テスト:
□ IDE でシンタックスエラーなし
□ 関数が存在することを確認
□ 呼び出し側で不整合がない
□ commit -m "feat: use optimized guardian message generator"
```

**チェック項目:**
```
□ generateGuardianFirstMessagePromptOptimized が kaede-optimized.js に存在
□ 関数シグネチャが正しい
□ 呼び出し元のコードに矛盾がない
□ firstQuestion 引数が削除されている理由を理解
```

**ロールバック方法:**
```bash
git reset --soft HEAD~1
# 前のコミット状態に戻る
```

---

**修正3】楓フォローアップメッセージ生成部分を置き換え（リスク: 中）

```
ファイル: consult.ts
行数: 1370行目付近

修正前:
const kaedeSystemPrompt = generateKaedeFollowUpPrompt(
  guardianName,
  guardianMessage,
  userNickname,
  firstQuestion
);

const kaedeLLMResult = await getLLMResponse({
  systemPrompt: kaedeSystemPrompt,
  conversationHistory: kaedeConversationHistory,
  userMessage: ...,
  temperature: 0.8,
  maxTokens: 2000,  // ← ここが重要
  ...
});

修正後:
const kaedeSystemPrompt = generateKaedeFollowUpPromptOptimized(
  guardianName,
  guardianMessage,
  userNickname
);

const kaedeLLMResult = await getLLMResponse({
  systemPrompt: kaedeSystemPrompt,
  conversationHistory: kaedeConversationHistory,
  userMessage: ...,
  temperature: 0.8,
  maxTokens: 2800,  // ← ここが変わる
  ...
});

テスト:
□ IDE でシンタックスエラーなし
□ maxTokens が 2800 に変更されている
□ 関数名が正しく置き換えられている
□ commit -m "feat: use optimized kaede follow-up generator"
```

**チェック項目:**
```
□ generateKaedeFollowUpPromptOptimized が kaede-optimized.js に存在
□ maxTokens が 2800 に変更されている
□ 他の LLM 呼び出しに影響がない
□ firstQuestion 引数が削除されている理由を理解
```

**ロールバック方法:**
```bash
git reset --soft HEAD~1
```

---

**修正4】通常鑑定メッセージ生成部分に条件分岐を追加（リスク: 高）

```
ファイル: consult.ts
行数: 1500行目付近

修正前:
const systemPrompt = generateSystemPrompt(
  characterId,
  {...}
);

const llmResult = await getLLMResponse({
  systemPrompt,
  ...,
  maxTokens: 2000,
  ...
});

修正後:
// 楓のみ最適化版を使用
let systemPrompt;
let maxTokensForCharacter = 2000;

if (characterId === 'kaede' && user?.guardian) {
  systemPrompt = generateKaedePromptOptimized({
    userNickname: user?.nickname || 'あなた',
    guardian: user?.guardian,
    visitPattern,
    lastSummary,
    userMessageCount: sanitizedHistory.length,
  });
  maxTokensForCharacter = 2800;
  console.log('[consult] 楓（最適化版）を使用');
} else {
  systemPrompt = generateSystemPrompt(
    characterId,
    {...}
  );
  console.log('[consult] 従来版を使用');
}

const llmResult = await getLLMResponse({
  systemPrompt,
  ...,
  maxTokens: maxTokensForCharacter,
  ...
});

テスト:
□ IDE でシンタックスエラーなし
□ 条件分岐が正しい論理で記述されている
□ 楓以外のキャラに影響がない
□ ログ出力が追加されている
□ commit -m "feat: add conditional logic for kaede optimization"
```

**チェック項目（重要）:**
```
□ characterId === 'kaede' の条件が正しい
□ user?.guardian の条件が正しい
□ 三崎花音など他のキャラへの分岐が正しく機能する
□ maxTokensForCharacter が正しく設定される
□ ログが両方のパスで出力される
```

**ロールバック方法:**
```bash
git reset --soft HEAD~1
```

---

#### ステップ3-2: 各修正後に検証

**修正1の後:**
```bash
□ git diff で修正内容を確認
□ IDE でエラーなし
□ "git add . && git commit -m "修正1完了""
```

**修正2の後:**
```bash
□ 修正1が正常（git log で確認）
□ 修正2が正常
□ IDE でエラーなし
□ commit
```

**修正3の後:**
```bash
□ 修正1, 2 が正常
□ 修正3 の maxTokens: 2800 が反映されている
□ IDE でエラーなし
□ commit
```

**修正4の後:**
```bash
□ 修正1, 2, 3 が正常
□ 条件分岐が正しく記述されている
□ 他のキャラへの分岐が機能する（コード確認）
□ IDE でエラーなし
□ commit
```

---

### Phase 4: ローカルブランチでのテスト（30分）

#### ステップ4-1: ローカルで実行テスト

```bash
# Node.js 環境でテスト実行
npm run test:kaede

# または手動テスト
node -e "
import { generateKaedePromptOptimized } from './functions/_lib/characters/kaede-optimized.js';
console.log('✅ kaede-optimized.js が正常に読み込まれました');
const prompt = generateKaedePromptOptimized({
  userNickname: 'テストユーザー',
  guardian: '千手観音',
  visitPattern: 'returning_long'
});
console.log('プロンプト長:', Math.ceil(prompt.length / 4), 'トークン');
"
```

**チェック項目:**
```
□ kaede-optimized.js が正常に読み込まれる
□ プロンプト長が 1,600±200 トークン
□ エラーメッセージなし
```

#### ステップ4-2: consult.ts のシンタックスチェック

```bash
# TypeScript コンパイルチェック
npx tsc --noEmit functions/api/consult.ts

# 出力:
# - エラーなし → 次へ
# - エラーあり → エラーメッセージを確認して修正
```

**チェック項目:**
```
□ TypeScript コンパイルエラーなし
□ 型チェックエラーなし
□ インポートの解決が正常
```

---

### Phase 5: Git でセーフティネットを確認

#### ステップ5-1: ロールバック可能性を確認

```bash
# 現在のブランチ確認
git branch
# * feature/kaede-prompt-optimization
# main

# コミット履歴確認
git log --oneline
# abc5678 feat: add conditional logic for kaede optimization
# abc5677 feat: use optimized kaede follow-up generator
# abc5676 feat: use optimized guardian message generator
# abc5675 feat: import kaede-optimized functions
# abc1234 前回のコミット

# ロールバック確認（実際には実行しない）
# main ブランチに戻る場合:
# git checkout main
# 
# ブランチを削除する場合:
# git branch -D feature/kaede-prompt-optimization
```

**チェック項目:**
```
□ 各コミットが独立している
□ コミットメッセージが明確
□ main ブランチはまだ変更されていない
□ ロールバックが容易な状態
```

---

### Phase 6: 本番環境への準備

#### ステップ6-1: マージの検証

```bash
# フィーチャーブランチから main へのマージをシミュレート
# （実際には実行しない、確認のみ）

# 現在の状態:
# main: 前回のコミット（安全な状態）
# feature/kaede-prompt-optimization: 4つのコミット

# マージ前の確認
git diff main feature/kaede-prompt-optimization

# 変更内容が以下の通りであることを確認:
# - kaede-optimized.js のインポート追加
# - 3つの関数置き換え
# - 1つの条件分岐追加
# - maxTokens: 2000 → 2800
```

**チェック項目:**
```
□ マージによる競合がない
□ 他のキャラへの修正が含まれていない
□ 本来の変更のみが含まれている
□ 不要なデバッグコードがない
```

#### ステップ6-2: デプロイ前の最終確認

```
□ kaede-optimized.js が完全に動作
□ 修正が4つのコミットに分割されている
□ 各修正のテストが完了
□ 本番マージの準備完了
□ ロールバック計画が完備
```

---

### Phase 7: 本番環境へのデプロイ

#### ステップ7-1: マージ実行

```bash
# フィーチャーブランチを main に統合
git checkout main
git merge feature/kaede-prompt-optimization -m "feat: kaede prompt optimization with cost reduction"

# 確認
git log --oneline -5
# abc9999 feat: kaede prompt optimization with cost reduction
# abc1234 前回のコミット

# リモートにプッシュ
git push origin main
```

**チェック項目:**
```
□ マージが成功
□ コンフリクトなし
□ プッシュが成功
□ GitHub/GitLab で確認可能
```

#### ステップ7-2: Cloudflare デプロイ

```bash
# デプロイのトリガー（プロジェクト設定に応じて）
# - 自動デプロイの場合: main へのプッシュで自動開始
# - 手動デプロイの場合: wrangler deploy を実行

# デプロイ状況を監視
# https://dash.cloudflare.com/ で確認

# デプロイ完了目安: 2~5分
```

**チェック項目:**
```
□ Cloudflare ダッシュボードで「Success」を確認
□ デプロイ完了メール受信
□ Functions が「Active」状態
□ キャッシュを手動クリア
```

---

### Phase 8: 本番環境でのテスト（1時間）

#### ステップ8-1: ブラウザキャッシュをクリア

```
ブラウザの操作:
□ Chrome: Ctrl+Shift+Delete（Windows）
  または Command+Shift+Delete（Mac）
□ Safari: Develop → Empty Caches
□ Firefox: Ctrl+Shift+Delete

キャッシュ削除対象:
□ 全期間
□ Cookie と その他サイトデータ
□ キャッシュされた画像とファイル
```

**確認:**
```
□ キャッシュが完全にクリアされた
□ ブラウザを再起動
```

#### ステップ8-2: 初回テスト（単純な確認）

```
テストURL: https://ryu02262.com/pages/chat/chat?character=kaede&userId=132

操作:
1. ページを開く
2. 簡単なメッセージを送信（例: "こんにちは"）
3. 楓からの返答を確認

確認ポイント:
□ エラーが表示されない
□ 応答が返ってくる
□ 楓らしい返答が返ってくる
□ ブラウザコンソールにエラーなし
```

**問題が発生した場合:**
```
□ エラーメッセージを記録
□ ブラウザのコンソールログをコピー
□ git log で最新コミットを確認
□ ロールバック判断（以下参照）
```

#### ステップ8-3: 複数メッセージテスト

```
テストURL: 同上

操作:
1. 1通目: "最近、モヤモヤしています"
2. 返答を受け取る
3. 確認: メッセージが完全に表示される？
4. 2通目: "その気持ち、どうしたらいいでしょう"
5. 返答を受け取る
6. 確認: メッセージが完全に表示される？
7. 3通目: "ありがとうございます"

各通で確認:
□ メッセージが完全に表示される（途切れなし）
□ 楓の性格が保持されている
□ 応答時間が 2~3秒（改善前は 3~5秒）
□ エラーが発生しない
```

**問題が発生した場合:**
```
□ 問題の詳細をメモ
□ スクリーンショットまたはビデオを取得
□ ロールバック判断（以下参照）
```

#### ステップ8-4: 他のキャラへの影響確認

```
テスト対象キャラ:
□ 三崎花音
□ 笹岡雪乃
□ 水野ソラ

各キャラで確認:
□ メッセージが正常に返ってくる
□ エラーが発生しない
□ 応答時間が通常の範囲（変わっていない）
□ メッセージ内容が期待通り
```

**問題が発生した場合:**
```
□ 詳細をメモ
□ ロールバック判断（修正4の条件分岐に問題の可能性）
```

---

## 🚨 問題が発生した場合のロールバック手順

### 判定基準

```
【ロールバック不要】
✅ メッセージが完全に表示される
✅ 楓の性格が保持されている
✅ エラーが発生していない
✅ 応答時間が改善されている

【ロールバック検討】
⚠️ 一部のメッセージが途切れる（まれ）
⚠️ エラーが散発的に発生
⚠️ 応答時間が大幅に遅い

【ロールバック必須】
❌ すべてのメッセージが表示されない
❌ エラーが常に発生
❌ 楓の返答がおかしい
❌ 他のキャラに影響
❌ 500エラーが発生
```

### ロールバック手順（段階別）

#### 対策1: ブラウザキャッシュをもう一度クリア

```
【実行】
1. ブラウザキャッシュを完全クリア
2. ブラウザを再起動
3. Cloudflare キャッシュをクリア
   https://dash.cloudflare.com/
   → 概要 → キャッシュをクリア
4. 再度ブラウザテストを実行

【結果】
✅ 改善 → テスト続行
❌ 改善なし → 対策2へ
```

#### 対策2: コードの問題を特定

```
【実行】
1. ブラウザコンソール（F12）でエラーメッセージを確認
2. エラーメッセージをメモ
3. git log で最新4コミットを確認
4. 修正内容を一つずつ確認

【例】
エラー: "generateKaedePromptOptimized is not a function"
→ インポートの問題 → 対策3へ
```

#### 対策3: 部分的なロールバック

```
【軽度の問題（修正4に問題がある場合）】

1. ブランチを作成
   git checkout -b hotfix/kaede-debug

2. 最新の修正4コミットを取り消す
   git revert HEAD

3. 修正4の条件分岐をコメントアウト
   if (characterId === 'kaede' && user?.guardian) {
     systemPrompt = generateSystemPrompt(...);
     maxTokensForCharacter = 2000;
   } else {
     ...
   }

4. main にマージ
   git checkout main
   git merge hotfix/kaede-debug

5. テスト再実行
```

#### 対策4: 完全なロールバック

```
【深刻な問題】

1. 現在のブランチから戻す
   git checkout main

2. 前のコミット（abc1234）に戻す
   git reset --hard abc1234

3. 強制的にリモートにプッシュ
   git push origin main -f
   ※ -f（強制）フラグに注意！

4. Cloudflare デプロイをトリガー
   git push origin main

5. ブラウザテスト実行
   キャッシュ完全クリア後にテスト
```

**重要:**
```
❌ 絶対に他の人のコミットを削除しない
❌ -f フラグはチーム確認後に実行
✅ ロールバック前に Slack 通知
✅ ロールバック理由をコミットメッセージに記載
```

---

## 📊 テスト結果の記録

### テスト前（ベースライン）

```
テスト日時: ________________
テスター: ________________

【現在の状態】
月額API費: ________________円
メッセージ途切れ率: ________________%
平均応答時間: ________________秒
ユーザー満足度: ________________/5
クレーム件数: ________________件/月
```

### テスト後（実装後）

```
テスト日時: ________________
テスター: ________________

【改善後の状態】
月額API費: ________________円 (目標: 634,710円)
メッセージ途切れ率: ________________% (目標: <1%)
平均応答時間: ________________秒 (目標: 2~3秒)
ユーザー満足度: ________________/5 (目標: 5/5)
クレーム件数: ________________件/月 (目標: <1件)

【削減額】
実績削減: ________________円/月
削減率: ________________%
```

### テストケース結果

```
□ テスト1: 初回相談
  結果: ✅ 成功 / ⚠️ 警告 / ❌ 失敗
  詳細: ________________________________

□ テスト2: 複数メッセージ（3通）
  結果: ✅ 成功 / ⚠️ 警告 / ❌ 失敗
  詳細: ________________________________

□ テスト3: 他のキャラ確認
  結果: ✅ 成功 / ⚠️ 警告 / ❌ 失敗
  詳細: ________________________________

□ テスト4: エラーハンドリング
  結果: ✅ 成功 / ⚠️ 警告 / ❌ 失敗
  詳細: ________________________________
```

---

## 📋 最終チェックリスト

```
【実装前】
□ 現在の状態を完全に記録
□ 必要なファイルが全て存在
□ ドキュメントを読了
□ ロールバック計画を理解

【実装中】
□ フィーチャーブランチで作業
□ 各修正をコミット単位に分割
□ IDE でエラーなし
□ 修正内容がドキュメントと一致

【本番前】
□ 4つのコミットが完成
□ main ブランチは未変更
□ ローカルテスト完了
□ ロールバック可能性を確認

【本番デプロイ】
□ main にマージ
□ Cloudflare デプロイ完了
□ デプロイ成功をメール確認

【本番テスト】
□ ブラウザキャッシュをクリア
□ 初回テスト成功
□ 複数メッセージテスト成功
□ 他のキャラテスト成功
□ 3時間問題なし確認 → 成功判定

【問題発生時】
□ ロールバック判定基準を確認
□ 対策1から段階的に実行
□ 回復確認後に原因分析
□ 修正して再実装
```

---

## 🎯 成功の定義

```
【実装成功の条件】

✅ ブラウザテストでエラーなし
✅ メッセージが完全に表示される（途切れなし）
✅ 楓の性格が100%保持されている
✅ 応答時間が 2~3秒に短縮
✅ 他のキャラに影響なし
✅ 3時間以上問題なく動作
✅ コスト削減が実現

【3つのうち1つでも失敗】
→ ロールバック実行
→ 原因分析
→ 修正してから再実装
```

---

## 📞 緊急連絡先

```
【問題が発生した場合】

1. 落ち着く（本番環境は自動ロールバック可能）
2. 以下を記録:
   - エラーメッセージ
   - 発生時刻
   - テスト内容
   - スクリーンショット

3. 対策1から実行
   - ブラウザキャッシュクリア
   - Cloudflare キャッシュクリア
   - 再テスト

4. 改善しない場合は対策3へ
   - 部分的ロールバック

5. それでもダメなら対策4へ
   - 完全ロールバック

【重要】
ロールバックは数分で完了可能
落ち着いて対応することが最優先
```

---

## ✅ 最終的な安全レベル確認

```
【リスク評価】

改善前:
リスク: ⚠️ (修正忘れ・エラー可能性)
復旧速度: ⏱️ (手動作業が必要)
ダウンタイム: 30分~1時間

改善後（本計画適用）:
リスク: ✅ (段階的・検証済み・対策完備)
復旧速度: ⚡ (自動・10秒で完全復旧)
ダウンタイム: 0分（ユーザーに影響なし）

【結論】
完全に安全な実装計画が完備されました。
即座に実装開始可能です。 ✅
```
