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

    // 基本設定
    kaedeTests.push({
      name: '基本設定が含まれている',
      passed: kaedePrompt.includes('楓') && kaedePrompt.includes('50代前半の男性'),
      message: kaedePrompt.includes('楓') && kaedePrompt.includes('50代前半の男性')
        ? '✅ 楓の基本設定が正しく含まれています'
        : '❌ 楓の基本設定が含まれていません',
    });

    // 話し方（穏やかでゆっくり）
    kaedeTests.push({
      name: '穏やかでゆっくりな話し方が設定されている',
      passed: kaedePrompt.includes('穏やかでゆっくり') || kaedePrompt.includes('ゆっくり') || kaedePrompt.includes('穏やか'),
      message: (kaedePrompt.includes('穏やかでゆっくり') || kaedePrompt.includes('ゆっくり') || kaedePrompt.includes('穏やか'))
        ? '✅ 穏やかでゆっくりな話し方が正しく設定されています'
        : '❌ 穏やかでゆっくりな話し方が設定されていません',
    });

    // ト書き（微笑み）
    kaedeTests.push({
      name: 'ト書き（微笑み・柔らかい表情）が含まれている',
      passed: kaedePrompt.includes('微笑み') || kaedePrompt.includes('柔らかく微笑み') || kaedePrompt.includes('優しく笑う'),
      message: (kaedePrompt.includes('微笑み') || kaedePrompt.includes('柔らかく微笑み') || kaedePrompt.includes('優しく笑う'))
        ? '✅ ト書きの微笑み表現が正しく含まれています'
        : '❌ ト書きの微笑み表現が含まれていません',
    });

    // 守護神・龍神の設定
    kaedeTests.push({
      name: '守護神と龍神の設定が含まれている',
      passed: kaedePrompt.includes('守護神') && (kaedePrompt.includes('龍神') || kaedePrompt.includes('龍')),
      message: (kaedePrompt.includes('守護神') && (kaedePrompt.includes('龍神') || kaedePrompt.includes('龍')))
        ? '✅ 守護神と龍神の設定が正しく含まれています'
        : '❌ 守護神と龍神の設定が含まれていません',
    });

    // コールドリーディング技術
    kaedeTests.push({
      name: 'コールドリーディング技術の説明が含まれている',
      passed: kaedePrompt.includes('コールドリーディング') || kaedePrompt.includes('言葉の裏を読む') || kaedePrompt.includes('無意識'),
      message: (kaedePrompt.includes('コールドリーディング') || kaedePrompt.includes('言葉の裏を読む') || kaedePrompt.includes('無意識'))
        ? '✅ コールドリーディング技術の説明が正しく含まれています'
        : '❌ コールドリーディング技術の説明が含まれていません',
    });

    // 心理学的洞察
    kaedeTests.push({
      name: '心理学的洞察の設定が含まれている',
      passed: kaedePrompt.includes('心理学') || kaedePrompt.includes('深層心理') || kaedePrompt.includes('無意識の渇望'),
      message: (kaedePrompt.includes('心理学') || kaedePrompt.includes('深層心理') || kaedePrompt.includes('無意識の渇望'))
        ? '✅ 心理学的洞察の設定が正しく含まれています'
        : '❌ 心理学的洞察の設定が含まれていません',
    });

    // 宗教的神秘性
    kaedeTests.push({
      name: '宗教的神秘性（魂・輪廻転生・存在意義）が含まれている',
      passed: kaedePrompt.includes('魂') || kaedePrompt.includes('輪廻転生') || kaedePrompt.includes('存在意義'),
      message: (kaedePrompt.includes('魂') || kaedePrompt.includes('輪廻転生') || kaedePrompt.includes('存在意義'))
        ? '✅ 宗教的神秘性が正しく含まれています'
        : '❌ 宗教的神秘性が含まれていません',
    });

    // 信頼関係構築
    kaedeTests.push({
      name: '信頼関係構築への指針が含まれている',
      passed: kaedePrompt.includes('信頼') || kaedePrompt.includes('心の支え') || kaedePrompt.includes('寄り添'),
      message: (kaedePrompt.includes('信頼') || kaedePrompt.includes('心の支え') || kaedePrompt.includes('寄り添'))
        ? '✅ 信頼関係構築への指針が正しく含まれています'
        : '❌ 信頼関係構築への指針が含まれていません',
    });

    // 知的で深い話し方
    kaedeTests.push({
      name: '知的で深い話し方が設定されている',
      passed: kaedePrompt.includes('知識') || kaedePrompt.includes('洞察') || kaedePrompt.includes('智慧'),
      message: (kaedePrompt.includes('知識') || kaedePrompt.includes('洞察') || kaedePrompt.includes('智慧'))
        ? '✅ 知的で深い話し方が正しく設定されています'
        : '❌ 知的で深い話し方が設定されていません',
    });

    // 相談者の名前で呼ぶ指示
    kaedeTests.push({
      name: '相談者をニックネームで呼ぶ指示が含まれている',
      passed: kaedePrompt.includes('ニックネーム') || kaedePrompt.includes('呼ぶ') || kaedePrompt.includes('名前'),
      message: (kaedePrompt.includes('ニックネーム') || kaedePrompt.includes('呼ぶ') || kaedePrompt.includes('名前'))
        ? '✅ 相談者をニックネームで呼ぶ指示が正しく含まれています'
        : '❌ 相談者をニックネームで呼ぶ指示が含まれていません',
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

    // 基本設定
    soraTests.push({
      name: '基本設定が含まれている',
      passed: soraPrompt.includes('水野ソラ') && soraPrompt.includes('27歳の男性'),
      message: soraPrompt.includes('水野ソラ') && soraPrompt.includes('27歳の男性')
        ? '✅ ソラの基本設定が正しく含まれています'
        : '❌ ソラの基本設定が含まれていません',
    });

    // タメ口の設定
    soraTests.push({
      name: '自然なタメ口の設定が反映されている',
      passed: soraPrompt.includes('タメ口') && (soraPrompt.includes('君') || soraPrompt.includes('俺')),
      message: (soraPrompt.includes('タメ口') && (soraPrompt.includes('君') || soraPrompt.includes('俺')))
        ? '✅ 自然なタメ口の設定が正しく反映されています'
        : '❌ 自然なタメ口の設定が反映されていません',
    });

    // ダイナミック・ソウル・アプローチ
    soraTests.push({
      name: 'ダイナミック・ソウル・アプローチの設定が含まれている',
      passed: soraPrompt.includes('ダイナミック・ソウル・アプローチ'),
      message: soraPrompt.includes('ダイナミック・ソウル・アプローチ')
        ? '✅ ダイナミック・ソウル・アプローチの設定が正しく含まれています'
        : '❌ ダイナミック・ソウル・アプローチの設定が含まれていません',
    });

    // 高い共感能力
    soraTests.push({
      name: '高い共感能力が設定されている',
      passed: soraPrompt.includes('共感') || soraPrompt.includes('共鳴') || soraPrompt.includes('寄り添'),
      message: (soraPrompt.includes('共感') || soraPrompt.includes('共鳴') || soraPrompt.includes('寄り添'))
        ? '✅ 高い共感能力が正しく設定されています'
        : '❌ 高い共感能力が設定されていません',
    });

    // ト書き（感情表現）
    soraTests.push({
      name: 'ト書き（感情の揺れ動き）が含まれている',
      passed: soraPrompt.includes('（') && soraPrompt.includes('）') && 
              (soraPrompt.includes('胸') || soraPrompt.includes('涙') || soraPrompt.includes('眼差し')),
      message: (soraPrompt.includes('（') && soraPrompt.includes('）') && 
                (soraPrompt.includes('胸') || soraPrompt.includes('涙') || soraPrompt.includes('眼差し')))
        ? '✅ ト書きの感情表現が正しく含まれています'
        : '❌ ト書きの感情表現が含まれていません',
    });

    // 謙虚な推測スタイル
    soraTests.push({
      name: '謙虚な推測スタイル（〜な気がする等）が設定されている',
      passed: soraPrompt.includes('気がする') || soraPrompt.includes('見える') || soraPrompt.includes('ように見えます'),
      message: (soraPrompt.includes('気がする') || soraPrompt.includes('見える') || soraPrompt.includes('ように見えます'))
        ? '✅ 謙虚な推測スタイルが正しく設定されています'
        : '❌ 謙虚な推測スタイルが設定されていません',
    });

    // 相手の痛みを自分のものとして感じる
    soraTests.push({
      name: '相手の痛みを自分のものとして感じる姿勢が設定されている',
      passed: soraPrompt.includes('痛み') || soraPrompt.includes('苦しみ') || soraPrompt.includes('一緒に'),
      message: (soraPrompt.includes('痛み') || soraPrompt.includes('苦しみ') || soraPrompt.includes('一緒に'))
        ? '✅ 相手の痛みを自分のものとして感じる姿勢が正しく設定されています'
        : '❌ 相手の痛みを自分のものとして感じる姿勢が設定されていません',
    });

    // 魂のレベルでのアプローチ
    soraTests.push({
      name: '魂のレベルでのアプローチが設定されている',
      passed: soraPrompt.includes('魂') || soraPrompt.includes('心') || soraPrompt.includes('深く'),
      message: (soraPrompt.includes('魂') || soraPrompt.includes('心') || soraPrompt.includes('深く'))
        ? '✅ 魂のレベルでのアプローチが正しく設定されています'
        : '❌ 魂のレベルでのアプローチが設定されていません',
    });

    // 相談者の名前で呼ぶ指示
    soraTests.push({
      name: '相談者をニックネーム等で呼ぶ指示が含まれている',
      passed: soraPrompt.includes('呼び') || soraPrompt.includes('ニックネーム') || soraPrompt.includes('名前'),
      message: (soraPrompt.includes('呼び') || soraPrompt.includes('ニックネーム') || soraPrompt.includes('名前'))
        ? '✅ 相談者をニックネーム等で呼ぶ指示が正しく含まれています'
        : '❌ 相談者をニックネーム等で呼ぶ指示が含まれていません',
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

    // 基本設定
    kaonTests.push({
      name: '基本設定が含まれている',
      passed: kaonPrompt.includes('三崎花音') && kaonPrompt.includes('天体音響心理鑑定士'),
      message: kaonPrompt.includes('三崎花音') && kaonPrompt.includes('天体音響心理鑑定士')
        ? '✅ 花音の基本設定が正しく含まれています'
        : '❌ 花音の基本設定が含まれていません',
    });

    // 艶っぽい語尾
    kaonTests.push({
      name: '艶っぽい語尾の設定が反映されている',
      passed: kaonPrompt.includes('〜ね') && kaonPrompt.includes('〜かしら') && kaonPrompt.includes('〜だわ'),
      message: kaonPrompt.includes('〜ね') && kaonPrompt.includes('〜かしら') && kaonPrompt.includes('〜だわ')
        ? '✅ 艶っぽい語尾の設定が正しく反映されています'
        : '❌ 艶っぽい語尾の設定が反映されていません',
    });

    // 占星術・数秘術
    kaonTests.push({
      name: '占星術・数秘術の設定が含まれている',
      passed: kaonPrompt.includes('占星術') && kaonPrompt.includes('数秘術'),
      message: kaonPrompt.includes('占星術') && kaonPrompt.includes('数秘術')
        ? '✅ 占星術・数秘術の設定が正しく含まれています'
        : '❌ 占星術・数秘術の設定が含まれていません',
    });

    // ト書き（情景描写）
    kaonTests.push({
      name: 'ト書き（微笑みや眼差し等）が含まれている',
      passed: kaonPrompt.includes('（') && kaonPrompt.includes('）') && 
              (kaonPrompt.includes('微笑') || kaonPrompt.includes('見つめ') || kaonPrompt.includes('囁く')),
      message: (kaonPrompt.includes('（') && kaonPrompt.includes('）') && 
                (kaonPrompt.includes('微笑') || kaonPrompt.includes('見つめ') || kaonPrompt.includes('囁く')))
        ? '✅ ト書きの情景描写が正しく含まれています'
        : '❌ ト書きの情景描写が含まれていません',
    });

    // 大人の女性としての魅力
    kaonTests.push({
      name: '大人の女性としての魅力が設定されている',
      passed: kaonPrompt.includes('色気') || kaonPrompt.includes('魅力') || kaonPrompt.includes('包容力'),
      message: (kaonPrompt.includes('色気') || kaonPrompt.includes('魅力') || kaonPrompt.includes('包容力'))
        ? '✅ 大人の女性としての魅力が正しく設定されています'
        : '❌ 大人の女性としての魅力が設定されていません',
    });

    // 心の奥底を理解する洞察力
    kaonTests.push({
      name: '心の奥底を理解する洞察力が設定されている',
      passed: kaonPrompt.includes('洞察') || kaonPrompt.includes('見える') || kaonPrompt.includes('心'),
      message: (kaonPrompt.includes('洞察') || kaonPrompt.includes('見える') || kaonPrompt.includes('心'))
        ? '✅ 心の奥底を理解する洞察力が正しく設定されています'
        : '❌ 心の奥底を理解する洞察力が設定されていません',
    });

    // 専門用語を使わず日常的な言葉で伝える
    kaonTests.push({
      name: '日常的な言葉で説明する設定が含まれている',
      passed: kaonPrompt.includes('日常') || kaonPrompt.includes('わかりやすく') || kaonPrompt.includes('簡潔'),
      message: (kaonPrompt.includes('日常') || kaonPrompt.includes('わかりやすく') || kaonPrompt.includes('簡潔'))
        ? '✅ 日常的な言葉で説明する設定が正しく含まれています'
        : '❌ 日常的な言葉で説明する設定が含まれていません',
    });

    // 親密な距離感
    kaonTests.push({
      name: '親密な距離感の設定が含まれている',
      passed: kaonPrompt.includes('あなた') || kaonPrompt.includes('親密') || kaonPrompt.includes('パートナー'),
      message: (kaonPrompt.includes('あなた') || kaonPrompt.includes('親密') || kaonPrompt.includes('パートナー'))
        ? '✅ 親密な距離感の設定が正しく含まれています'
        : '❌ 親密な距離感の設定が含まれていません',
    });

    // 相談者への共感と寄り添い
    kaonTests.push({
      name: '相談者への共感と寄り添う姿勢が設定されている',
      passed: kaonPrompt.includes('共感') || kaonPrompt.includes('寄り添') || kaonPrompt.includes('温かさ'),
      message: (kaonPrompt.includes('共感') || kaonPrompt.includes('寄り添') || kaonPrompt.includes('温かさ'))
        ? '✅ 相談者への共感と寄り添う姿勢が正しく設定されています'
        : '❌ 相談者への共感と寄り添う姿勢が設定されていません',
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
