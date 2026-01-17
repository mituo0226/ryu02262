# .wrangler クリーンアップの条件

## 📋 クリーンアップ条件の概要

`.wrangler` ディレクトリのクリーンアップは、**ディレクトリのサイズ**を基準に実行されます。

## 🔍 各スクリプトの条件

### 1. `auto-cleanup-wrangler-silent.ps1`（完全自動クリーンアップ）【推奨】

**条件**: 
- **10MB以上**のディレクトリを自動削除
- **フォルダー数制限**（デフォルト: 20個）: 20個以上のフォルダーがある場合、古いものから削除

- ✅ **10MB以上** → 自動削除（確認なし）
- ✅ **フォルダー数が20個超過** → 古いフォルダーから自動削除（確認なし）
- ⏭️ **10MB未満 かつ フォルダー数が20個以下** → スキップ（削除しない）

**デフォルト設定**:
```powershell
.\scripts\auto-cleanup-wrangler-silent.ps1
```
デフォルトで、20個を超えるフォルダーがある場合、古いものから自動削除されます。

**最小サイズを変更する場合**:
```powershell
# 50MB以上の場合のみ削除
.\scripts\auto-cleanup-wrangler-silent.ps1 -MinSizeMB 50

# 100MB以上の場合のみ削除
.\scripts\auto-cleanup-wrangler-silent.ps1 -MinSizeMB 100
```

**フォルダー数制限を変更する場合**:
```powershell
# フォルダー数制限を変更する場合（例: 10個に変更）
.\scripts\auto-cleanup-wrangler-silent.ps1 -MaxFolders 10

# フォルダー数制限を無効にする場合（0を指定）
.\scripts\auto-cleanup-wrangler-silent.ps1 -MaxFolders 0

# サイズ制限とフォルダー数制限を同時に設定（例: 30個に変更）
.\scripts\auto-cleanup-wrangler-silent.ps1 -MinSizeMB 50 -MaxFolders 30
```
デフォルトでは20個を超えるフォルダーがある場合、古いものから自動削除されます。

### 2. `auto-cleanup-wrangler.ps1`（確認ありクリーンアップ）

**条件**: **100MB以上**のディレクトリのみ削除を提案

- ✅ **100MB以上** → 削除を提案（確認を求める）
- ⏭️ **100MB未満** → スキップ（削除しない）

**通常実行**:
```powershell
.\scripts\auto-cleanup-wrangler.ps1
```

**強制実行（確認なし）**:
```powershell
.\scripts\auto-cleanup-wrangler.ps1 -Force
```
`-Force` フラグを使用すると、サイズに関係なく全てのディレクトリを削除します。

### 3. `cleanup-wrangler.ps1`（手動クリーンアップ）

**条件**: **サイズに関係なく**全てのディレクトリを削除対象として表示

- ✅ **全てのサイズ** → 削除を提案（確認を求める）

```powershell
.\scripts\cleanup-wrangler.ps1
```

## 📊 条件の比較表

| スクリプト | 削除条件 | 確認 | 推奨用途 |
|-----------|---------|------|---------|
| `auto-cleanup-wrangler-silent.ps1` | 10MB以上 または フォルダー数が20個超過（デフォルト） | なし（自動） | 定期実行・自動実行 |
| `auto-cleanup-wrangler-silent.ps1 -MaxFolders N` | 10MB以上 または N個以上のフォルダー | なし（自動） | フォルダー数制限を変更した自動実行 |
| `auto-cleanup-wrangler.ps1` | 100MB以上 | あり | 手動実行（大きいもののみ） |
| `auto-cleanup-wrangler.ps1 -Force` | 全て | なし | 強制削除 |
| `cleanup-wrangler.ps1` | 全て | あり | 完全手動制御 |

## 🎯 推奨される使用方法

### 日常的な自動クリーンアップ
```powershell
# 10MB以上のディレクトリを自動削除（確認なし）
.\scripts\auto-cleanup-wrangler-silent.ps1
```

### 大きなディレクトリのみ手動で削除
```powershell
# 100MB以上のディレクトリのみ確認して削除
.\scripts\auto-cleanup-wrangler.ps1
```

### 全てのディレクトリを確認して削除
```powershell
# サイズに関係なく全て確認して削除
.\scripts\cleanup-wrangler.ps1
```

## 📝 クリーンアップ対象のディレクトリ

以下の2つのディレクトリがクリーンアップ対象です：

1. **プロジェクト内**: `C:\Users\mituo\Desktop\kaede\.wrangler`
2. **ホームディレクトリ**: `C:\Users\mituo\.wrangler`

## ⚙️ カスタマイズ例

### 例1: 50MB以上のディレクトリのみ自動削除
```powershell
.\scripts\auto-cleanup-wrangler-silent.ps1 -MinSizeMB 50
```

### 例2: ログファイルに保存しながら自動削除
```powershell
.\scripts\auto-cleanup-wrangler-silent.ps1 -LogFile "cleanup-log.txt"
```

### 例3: 50MB以上でログファイルに保存
```powershell
.\scripts\auto-cleanup-wrangler-silent.ps1 -MinSizeMB 50 -LogFile "cleanup-log.txt"
```

### 例4: フォルダー数を20個に制限
```powershell
.\scripts\auto-cleanup-wrangler-silent.ps1 -MaxFolders 20
```

### 例5: サイズ制限とフォルダー数制限を同時に設定
```powershell
.\scripts\auto-cleanup-wrangler-silent.ps1 -MinSizeMB 50 -MaxFolders 20 -LogFile "cleanup-log.txt"
```

## 🔄 実行フロー

### `auto-cleanup-wrangler-silent.ps1` の実行フロー

```
1. スクリプト開始
   ↓
2. 各ディレクトリをチェック
   ├─ 存在しない → スキップ
   └─ 存在する → サイズとフォルダー数を計算
       ↓
3. フォルダー数制限チェック（デフォルト: 20個）
   ├─ 20個超過 → 古いフォルダーから削除 → レポートに記録
   └─ 20個以下 → 次へ
       ↓
4. サイズ判定
   ├─ 10MB以上 → 自動削除 → レポートに記録
   └─ 10MB未満 → スキップ → レポートに記録
       ↓
5. レポート出力
   - 削除されたディレクトリ数
   - 削除されたフォルダー数
   - 解放された容量
   - 各ディレクトリの詳細
```

### `auto-cleanup-wrangler.ps1` の実行フロー

```
1. スクリプト開始
   ↓
2. 各ディレクトリをチェック
   ├─ 存在しない → スキップ
   └─ 存在する → サイズを計算
       ↓
3. サイズ判定
   ├─ 100MB以上 → 削除確認を求める
   │   ├─ Yes → 削除
   │   └─ No → スキップ
   └─ 100MB未満 → スキップ
       ↓
4. 結果サマリー出力
```

## 💡 よくある質問

### Q: なぜ10MBという基準なのか？
A: 小さいディレクトリは問題にならないため、ある程度のサイズ（10MB）以上のもののみを削除することで、不要な削除を避けます。

### Q: 10MB未満のディレクトリも削除したい場合は？
A: `-MinSizeMB 0` を指定するか、`cleanup-wrangler.ps1` を使用してください。

### Q: 自動実行時にログを確認したい場合は？
A: `-LogFile` パラメータでログファイルを指定してください。タスクスケジューラで登録する場合は、自動的にログファイルが作成されます。

### Q: 削除されたかどうかを確認するには？
A: スクリプト実行後に表示されるレポートを確認してください。ログファイルを指定した場合は、そのファイルも確認できます。

### Q: フォルダー数制限はどのように動作しますか？
A: デフォルトで、`.wrangler` ディレクトリ内のサブディレクトリが20個を超える場合、更新日時が古いフォルダーから順に削除されます。これにより、フォルダー数が常に20個以下に保たれます。`-MaxFolders N` で制限数を変更できます。

### Q: フォルダー数制限とサイズ制限はどちらが優先されますか？
A: フォルダー数制限が優先されます。フォルダー数が20個を超えている場合、まず古いフォルダーから削除されます。その後、サイズ制限のチェックが行われます。
