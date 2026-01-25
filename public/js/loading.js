/**
 * loading.js
 * 待機画面のロジック
 */

(async function() {
    // URLパラメータを取得
    const params = new URLSearchParams(window.location.search);
    const character = params.get('character');
    const userId = params.get('userId');
    const message = params.get('message');
    
    // パラメータが不足している場合はエラー
    if (!character || !userId || !message) {
        console.error('[Loading] 必要なパラメータが不足しています');
        alert('エラーが発生しました。チャット画面に戻ります。');
        window.location.href = '/pages/main.html';
        return;
    }
    
    // テキスト変更アニメーション
    const textElement = document.getElementById('loading-text');
    const messages = [
        '返信が来るまでお待ちください',
        `${getCharacterName(character)}がこれからメッセージ入力します`,
        'メッセージ入力を始めています',
        '書き込んでいます',
        'もう少しお待ちください',
        '返信がもうすぐ届きますのでお待ちください'
    ];
    
    let messageIndex = 0;
    
    // 3秒ごとにテキストを変更
    const textChangeInterval = setInterval(() => {
        messageIndex = (messageIndex + 1) % messages.length;
        
        // フェードアウト
        textElement.style.opacity = '0';
        
        setTimeout(() => {
            textElement.textContent = messages[messageIndex];
            // フェードイン
            textElement.style.opacity = '1';
        }, 400);
    }, 3000);
    
    try {
        // API呼び出し
        const response = await fetch('/api/consult', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: decodeURIComponent(message),
                character: character,
                userId: userId
            })
        });
        
        if (!response.ok) {
            throw new Error('API呼び出しに失敗しました');
        }
        
        const data = await response.json();
        
        // レスポンスをsessionStorageに保存
        sessionStorage.setItem('apiResponse', JSON.stringify(data));
        sessionStorage.setItem('userMessage', decodeURIComponent(message));
        
        // テキスト変更を停止
        clearInterval(textChangeInterval);
        
        // チャット画面に戻る
        window.location.href = `/pages/chat/chat.html?character=${character}&userId=${userId}`;
        
    } catch (error) {
        console.error('[Loading] API呼び出しエラー:', error);
        
        // テキスト変更を停止
        clearInterval(textChangeInterval);
        
        // エラーメッセージを表示
        textElement.textContent = 'エラーが発生しました。もう一度お試しください。';
        textElement.style.color = '#ff6b6b';
        
        // 3秒後にチャット画面に戻る
        setTimeout(() => {
            window.location.href = `/pages/chat/chat.html?character=${character}&userId=${userId}`;
        }, 3000);
    }
})();

/**
 * キャラクター名を取得
 */
function getCharacterName(characterId) {
    const characterNames = {
        'kaede': '楓',
        'sora': 'ソラ',
        'yukino': '雪乃',
        'kaon': '花音'
    };
    return characterNames[characterId] || 'キャラクター';
}
