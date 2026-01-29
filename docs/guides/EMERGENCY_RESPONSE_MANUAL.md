/**
 * EMERGENCY_RESPONSE_MANUAL.md
 * 楓プロンプト最適化 - 緊急対応マニュアル
 */

# 緊急対応マニュアル

## 🚨 問題発生時の対応フロー

```
問題検出
   ↓
【対策1】ブラウザキャッシュクリア (5分)
   ↓
   ├─ 改善 → テスト続行 ✅
   └─ 改善なし ↓
【対策2】エラー内容を特定 (10分)
   ↓
   ├─ 軽度（修正4のバグ） → 対策3へ ⚠️
   └─ 深刻（全体的なエラー） → 対策4へ ❌
【対策3】部分的ロールバック (15分)
   ↓
   ├─ 改善 → 修正・再実装 ✅
   └─ 改善なし → 対策4へ
【対策4】完全ロールバック (5分)
   ↓
   ✅ 本番環境復旧（即座に実現）
```

---

## 📋 対策ガイド

### 対策1: ブラウザキャッシュをクリア（所要時間：5分）

#### Chrome の場合

```
1. Ctrl + Shift + Delete キーを押す
2. 表示される画面:
   - 時間範囲: 「すべて」を選択
   - 削除内容:
     □ Cookie と その他サイトデータ ✓
     □ キャッシュされた画像とファイル ✓
     ✓ 閲覧履歴（任意）
3. 「データを削除」をクリック
4. ブラウザを再起動
5. https://ryu02262.com にアクセス
```

#### Safari の場合

```
1. 「開発」メニュー → 「キャッシュを空にする」
2. 「Safari」→ 「環境設定」→ 「プライバシー」
3. 「Webサイトデータ」の「すべてのウェブサイトデータを削除」
4. ブラウザを再起動
5. サイトに再アクセス
```

#### Firefox の場合

```
1. Ctrl + Shift + Delete キーを押す
2. 「すべての時間」を選択
3. チェック:
   □ Cookie
   □ キャッシュ
4. 「今すぐ消去」をクリック
5. ブラウザを再起動
```

#### 確認方法

```
【ブラウザコンソール（F12）でキャッシュをクリア】
1. F12 を押す
2. Network タブを開く
3. 「キャッシュを無視して再度読み込み」（CtrlキーをクリックしながらF5）
4. すべてのリクエストが「200 OK」（キャッシュからではなく）

【Cloudflare キャッシュをクリア】
1. https://dash.cloudflare.com にアクセス
2. 左メニュー → 「キャッシュ」
3. 「キャッシュをクリア」
```

---

### 対策2: エラー内容を特定（所要時間：10分）

#### Step 1: エラーメッセージを記録

```
【ブラウザコンソールを開く】
F12 → Console タブ

【エラーが表示される場合】
例1:
Uncaught ReferenceError: generateKaedePromptOptimized is not a function
→ インポートの問題

例2:
TypeError: Cannot read property 'guardian' of undefined
→ ユーザーデータ取得の問題

例3:
SyntaxError: Unexpected token
→ コードの構文エラー
```

#### Step 2: エラーログを保存

```
【エラーログの保存方法】
1. コンソール内のエラーを右クリック
2. 「メッセージのコピー」
3. テキストエディタに貼り付け
4. ファイルを保存: error_log_[日時].txt
   例: error_log_20260127_143000.txt
```

#### Step 3: 修正から最新コミットを確認

```
git log --oneline -5

出力例:
abc9999 feat: add conditional logic for kaede optimization
abc5678 feat: use optimized kaede follow-up generator
abc5677 feat: use optimized guardian message generator
abc5676 feat: import kaede-optimized functions
abc1234 前回のコミット
```

#### Step 4: エラーを分類

```
【軽度の問題】
- メッセージが一部途切れる（ただし大部分は表示）
- 応答が少し遅い（3~5秒）
- ページ読み込みが少し遅い
→ 対策3へ

【中程度の問題】
- ブラウザコンソールに警告が表示される
- 一部のメッセージが完全に表示されない
- エラーが散発的に発生（毎回ではない）
→ キャッシュクリア後に対策3

【深刻な問題】
- すべてのリクエストで500エラー
- ページが開かない
- コンソールに赤いエラーが多数表示
- エラーが常に再現する
→ 即座に対策4（完全ロールバック）へ
```

---

### 対策3: 部分的ロールバック（所要時間：15分）

#### シナリオ: 修正4（条件分岐）に問題がある場合

```
【症状】
- 楓は問題ないが、他のキャラでエラーが出ている
- 条件分岐の論理が間違っている可能性

【対応】
1. ホットフィックスブランチを作成
   git checkout -b hotfix/kaede-condition-fix

2. 最新の修正をリバート
   git revert HEAD
   
   出力:
   Revert "feat: add conditional logic for kaede optimization"
   
3. main にマージ
   git checkout main
   git merge hotfix/kaede-condition-fix -m "hotfix: revert conditional logic"

4. デプロイ
   git push origin main

5. テスト
   キャッシュをクリアして再テスト
```

#### シナリオ: 修正3（maxTokens）に問題がある場合

```
【症状】
- メモリ不足エラーが表示される
- 応答が返ってこない場合がある

【対応】
1. maxTokens を元の 2000 に戻す
   git checkout -b hotfix/kaede-tokens-fix
   
2. 該当コミットを確認
   git show abc5678 | head -50
   
3. 問題箇所を修正
   maxTokens: 2800 → maxTokens: 2000
   
4. コミット
   git add -A
   git commit -m "hotfix: revert maxTokens to 2000"
   
5. main にマージしてデプロイ
```

#### シナリオ: インポートに問題がある場合

```
【症状】
"generateKaedePromptOptimized is not a function"

【対応】
1. インポート行を確認
   head -10 functions/api/consult.ts | grep -A3 "import"
   
2. kaede-optimized.js が存在するか確認
   ls -la functions/_lib/characters/kaede-optimized.js
   
3. 存在しない場合は、ファイルを復元
   git show HEAD:functions/_lib/characters/kaede-optimized.js > functions/_lib/characters/kaede-optimized.js
   
4. 再度デプロイ
```

---

### 対策4: 完全ロールバック（所要時間：5分）

#### 完全ロールバック手順

```
【極めて深刻な問題の場合のみ実行】

1. main ブランチにいることを確認
   git branch
   # * main
   # feature/kaede-prompt-optimization

2. 前のコミット（abc1234）を特定
   git log --oneline | grep -E "前回のコミット|Previous commit"
   
   出力例:
   abc1234 前回のコミット（実装前の安全な状態）

3. その時点に戻す
   git reset --hard abc1234
   
   確認メッセージ:
   HEAD is now at abc1234 前回のコミット

4. リモートに強制的にプッシュ
   git push origin main -f
   
   ⚠️ -f フラグに注意！
   これは確認なしにリモートの内容を上書きします
   
   出力:
   + abc9999...abc1234 main -> main (forced update)

5. Cloudflare デプロイをトリガー
   git push origin main
   
   デプロイが自動で開始されます

6. キャッシュをクリア
   https://dash.cloudflare.com
   → キャッシュをクリア

7. テスト
   3~5分後に本番環境が復旧
```

#### 確認

```
【ロールバック完了の確認】
1. git log --oneline -1
   # abc1234 前回のコミット
   
2. ブラウザでテスト
   キャッシュクリア後に確認
   
3. メッセージが表示される
   従来版（改善前）の動作に戻る
   
4. 本番環境復旧完了 ✅
```

---

## 📊 ロールバック判定フロー

```
【問題検出】

1分以内に確認:
└─ ❓ 500エラーが常に表示？
   ├─ Yes → 即座に対策4へ（完全ロールバック）
   └─ No → キャッシュクリア試行へ

5分後に確認:
└─ ❓ キャッシュクリア後も同じエラー？
   ├─ Yes → エラー内容を特定へ
   └─ No → テスト続行 ✅

10分後に確認:
└─ ❓ どの修正が原因か特定できた？
   ├─ Yes → 該当部分をロールバック（対策3）
   └─ No → 完全ロールバック（対策4）へ

15分後の判定:
└─ ❓ 部分ロールバックで改善した？
   ├─ Yes → 原因分析して修正・再実装
   └─ No → 完全ロールバック（対策4）へ
```

---

## 🔍 トラブルシューティング

### よくあるエラーと対応

#### Error 1: "generateKaedePromptOptimized is not a function"

```
【原因】
- インポートが正しく実行されていない
- kaede-optimized.js が存在しない

【対応】
1. kaede-optimized.js が存在するか確認
   ls functions/_lib/characters/kaede-optimized.js
   
2. インポート行を確認
   head -20 functions/api/consult.ts | grep kaede-optimized
   
3. 存在しない場合は、再度ファイルをコピー
   git show HEAD~4:functions/_lib/characters/kaede-optimized.js > functions/_lib/characters/kaede-optimized.js
   
4. デプロイを再実行
```

#### Error 2: "Cannot read property 'guardian' of undefined"

```
【原因】
- user オブジェクトが undefined
- guardian 決定前のユーザーでテストしている可能性

【対応】
1. 別のユーザーIDでテスト
   URL: https://ryu02262.com/pages/chat/chat?character=kaede&userId=OTHER_ID
   
2. guardian が決定しているユーザーを探す
   ガード関係が決定しているユーザーでテスト
   
3. 条件分岐を確認
   if (characterId === 'kaede' && user?.guardian)
   
   この条件が true になるユーザーでテスト
```

#### Error 3: "SyntaxError: Unexpected token"

```
【原因】
- JavaScript の構文エラー
- 括弧や引用符が閉じられていない

【対応】
1. TypeScript コンパイルエラーを確認
   npx tsc --noEmit functions/api/consult.ts
   
2. エラーメッセージから行番号を取得
   例: Line 1370: Expected ';'
   
3. その行を確認
   sed -n '1370p' functions/api/consult.ts
   
4. 括弧や引用符を確認
   - ( と ) がペアになっているか
   - { と } がペアになっているか
   - ' と ' がペアになっているか
   
5. 修正してデプロイ
```

#### Error 4: 500 エラー（Internal Server Error）

```
【原因】
- API 呼び出しの失敗
- DeepSeek API へのアクセスエラー
- 環境変数の不足

【対応】
1. 即座に対策4（完全ロールバック）を実行
   
2. 問題が解決したら、以下を確認:
   - DeepSeek API キーが正しい
   - API クォータが残っている
   - ネットワーク接続が正常
   
3. ローカルで再テスト
   npm test
   
4. 問題を修正してから再デプロイ
```

---

## 📞 チェックリスト（完全版）

### 問題発生直後（1分以内）

```
□ 落ち着く（本番環境は保護されている）
□ 何が起きたかを正確に記録
□ スクリーンショットまたはビデオを取得
□ ブラウザコンソール（F12）のエラーをメモ
□ 発生時刻を記録
□ 再現性を確認（毎回？たまに？）
```

### 初期対応（5分以内）

```
□ ブラウザキャッシュをクリア
□ ブラウザを再起動
□ Cloudflare キャッシュをクリア
□ 再度ブラウザテストを実行
□ 改善したか確認
```

### エラー分析（10分以内）

```
□ エラーメッセージを正確に記録
□ エラーの分類（軽度/中程度/深刻）
□ 修正のどこに原因があるか推測
□ git log で最新コミットを確認
□ 修正内容をファイルで確認
```

### 対応実行（15分以内）

```
□ 軽度の問題 → 対策3（部分ロールバック）
□ 中程度の問題 → 対策3（部分ロールバック）
□ 深刻な問題 → 対策4（完全ロールバック）
□ 対応が完了したら本番環境をテスト
□ 改善を確認
```

### 事後対応（1時間後）

```
□ 何が原因だったかを特定
□ 修正方法を検討
□ 修正コード作成
□ ローカルテスト実行
□ 修正をコミット
□ 再度デプロイ
□ テスト実行
```

---

## 🎯 成功の判定基準

```
【問題なし（続行）】
✅ メッセージが完全に表示される
✅ 楓の返答が正常
✅ エラーが表示されない
✅ 応答時間が 2~3秒
✅ 3時間問題なく動作

【問題あり（ロールバック）】
❌ メッセージが途中で途切れる
❌ エラーが常に表示される
❌ 500エラーが出ている
❌ 応答が返ってこない
❌ 他のキャラに影響がある
```

---

## 📝 対応記録テンプレート

```
【問題発生時の記録】

発生日時: ____年__月__日 __時__分
発見方法: ________________
症状: ________________
エラーメッセージ: ________________

【初期対応】
対策1実行時刻: ________________
改善: Yes / No

【分析結果】
エラー分類: 軽度 / 中程度 / 深刻
原因推測: ________________
修正内容: ________________

【対応実行】
実行対策: 対策___ 
実行時刻: ________________
結果: 改善 / 未改善

【事後対応】
原因特定: ________________
修正コード完成: ________________
再デプロイ: ________________
最終テスト: ________________
```

---

## 🎉 目指す状態

```
【完全に安全な状態】

1. 問題が発生しない
   ├─ 実装が完全
   ├─ テストが十分
   └─ 対策が完備 ✅

2. 問題が発生しても即座に復旧
   ├─ 対策1: 5分で改善
   ├─ 対策3: 15分で復旧
   └─ 対策4: 5分で完全復旧 ✅

3. ユーザーへの影響なし
   ├─ 自動ロールバック機能
   ├─ キャッシュ管理
   └─ フェールセーフ機構 ✅

= 100%安全な状態で実装実行！
```
