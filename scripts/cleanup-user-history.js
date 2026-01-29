#!/usr/bin/env node

/**
 * cleanup-user-history.js
 * 特定ユーザーの特定キャラクターとの会話履歴をクリアするスクリプト
 * 
 * 使用方法:
 * node scripts/cleanup-user-history.js <userId> [characterId]
 * 
 * 例:
 * node scripts/cleanup-user-history.js 132 kaon
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ローカルデータベースのパス（開発環境用）
const dbPath = path.join(__dirname, '../.wrangler/state/d1/db.sqlite');

const userId = parseInt(process.argv[2]);
const characterId = process.argv[3] || 'kaon';

if (!userId || isNaN(userId)) {
  console.error('❌ エラー: ユーザーIDが指定されていません。');
  console.error('使用方法: node scripts/cleanup-user-history.js <userId> [characterId]');
  process.exit(1);
}

console.log(`ユーザーID ${userId} の ${characterId} との会話履歴をクリアしています...`);

try {
  // ローカルデータベースに接続
  const db = new Database(dbPath);
  
  // クリア前の件数を確認
  const beforeCount = db.prepare(`
    SELECT COUNT(*) as count 
    FROM conversations 
    WHERE user_id = ? AND character_id = ?
  `).get(userId, characterId);
  
  console.log(`📊 クリア前: ${beforeCount.count} 件のメッセージ`);
  
  if (beforeCount.count === 0) {
    console.log('⚠️  クリアするメッセージがありません。');
    db.close();
    process.exit(0);
  }
  
  // 会話履歴を削除
  const result = db.prepare(`
    DELETE FROM conversations 
    WHERE user_id = ? AND character_id = ?
  `).run(userId, characterId);
  
  console.log(`✅ ${result.changes} 件のメッセージを削除しました。`);
  
  // クリア後の件数を確認
  const afterCount = db.prepare(`
    SELECT COUNT(*) as count 
    FROM conversations 
    WHERE user_id = ? AND character_id = ?
  `).get(userId, characterId);
  
  console.log(`📊 クリア後: ${afterCount.count} 件のメッセージ`);
  
  db.close();
  console.log('✨ 完了しました。');
  
} catch (error) {
  console.error('❌ データベースエラー:', error.message);
  console.error('💡 ヒント: .wrangler/state/d1/db.sqlite が存在することを確認してください。');
  process.exit(1);
}
