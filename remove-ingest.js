const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'public/js/chat-engine.js');
let content = fs.readFileSync(filePath, 'utf8');

// 元の行数
const originalLines = content.split('\n').length;
console.log(`元の行数: ${originalLines}`);

// fetch ingest呼び出しをすべて削除
// パターン: fetch('http://127.0.0.1:7242/ingest...から.catch(()=>{});までを削除
const lines = content.split('\n');
const filteredLines = lines.filter(line => {
    const trimmed = line.trim();
    // コメントアウトされている行も削除（//が含まれていてfetch ingestを含む場合）
    if (trimmed.includes('fetch(\'http://127.0.0.1:7242/ingest') || 
        trimmed.includes('fetch("http://127.0.0.1:7242/ingest')) {
        return false;
    }
    return true;
});

const newContent = filteredLines.join('\n');
const newLines = newContent.split('\n').length;

console.log(`削除後の行数: ${newLines}`);
console.log(`削除した行数: ${originalLines - newLines}`);

// ファイルに書き込み
fs.writeFileSync(filePath, newContent, 'utf8');
console.log('fetch ingest呼び出しをすべて削除しました');
