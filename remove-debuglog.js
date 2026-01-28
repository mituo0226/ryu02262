const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'public/js/chat-engine.js');
let content = fs.readFileSync(filePath, 'utf8');

// 元の行数
const originalLines = content.split('\n').length;
console.log(`元の行数: ${originalLines}`);

// ステップ1: debugLog()定義前の行数を数える
const definesMatch = content.match(/^function debugLog\(/m);
if (!definesMatch) {
    console.error('debugLog関数定義が見つかりません');
    process.exit(1);
}

// ステップ2: 複数行のdebugLog()呼び出しをすべて削除
// 正規表現: debugLog(から);までの複数行パターンを削除
// ただし、function debugLog()の定義は保持
let newContent = content;

// 複数行のdebugLog呼び出しを処理
// パターン: debugLog( ... ); が複数行にまたがる場合も含む
const regex = /^\s*debugLog\([^;]*;/gm;
let count = 0;

newContent = newContent.replace(regex, (match) => {
    count++;
    return '';
});

// ただし、function debugLog の定義行は削除されていないことを確認
if (newContent.includes('function debugLog(')) {
    console.log(`debugLog関数定義は保持されています`);
} else {
    console.error('ERROR: debugLog関数定義が削除されてしまいました');
    process.exit(1);
}

// 削除後の行数
const newLines = newContent.split('\n').length;

console.log(`削除後の行数: ${newLines}`);
console.log(`削除したdebugLog呼び出し: ${count}個`);

// ファイルに書き込み
fs.writeFileSync(filePath, newContent, 'utf8');
console.log('debugLog()呼び出しを削除しました');
