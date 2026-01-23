/**
 * 管理画面用：性格設定テスト実行API
 * 各鑑定士の性格設定が正しく反映されているかをテストします
 */

import { PagesFunction } from '@cloudflare/workers/types';
import { isAdminAuthorized } from '../../_lib/admin-auth.js';
import { generateSystemPrompt } from '../../_lib/character-system.js';
import { generateKaedePrompt } from '../../_lib/characters/kaede.js';
import { generateYukinoPrompt } from '../../_lib/characters/yukino.js';
import { generateSoraPrompt } from '../../_lib/characters/sora.js';
import { generateKaonPrompt } from '../../_lib/characters/kaon.js';

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  details?: string;
}

interface TestSuite {
  characterId: string;
  characterName: string;
  tests: TestResult[];
  generatedPrompt?: string; // 生成されたプロンプト全体
}

export const onRequestPost: PagesFunction = async (context) => {
  const { request, env } = context;

  // 管理者認証チェック
  if (!isAdminAuthorized(request, env)) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const testSuites: TestSuite[] = [];

    // ===== 楓（kaede）のテスト =====
    const kaedeTests: TestResult[] = [];
    const kaedePrompt = generateKaedePrompt({
      userNickname: 'テストユーザー',
      hasPreviousConversation: false,
    });

    kaedeTests.push({
      name: '基本設定が含まれている',
      passed: kaedePrompt.includes('楓') && kaedePrompt.includes('50代前半の男性'),
      message: kaedePrompt.includes('楓') && kaedePrompt.includes('50代前半の男性')
        ? '✅ 楓の基本設定が正しく含まれています'
        : '❌ 楓の基本設定が含まれていません',
    });

    kaedeTests.push({
      name: '話し方の設定が反映されている',
      passed: kaedePrompt.includes('穏やかでゆっくり') && kaedePrompt.includes('（柔らかく微笑みながら）'),
      message: kaedePrompt.includes('穏やかでゆっくり') && kaedePrompt.includes('（柔らかく微笑みながら）')
        ? '✅ 話し方の設定が正しく反映されています'
        : '❌ 話し方の設定が反映されていません',
    });

    kaedeTests.push({
      name: '守護神の設定が含まれている',
      passed: kaedePrompt.includes('守護神') && kaedePrompt.includes('龍神'),
      message: kaedePrompt.includes('守護神') && kaedePrompt.includes('龍神')
        ? '✅ 守護神の設定が正しく含まれています'
        : '❌ 守護神の設定が含まれていません',
    });

    testSuites.push({
      characterId: 'kaede',
      characterName: '楓',
      tests: kaedeTests,
      generatedPrompt: kaedePrompt,
    });

    // ===== 笹岡雪乃（yukino）のテスト =====
    const yukinoTests: TestResult[] = [];
    const yukinoPrompt = generateYukinoPrompt({
      userNickname: 'テストユーザー',
      hasPreviousConversation: false,
    });

    // 基本設定
    yukinoTests.push({
      name: '基本設定が含まれている',
      passed: yukinoPrompt.includes('笹岡雪乃') && yukinoPrompt.includes('30代半ばの女性'),
      message: yukinoPrompt.includes('笹岡雪乃') && yukinoPrompt.includes('30代半ばの女性')
        ? '✅ 雪乃の基本設定が正しく含まれています'
        : '❌ 雪乃の基本設定が含まれていません',
    });

    // タロット占い
    yukinoTests.push({
      name: 'タロット占いの設定が含まれている',
      passed: yukinoPrompt.includes('タロット'),
      message: yukinoPrompt.includes('タロット')
        ? '✅ タロット占いの設定が正しく含まれています'
        : '❌ タロット占いの設定が含まれていません',
    });

    // 心理学
    yukinoTests.push({
      name: '心理学の設定が含まれている',
      passed: yukinoPrompt.includes('心理学'),
      message: yukinoPrompt.includes('心理学')
        ? '✅ 心理学の設定が正しく含まれています'
        : '❌ 心理学の設定が含まれていません',
    });

    // 🎀 可愛らしさ関連
    yukinoTests.push({
      name: '可愛らしさの性格設定が含まれている',
      passed: yukinoPrompt.includes('可愛らしい') || yukinoPrompt.includes('わあ') || yukinoPrompt.includes('素敵ですね'),
      message: (yukinoPrompt.includes('可愛らしい') || yukinoPrompt.includes('わあ') || yukinoPrompt.includes('素敵ですね'))
        ? '✅ 可愛らしさの性格設定が正しく含まれています'
        : '❌ 可愛らしさの性格設定が含まれていません',
    });

    // ト書き（表情表現）
    yukinoTests.push({
      name: 'ト書き（表情・感情表現）が含まれている',
      passed: yukinoPrompt.includes('（') && yukinoPrompt.includes('）') && 
              (yukinoPrompt.includes('微笑み') || yukinoPrompt.includes('笑顔') || yukinoPrompt.includes('嬉しそう')),
      message: (yukinoPrompt.includes('（') && yukinoPrompt.includes('）') && 
                (yukinoPrompt.includes('微笑み') || yukinoPrompt.includes('笑顔') || yukinoPrompt.includes('嬉しそう')))
        ? '✅ ト書きの表情・感情表現が正しく含まれています'
        : '❌ ト書きの表情・感情表現が含まれていません',
    });

    // 話し方の柔らかさ
    yukinoTests.push({
      name: '柔らかく温かい話し方の設定が含まれている',
      passed: yukinoPrompt.includes('優しく') || yukinoPrompt.includes('柔らかい') || yukinoPrompt.includes('温かい'),
      message: (yukinoPrompt.includes('優しく') || yukinoPrompt.includes('柔らかい') || yukinoPrompt.includes('温かい'))
        ? '✅ 柔らかく温かい話し方の設定が正しく含まれています'
        : '❌ 柔らかく温かい話し方の設定が含まれていません',
    });

    // 言葉に詰まる表現
    yukinoTests.push({
      name: '言葉に詰まる可愛らしい表現が含まれている',
      passed: yukinoPrompt.includes('えっと') || yukinoPrompt.includes('あの') || yukinoPrompt.includes('どうしよう'),
      message: (yukinoPrompt.includes('えっと') || yukinoPrompt.includes('あの') || yukinoPrompt.includes('どうしよう'))
        ? '✅ 言葉に詰まる表現が正しく含まれています'
        : '❌ 言葉に詰まる表現が含まれていません',
    });

    // 素直な喜びの表現
    yukinoTests.push({
      name: '素直な喜びの表現が含まれている',
      passed: yukinoPrompt.includes('わぁ') || yukinoPrompt.includes('本当ですか') || yukinoPrompt.includes('嬉しい'),
      message: (yukinoPrompt.includes('わぁ') || yukinoPrompt.includes('本当ですか') || yukinoPrompt.includes('嬉しい'))
        ? '✅ 素直な喜びの表現が正しく含まれています'
        : '❌ 素直な喜びの表現が含まれていません',
    });

    // 相談者への共感と気遣い
    yukinoTests.push({
      name: '相談者への共感と気遣いが設定されている',
      passed: yukinoPrompt.includes('寄り添') || yukinoPrompt.includes('無理しないで') || yukinoPrompt.includes('気遣い'),
      message: (yukinoPrompt.includes('寄り添') || yukinoPrompt.includes('無理しないで') || yukinoPrompt.includes('気遣い'))
        ? '✅ 相談者への共感と気遣いが正しく設定されています'
        : '❌ 相談者への共感と気遣いが設定されていません',
    });

    // ドジなキャラクター性
    yukinoTests.push({
      name: 'ドジなキャラクター性が含まれている',
      passed: yukinoPrompt.includes('ドジ') || yukinoPrompt.includes('うっかり') || yukinoPrompt.includes('小さな失敗'),
      message: (yukinoPrompt.includes('ドジ') || yukinoPrompt.includes('うっかり') || yukinoPrompt.includes('小さな失敗'))
        ? '✅ ドジなキャラクター性が正しく含まれています'
        : '❌ ドジなキャラクター性が含まれていません',
    });

    // 相談者の名前で呼ぶ指示
    yukinoTests.push({
      name: '相談者をニックネームで呼ぶ指示が含まれている',
      passed: yukinoPrompt.includes('さん') && yukinoPrompt.includes('呼ぶ'),
      message: (yukinoPrompt.includes('さん') && yukinoPrompt.includes('呼ぶ'))
        ? '✅ 相談者をニックネームで呼ぶ指示が正しく含まれています'
        : '❌ 相談者をニックネームで呼ぶ指示が含まれていません',
    });

    // 心理カウンセリングアプローチ
    yukinoTests.push({
      name: '心理カウンセリングアプローチの詳細設定が含まれている',
      passed: yukinoPrompt.includes('受容') || yukinoPrompt.includes('傾聴') || yukinoPrompt.includes('共感'),
      message: (yukinoPrompt.includes('受容') || yukinoPrompt.includes('傾聴') || yukinoPrompt.includes('共感'))
        ? '✅ 心理カウンセリングアプローチの詳細設定が正しく含まれています'
        : '❌ 心理カウンセリングアプローチの詳細設定が含まれていません',
    });

    testSuites.push({
      characterId: 'yukino',
      characterName: '笹岡雪乃',
      tests: yukinoTests,
      generatedPrompt: yukinoPrompt,
    });

    // ===== 水野ソラ（sora）のテスト =====
    const soraTests: TestResult[] = [];
    const soraPrompt = generateSoraPrompt({
      userNickname: 'テストユーザー',
      hasPreviousConversation: false,
    });

    soraTests.push({
      name: '基本設定が含まれている',
      passed: soraPrompt.includes('水野ソラ') && soraPrompt.includes('27歳の男性'),
      message: soraPrompt.includes('水野ソラ') && soraPrompt.includes('27歳の男性')
        ? '✅ ソラの基本設定が正しく含まれています'
        : '❌ ソラの基本設定が含まれていません',
    });

    soraTests.push({
      name: 'タメ口の設定が反映されている',
      passed: soraPrompt.includes('タメ口') && soraPrompt.includes('君'),
      message: soraPrompt.includes('タメ口') && soraPrompt.includes('君')
        ? '✅ タメ口の設定が正しく反映されています'
        : '❌ タメ口の設定が反映されていません',
    });

    soraTests.push({
      name: 'ダイナミック・ソウル・アプローチの設定が含まれている',
      passed: soraPrompt.includes('ダイナミック・ソウル・アプローチ'),
      message: soraPrompt.includes('ダイナミック・ソウル・アプローチ')
        ? '✅ ダイナミック・ソウル・アプローチの設定が正しく含まれています'
        : '❌ ダイナミック・ソウル・アプローチの設定が含まれていません',
    });

    testSuites.push({
      characterId: 'sora',
      characterName: '水野ソラ',
      tests: soraTests,
      generatedPrompt: soraPrompt,
    });

    // ===== 三崎花音（kaon）のテスト =====
    const kaonTests: TestResult[] = [];
    const kaonPrompt = generateKaonPrompt({
      userNickname: 'テストユーザー',
      hasPreviousConversation: false,
    });

    kaonTests.push({
      name: '基本設定が含まれている',
      passed: kaonPrompt.includes('三崎花音') && kaonPrompt.includes('天体音響心理鑑定士'),
      message: kaonPrompt.includes('三崎花音') && kaonPrompt.includes('天体音響心理鑑定士')
        ? '✅ 花音の基本設定が正しく含まれています'
        : '❌ 花音の基本設定が含まれていません',
    });

    kaonTests.push({
      name: '艶っぽい語尾の設定が反映されている',
      passed: kaonPrompt.includes('〜ね') && kaonPrompt.includes('〜かしら') && kaonPrompt.includes('〜だわ'),
      message: kaonPrompt.includes('〜ね') && kaonPrompt.includes('〜かしら') && kaonPrompt.includes('〜だわ')
        ? '✅ 艶っぽい語尾の設定が正しく反映されています'
        : '❌ 艶っぽい語尾の設定が反映されていません',
    });

    kaonTests.push({
      name: '占星術・数秘術の設定が含まれている',
      passed: kaonPrompt.includes('占星術') && kaonPrompt.includes('数秘術'),
      message: kaonPrompt.includes('占星術') && kaonPrompt.includes('数秘術')
        ? '✅ 占星術・数秘術の設定が正しく含まれています'
        : '❌ 占星術・数秘術の設定が含まれていません',
    });

    testSuites.push({
      characterId: 'kaon',
      characterName: '三崎花音',
      tests: kaonTests,
      generatedPrompt: kaonPrompt,
    });

    // ===== システムプロンプト生成の統合テスト =====
    const integrationTests: TestResult[] = [];
    const characters = ['kaede', 'yukino', 'sora', 'kaon'];
    
    for (const characterId of characters) {
      const prompt = generateSystemPrompt(characterId, {
        userNickname: 'テストユーザー',
        hasPreviousConversation: false,
      });
      
      integrationTests.push({
        name: `${characterId}のプロンプト生成`,
        passed: prompt && typeof prompt === 'string' && prompt.length > 100,
        message: prompt && typeof prompt === 'string' && prompt.length > 100
          ? `✅ ${characterId}のプロンプトが正しく生成されました（${prompt.length}文字）`
          : `❌ ${characterId}のプロンプト生成に失敗しました`,
        details: prompt ? `生成されたプロンプトの長さ: ${prompt.length}文字` : undefined,
      });
    }

    // テスト結果の集計
    const totalTests = testSuites.reduce((sum, suite) => sum + suite.tests.length, 0) + integrationTests.length;
    const passedTests = testSuites.reduce((sum, suite) => sum + suite.tests.filter(t => t.passed).length, 0) + integrationTests.filter(t => t.passed).length;
    const failedTests = totalTests - passedTests;

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          total: totalTests,
          passed: passedTests,
          failed: failedTests,
          passRate: totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0,
        },
        testSuites,
        integrationTests,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[run-tests] エラー:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
