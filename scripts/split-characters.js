const fs = require('fs');
const path = require('path');

// characters.jsonを読み込み
const charactersPath = path.join(__dirname, '../public/data/characters.json');
const characters = JSON.parse(fs.readFileSync(charactersPath, 'utf8'));

// 出力ディレクトリを作成
const outputDir = path.join(__dirname, '../public/data/characters');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// 各キャラクターを個別ファイルに分割
Object.keys(characters).forEach(charId => {
  const charData = {
    id: charId,
    ...characters[charId]
  };
  
  const outputPath = path.join(outputDir, `${charId}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(charData, null, 2));
  console.log(`Created: ${outputPath}`);
});

console.log('キャラクターデータの分割が完了しました');
