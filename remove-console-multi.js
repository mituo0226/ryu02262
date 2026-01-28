const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'public/js/chat-engine.js');
let content = fs.readFileSync(filePath, 'utf8');

// 元の行数
const originalLines = content.split('\n').length;
console.log(`元の行数: ${originalLines}`);

// 複数行のconsole.log/warn呼び出しを削除
// パターン: console.warn( で始まり、}); で終わる複数行
const lines = content.split('\n');
const filteredLines = [];
let i = 0;
let removedCount = 0;

while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // debugLog関数内のconsole.logは保持
    if (i >= 50 && i <= 60 && trimmed.includes('console.log(')) {
        filteredLines.push(line);
        i++;
        continue;
    }
    
    // 複数行のconsole.log/warn呼び出しを検出
    if ((trimmed.startsWith('console.log(') || trimmed.startsWith('console.warn(')) && 
        !trimmed.endsWith(';')) {
        // 複数行呼び出しの開始
        const startLine = i;
        let foundEnd = false;
        
        // 終了行を探す
        for (let j = i; j < lines.length && j < i + 20; j++) {
            if (lines[j].includes('});')) {
                // この複数行呼び出しをスキップ
                i = j + 1;
                removedCount++;
                foundEnd = true;
                break;
            }
        }
        
        if (!foundEnd) {
            // 終了が見つからない場合は通常通り処理
            filteredLines.push(line);
            i++;
        }
    } else {
        filteredLines.push(line);
        i++;
    }
}

const newContent = filteredLines.join('\n');
const newLines = newContent.split('\n').length;

console.log(`削除後の行数: ${newLines}`);
console.log(`削除した複数行console呼び出し: ${removedCount}個`);

// ファイルに書き込み
fs.writeFileSync(filePath, newContent, 'utf8');
console.log('複数行のconsole呼び出しをすべて削除しました');
