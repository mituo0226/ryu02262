# Cloud AIへの指示文

## タスク
`public/js/chat-init.js` ファイルから、1303-1318行目の10通制限チェックコードを削除してください。

## 削除対象のコード
以下のコードブロックを完全に削除してください（1303-1318行目）：

```javascript
                // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                // 【共通ロジック】10通到達時の登録ボタン表示チェック
                // システム的に10通目に到達したとき、登録ボタンを表示
                // キャラクター固有の処理は各ハンドラーの handleGuestLimit に委譲
                // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                if (window.GuestLimitManager && typeof window.GuestLimitManager.checkAndHandleGuestLimit === 'function') {
                    const limitHandled = window.GuestLimitManager.checkAndHandleGuestLimit(character, response);
                    if (limitHandled) {
                        console.log('[ゲスト制限管理] 10通到達時の処理が完了しました:', character);
                        // 処理が完了した場合は、以降の処理をスキップ
                    }
                } else {
                    console.warn('[ゲスト制限管理] GuestLimitManager が見つかりません');
                }
                    });
                }
```

**注意**: 1317-1318行目の `});` と `}` も削除対象に含まれますが、これらが他の構造の一部でないことを確認してください。削除後、構文エラーがないか必ず確認してください。

## 削除後の状態
削除後、1302行目の `return;` の直後は、1319行目の `} else {` が続くようにしてください。

**削除前の構造**:
```javascript
                if (handlerProcessed) {
                    console.log('[キャラクターハンドラー] レスポンス処理が完了しました:', character);
                    // 送信ボタンを再有効化はハンドラー側で行う
                    return;
                }
                // 【削除対象のコードブロック（1303-1318行目）】
            } else {
                // 登録ユーザーの場合...
```

**削除後の構造**:
```javascript
                if (handlerProcessed) {
                    console.log('[キャラクターハンドラー] レスポンス処理が完了しました:', character);
                    // 送信ボタンを再有効化はハンドラー側で行う
                    return;
                }
            } else {
                // 登録ユーザーの場合...
```

## 背景
- 10通制限チェックは既に各キャラクターハンドラーの `handleResponse()` メソッド内で実行されるようになっています
- `chat-init.js` からこのチェックを完全に取り除くことで、メインファイルをキャラクター非依存にします
- これにより、新しいキャラクターを追加しても `chat-init.js` の修正が不要になります

## 確認方法
削除後、以下のコマンドで確認してください：
```bash
grep -n "GuestLimitManager\|10通到達" public/js/chat-init.js
```
このコマンドで何も出力されなければ、削除は成功です。

## 注意事項
- ファイルは約2931行の大きなファイルです
- 1303-1318行目を正確に削除してください
- 1317-1318行目の `});` と `}` も含めて削除してください
- 削除後、構文エラーがないか確認してください
