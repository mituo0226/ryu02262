/**
 * api-health-checker.js
 * LLM APIの健全性を追跡するクラス
 * Cloudflare Workersのグローバルスコープで永続化
 */

/**
 * LLM APIの健全性を追跡するクラス
 */
class APIHealthChecker {
  constructor() {
    this.deepseekFailures = 0;
    this.deepseekLastFailure = 0;
    this.openaiFailures = 0;
    this.openaiLastFailure = 0;
    this.FAILURE_THRESHOLD = 3; // 連続3回失敗でスイッチ
    this.COOLDOWN_PERIOD = 300000; // 5分間（ミリ秒）
  }
  
  /**
   * DeepSeek APIを使用すべきか判定
   */
  shouldUseDeepSeek() {
    const now = Date.now();
    
    // 連続失敗回数が閾値を超えている場合
    if (this.deepseekFailures >= this.FAILURE_THRESHOLD) {
      // クールダウン期間中はOpenAIを使用
      if (now - this.deepseekLastFailure < this.COOLDOWN_PERIOD) {
        console.log('[APIHealthChecker] DeepSeek is in cooldown, using OpenAI');
        return false;
      }
      // クールダウン期間が過ぎたらリセット
      console.log('[APIHealthChecker] DeepSeek cooldown expired, resetting');
      this.deepseekFailures = 0;
    }
    
    return true;
  }
  
  /**
   * DeepSeek API失敗を記録
   */
  recordDeepSeekFailure() {
    this.deepseekFailures++;
    this.deepseekLastFailure = Date.now();
    console.log(`[APIHealthChecker] DeepSeek failure recorded (${this.deepseekFailures}/${this.FAILURE_THRESHOLD})`);
  }
  
  /**
   * DeepSeek API成功を記録
   */
  recordDeepSeekSuccess() {
    if (this.deepseekFailures > 0) {
      console.log('[APIHealthChecker] DeepSeek recovered, resetting failure count');
    }
    this.deepseekFailures = 0;
  }
  
  /**
   * OpenAI API失敗を記録
   */
  recordOpenAIFailure() {
    this.openaiFailures++;
    this.openaiLastFailure = Date.now();
    console.log(`[APIHealthChecker] OpenAI failure recorded (${this.openaiFailures})`);
  }
  
  /**
   * OpenAI API成功を記録
   */
  recordOpenAISuccess() {
    this.openaiFailures = 0;
  }
  
  /**
   * ステータスを取得（デバッグ用）
   */
  getStatus() {
    return {
      deepseek: {
        failures: this.deepseekFailures,
        lastFailure: this.deepseekLastFailure,
        isHealthy: this.shouldUseDeepSeek()
      },
      openai: {
        failures: this.openaiFailures,
        lastFailure: this.openaiLastFailure
      }
    };
  }
}

// グローバルインスタンス（Cloudflare Workersで共有）
let globalHealthChecker = null;

/**
 * ヘルスチェッカーのインスタンスを取得
 */
export function getHealthChecker() {
  if (!globalHealthChecker) {
    globalHealthChecker = new APIHealthChecker();
  }
  return globalHealthChecker;
}
