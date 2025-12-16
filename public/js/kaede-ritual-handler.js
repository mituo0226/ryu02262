/**
 * kaede-ritual-handler.js
 * 楓（kaede）専用の守護神の儀式関連処理
 * 他の鑑定士とは独立した動作を行う
 */

const KaedeRitualHandler = {
    /**
     * 守護神の儀式完了後のメッセージ表示処理
     * @param {string} character - キャラクターID（'kaede'）
     * @param {Object} guardianConfirmationData - 守護神確認データ
     * @param {Object} historyData - 会話履歴データ
     * @returns {boolean} 処理が完了したかどうか（true: 処理完了、false: 処理しない）
     */
    async handleGuardianRitualCompletion(character, guardianConfirmationData, historyData) {
        if (character !== 'kaede') {
            return false; // 楓以外は処理しない
        }

        console.log('[楓専用処理] 守護神の儀式完了メッセージを表示します:', guardianConfirmationData);

        // APIの指示によりチャットをクリア
        if (historyData && historyData.clearChat) {
            console.log('[楓専用処理] API指示: チャットをクリアします（儀式完了後）');

            // チャット画面をクリア（APIの指示により）
            if (ChatUI.messagesDiv) {
                ChatUI.messagesDiv.innerHTML = '';
                console.log('[楓専用処理] チャット画面をクリアしました（API指示）');
            }

            // ゲスト履歴もクリア（API指示により）
            if (window.AuthState && typeof window.AuthState.clearGuestHistory === 'function') {
                AuthState.clearGuestHistory(character);
            }
            const GUEST_HISTORY_KEY_PREFIX = 'guestConversationHistory_';
            const historyKey = GUEST_HISTORY_KEY_PREFIX + character;
            sessionStorage.removeItem(historyKey);
            sessionStorage.removeItem('pendingGuestHistoryMigration');
            ChatData.setGuestMessageCount(character, 0);
            console.log('[楓専用処理] ゲスト履歴をクリアしました（API指示）');
        }

        // 最初の質問を取得（APIから返された値、またはゲスト履歴から）
        let firstQuestion = '';
        if (historyData && historyData.firstQuestion) {
            firstQuestion = historyData.firstQuestion.trim();
            console.log('[楓専用処理] APIから最初の質問を取得:', firstQuestion.substring(0, 50) + '...');
        } else {
            // APIから取得できない場合は、ゲスト履歴から取得
            console.log('[楓専用処理] APIから最初の質問が取得できませんでした。ゲスト履歴を確認します。');
            const guestHistory = ChatInit.getGuestHistoryForMigration(character);
            if (guestHistory && guestHistory.length > 0) {
                const firstUserMessage = guestHistory.find(msg => msg && msg.role === 'user');
                if (firstUserMessage && firstUserMessage.content) {
                    firstQuestion = firstUserMessage.content.trim();
                    console.log('[楓専用処理] ゲスト履歴から最初のユーザーメッセージを発見:', firstQuestion.substring(0, 50) + '...');
                }
            }
        }

        // 定型文を構築
        const characterName = ChatData.characterInfo[character]?.name || '楓';
        const welcomeMessage = `儀式により${guardianConfirmationData.userNickname}様の守護神の${guardianConfirmationData.guardianName}を呼び出すことができました。

今後は私と${guardianConfirmationData.guardianName}であなたの運命を導いてまいります。

鑑定を続けてまいりましょう。${firstQuestion ? `\n\n「${firstQuestion}」` : ''}

${firstQuestion ? `この質問を再度深く、${guardianConfirmationData.guardianName}と共に掘り下げましょうか、それとも他のテーマで鑑定を進めますか？` : 'どのようなことについて鑑定を進めますか？'}`;

        // APIの指示によりチャットをクリアした後、定型文のみを表示（会話はゼロからスタート）
        console.log('[楓専用処理] 守護神の儀式完了メッセージを表示します（会話はゼロからスタート）');
        ChatUI.addMessage('character', welcomeMessage, characterName);

        // 会話履歴に追加
        if (ChatData.conversationHistory && ChatData.conversationHistory.recentMessages) {
            ChatData.conversationHistory.recentMessages.push({
                role: 'assistant',
                content: welcomeMessage
            });
        }

        // メッセージ入力欄をクリア
        if (ChatUI.messageInput) {
            ChatUI.messageInput.value = '';
            console.log('[楓専用処理] メッセージ入力欄をクリアしました');
        }

        // 送信ボタンの状態を更新
        ChatUI.updateSendButtonVisibility();
        console.log('[楓専用処理] 送信ボタンの状態を更新しました（文字入力時に表示されます）');

        // 守護神の儀式完了フラグをクリア
        sessionStorage.removeItem('acceptedGuardianRitual');
        sessionStorage.removeItem('ritualCompleted');
        console.log('[楓専用処理] ritualCompletedフラグとacceptedGuardianRitualフラグをクリアしました');

        return true; // 処理完了
    },

    /**
     * 登録完了時の守護神の儀式チェック（楓専用）
     * @param {string} character - キャラクターID
     * @param {URLSearchParams} urlParams - URLパラメータ
     * @returns {Object|null} guardianConfirmationData（処理が必要な場合）、null（処理不要な場合）
     */
    checkGuardianRitualCompletion(character, urlParams) {
        if (character !== 'kaede') {
            return null; // 楓以外は処理しない
        }

        const ritualCompleted = sessionStorage.getItem('ritualCompleted');
        const assignedDeity = localStorage.getItem('assignedDeity');
        console.log('[楓専用処理] ritualCompletedフラグをチェック:', ritualCompleted, 'assignedDeity:', assignedDeity);

        // 【重要】ritualCompletedフラグまたはassignedDeityが存在する場合、守護神の儀式は既に完了している
        if ((ritualCompleted === 'true' || assignedDeity) && sessionStorage.getItem('guardianMessageShown') !== 'true') {
            console.log('[楓専用処理] 守護神の儀式は既に完了しています。会話履歴読み込み後にAPIに報告します。');
            const userNickname = localStorage.getItem('userNickname') || 'あなた';
            const guardianName = assignedDeity;

            // 守護神の儀式完了メッセージを表示する前に、guardianMessageShownフラグを設定
            sessionStorage.setItem('guardianMessageShown', 'true');
            console.log('[楓専用処理] 守護神の儀式完了メッセージ表示前にguardianMessageShownフラグを設定しました');

            // URLパラメータからjustRegisteredを削除
            urlParams.delete('justRegistered');
            const newUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '');
            window.history.replaceState({}, '', newUrl);
            // sessionStorageからも登録完了フラグを削除
            sessionStorage.removeItem('justRegistered');

            return {
                userNickname,
                guardianName,
                confirmationMessage: `守護神の儀式が完了しました。私の守護神は${guardianName}です。`
            };
        }

        return null; // 処理不要
    },

    /**
     * 登録完了後の守護神の儀式開始処理（楓専用）
     * @param {string} character - キャラクターID
     * @param {Object} historyData - 会話履歴データ
     * @param {URLSearchParams} urlParams - URLパラメータ
     * @returns {boolean} 処理が完了したかどうか（true: 処理完了、false: 処理しない）
     */
    async handlePostRegistrationRitualStart(character, historyData, urlParams) {
        if (character !== 'kaede') {
            return false; // 楓以外は処理しない
        }

        // 儀式が既に完了している場合はスキップ（guardian-ritual.htmlからリダイレクトされた場合）
        const ritualCompleted = sessionStorage.getItem('ritualCompleted');

        // 既に守護神確認メッセージを表示済みの場合は、儀式開始処理をスキップ
        if (ritualCompleted === 'true' && sessionStorage.getItem('guardianMessageShown') === 'true') {
            // ユーザーデータを更新（儀式完了済みの場合も必要）
            if (historyData && historyData.birthYear && historyData.birthMonth && historyData.birthDay) {
                ChatUI.updateUserStatus(true, {
                    nickname: historyData.nickname || ChatData.userNickname,
                    birthYear: historyData.birthYear,
                    birthMonth: historyData.birthMonth,
                    birthDay: historyData.birthDay,
                    assignedDeity: historyData.assignedDeity
                });
            } else {
                // 会話履歴がない場合はlocalStorageから取得
                const nickname = localStorage.getItem('userNickname') || '鑑定者';
                const deity = localStorage.getItem('assignedDeity') || '未割当';
                const birthYear = localStorage.getItem('birthYear');
                const birthMonth = localStorage.getItem('birthMonth');
                const birthDay = localStorage.getItem('birthDay');

                ChatUI.updateUserStatus(true, {
                    nickname: nickname,
                    birthYear: birthYear ? parseInt(birthYear) : null,
                    birthMonth: birthMonth ? parseInt(birthMonth) : null,
                    birthDay: birthDay ? parseInt(birthDay) : null,
                    assignedDeity: deity
                });
            }
            // 儀式開始処理はスキップ（会話履歴の読み込み後の処理は続行）
            return false; // 処理は続行
        }

        // ユーザーデータを更新
        if (historyData && historyData.birthYear && historyData.birthMonth && historyData.birthDay) {
            ChatUI.updateUserStatus(true, {
                nickname: historyData.nickname || ChatData.userNickname,
                birthYear: historyData.birthYear,
                birthMonth: historyData.birthMonth,
                birthDay: historyData.birthDay,
                assignedDeity: historyData.assignedDeity
            });
        } else {
            // 会話履歴がない場合はlocalStorageから取得
            const nickname = localStorage.getItem('userNickname') || '鑑定者';
            const deity = localStorage.getItem('assignedDeity') || '未割当';
            const birthYear = localStorage.getItem('birthYear');
            const birthMonth = localStorage.getItem('birthMonth');
            const birthDay = localStorage.getItem('birthDay');

            ChatUI.updateUserStatus(true, {
                nickname: nickname,
                birthYear: birthYear ? parseInt(birthYear) : null,
                birthMonth: birthMonth ? parseInt(birthMonth) : null,
                birthDay: birthDay ? parseInt(birthDay) : null,
                assignedDeity: deity
            });
        }

        // 儀式完了フラグのチェックは既に会話履歴読み込み前に行われている
        // ここでは、会話履歴読み込み後に再度チェック（二重チェック）
        const ritualCompletedCheck = sessionStorage.getItem('ritualCompleted');
        const shouldSkipRitual = ritualCompletedCheck === 'true' && sessionStorage.getItem('guardianMessageShown') === 'true';

        if (!shouldSkipRitual) {
            // 【重要】守護神の鑑定を受け入れた場合のみ、儀式を自動開始
            const acceptedGuardianRitual = sessionStorage.getItem('acceptedGuardianRitual');
            console.log('[楓専用処理] カエデの場合、守護神の儀式を開始するかチェック:', {
                acceptedGuardianRitual: acceptedGuardianRitual
            });

            if (acceptedGuardianRitual !== 'true') {
                console.log('[楓専用処理] 守護神の鑑定を受け入れていないため、儀式を自動開始しません');

                // URLパラメータからjustRegisteredを削除
                urlParams.delete('justRegistered');
                const newUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '');
                window.history.replaceState({}, '', newUrl);

                // sessionStorageからも登録完了フラグを削除
                sessionStorage.removeItem('justRegistered');

                // 登録ユーザーとして通常の会話を続ける
                return true; // 処理完了（儀式を開始しない）
            }

            console.log('[楓専用処理] 守護神の鑑定を受け入れているため、儀式を準備します');

            // 【重要】ゲスト会話履歴を取得して保存（守護神の儀式で使用するため）
            console.log('[楓専用処理] ゲスト履歴取得を開始:', character);

            let guestHistory = ChatInit.getGuestHistoryForMigration(character);

            if (guestHistory.length === 0) {
                // フォールバック: ChatDataから直接取得
                console.log('[楓専用処理] ChatDataから直接取得を試行');
                guestHistory = ChatData.getGuestHistory(character) || [];
            }

            // ゲスト会話履歴を一時的に保存（守護神の儀式で使用するため）
            const guestHistoryForRitual = JSON.parse(JSON.stringify(guestHistory));

            // 会話履歴をクリア（新規登録なので空から始める）
            ChatData.conversationHistory = null;

            // ゲスト会話履歴を一時的に保存（守護神の儀式で使用するため）
            const GUEST_HISTORY_KEY_PREFIX = 'guestConversationHistory_';
            const historyKey = GUEST_HISTORY_KEY_PREFIX + character;
            if (guestHistoryForRitual.length > 0) {
                sessionStorage.setItem('pendingRitualGuestHistory', JSON.stringify({
                    character: character,
                    history: guestHistoryForRitual
                }));
                console.log('[楓専用処理] ゲスト履歴をpendingRitualGuestHistoryに保存:', {
                    historyLength: guestHistoryForRitual.length,
                    userMessages: guestHistoryForRitual.filter(msg => msg && msg.role === 'user').length
                });
            }

            // URLパラメータからjustRegisteredを削除
            urlParams.delete('justRegistered');
            const newUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '');
            window.history.replaceState({}, '', newUrl);

            // sessionStorageからも登録完了フラグを削除
            sessionStorage.removeItem('justRegistered');

            return true; // 処理完了（儀式準備完了）
        } else {
            // 儀式完了済みの場合、URLパラメータからjustRegisteredを削除
            urlParams.delete('justRegistered');
            const newUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '');
            window.history.replaceState({}, '', newUrl);

            // sessionStorageからも登録完了フラグを削除
            sessionStorage.removeItem('justRegistered');

            // 会話履歴の読み込み後の処理は続行（初期メッセージの表示など）
            return false; // 処理は続行
        }
    }
};

// グローバルスコープに公開
window.KaedeRitualHandler = KaedeRitualHandler;
