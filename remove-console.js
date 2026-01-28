const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'public/js/chat-engine.js');
let content = fs.readFileSync(filePath, 'utf8');

// 元の行数
const originalLines = content.split('\n').length;
console.log(`元の行数: ${originalLines}`);

// console.log/warn呼び出しをすべて削除
// パターン: 行が console.log( または console.warn( で始まり、);で終わる単一行のみを削除
const lines = content.split('\n');
let removedCount = 0;

const filteredLines = lines.filter((line, index) => {
    const trimmed = line.trim();
    
    // debugLog関数内のconsole.logは保持（function debugLog内は51-56行目付近）
    // 行54の console.log(...args); は保持
    if (index >= 50 && index <= 60 && trimmed.includes('console.log(')) {
        return true;
    }
    
    // 単一行のconsole.log/warn呼び出しを削除（前後の括弧が同じ行内）
    // 例: console.warn('[error] message');
    if ((trimmed.startsWith('console.log(') || trimmed.startsWith('console.warn(')) && 
        trimmed.endsWith(';')) {
        // 複数行呼び出しの開始行を判定（閉じ括弧がない、または不完全）
        const openParens = (trimmed.match(/\(/g) || []).length;
        const closeParens = (trimmed.match(/\)/g) || []).length;
        
        if (openParens === closeParens) {
            // 単一行で完結している
            removedCount++;
            return false;
        }
    }
    
    return true;
});

const newContent = filteredLines.join('\n');
const newLines = newContent.split('\n').length;

console.log(`削除後の行数: ${newLines}`);
console.log(`削除したconsole呼び出し: ${removedCount}個`);

// ファイルに書き込み
fs.writeFileSync(filePath, newContent, 'utf8');
console.log('console.log/warn呼び出しをすべて削除しました');
