(() => {
  const GUEST_COUNT_KEY = 'auth.guestMessageCount';
  const GUEST_HISTORY_KEY = 'auth.guestConversationHistory';
  const HISTORY_TRANSFER_KEY = 'auth.pendingHistoryTransfer';
  const HISTORY_LIMIT = 16;

  function safeParse(value, fallback) {
    try {
      return value ? JSON.parse(value) : fallback;
    } catch {
      return fallback;
    }
  }

  function readGuestHistoryStore() {
    return safeParse(sessionStorage.getItem(GUEST_HISTORY_KEY), {});
  }

  function writeGuestHistoryStore(store) {
    sessionStorage.setItem(GUEST_HISTORY_KEY, JSON.stringify(store));
  }

  function ensureCountInitialized() {
    if (!sessionStorage.getItem(GUEST_COUNT_KEY)) {
      sessionStorage.setItem(GUEST_COUNT_KEY, '0');
    }
  }

  function isRegistered() {
    return !!(localStorage.getItem('userNickname') && 
              localStorage.getItem('birthYear') && 
              localStorage.getItem('birthMonth') && 
              localStorage.getItem('birthDay'));
  }

  function getUserToken() {
    // 【新仕様】userTokenは不要。常にnullを返す
    return null;
  }

  function setAuth(token, nickname, deity) {
    // tokenは無視（使用しない）
    if (nickname) {
      localStorage.setItem('userNickname', nickname);
    }
    if (deity) {
      localStorage.setItem('assignedDeity', deity);
    }
    // Mark that this browser/user has completed registration
    localStorage.setItem('hasAccount', 'true');
  }

  function clearAuth() {
    // ユーザー情報をクリア
    localStorage.removeItem('userNickname');
    localStorage.removeItem('assignedDeity');
    localStorage.removeItem('hasAccount');
  }

  function getGuestMessageCount() {
    ensureCountInitialized();
    const raw = sessionStorage.getItem(GUEST_COUNT_KEY);
    const value = Number(raw);
    return Number.isFinite(value) ? value : 0;
  }

  function setGuestMessageCount(count) {
    sessionStorage.setItem(GUEST_COUNT_KEY, String(Math.max(0, count)));
  }

  function incrementGuestMessageCount() {
    const next = getGuestMessageCount() + 1;
    setGuestMessageCount(next);
    return next;
  }

  function resetGuestProgress(options = { keepHistory: false }) {
    setGuestMessageCount(0);
    if (!options.keepHistory) {
      sessionStorage.removeItem(GUEST_HISTORY_KEY);
    }
  }

  function getGuestHistory(characterId) {
    const store = readGuestHistoryStore();
    const history = store[characterId] || [];
    return history.map((entry) => ({ ...entry }));
  }

  function recordGuestMessage(role, content, characterId) {
    if (!role || !content || !characterId) {
      return;
    }
    const store = readGuestHistoryStore();
    const history = store[characterId] || [];
    history.push({ role, content });
    if (history.length > HISTORY_LIMIT) {
      history.splice(0, history.length - HISTORY_LIMIT);
    }
    store[characterId] = history;
    writeGuestHistoryStore(store);
  }

  function clearGuestHistory(characterId) {
    const store = readGuestHistoryStore();
    if (store[characterId]) {
      delete store[characterId];
      writeGuestHistoryStore(store);
    }
  }

  function markHistoryTransfer(characterId) {
    sessionStorage.setItem(HISTORY_TRANSFER_KEY, JSON.stringify({ characterId }));
  }

  function getPendingHistoryTransfer() {
    return safeParse(sessionStorage.getItem(HISTORY_TRANSFER_KEY), null);
  }

  function hasPendingHistoryTransfer(characterId) {
    const info = getPendingHistoryTransfer();
    return Boolean(info && info.characterId === characterId);
  }

  function completeHistoryTransfer(characterId) {
    const info = getPendingHistoryTransfer();
    if (info && info.characterId === characterId) {
      sessionStorage.removeItem(HISTORY_TRANSFER_KEY);
      clearGuestHistory(characterId);
    }
  }

  function init() {
    ensureCountInitialized();
  }

  window.AuthState = {
    init,
    isRegistered,
    getUserToken,
    setAuth,
    clearAuth,
    getGuestMessageCount,
    incrementGuestMessageCount,
    resetGuestProgress,
    recordGuestMessage,
    getGuestHistory,
    clearGuestHistory,
    markHistoryTransfer,
    hasPendingHistoryTransfer,
    completeHistoryTransfer,
  };
})();

