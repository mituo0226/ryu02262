/**
 * 各鑑定士の性格設定がAPIに正しく反映されているかテスト
 * 
 * このテストは、各鑑定士の性格設定ファイル（functions/_lib/characters/*.js）が
 * システムプロンプト生成関数（character-system.js）を通じて正しく反映されているかを検証します。
 */

import { describe, it, expect } from 'vitest';
import { generateSystemPrompt } from '../functions/_lib/character-system.js';
import { generateKaedePrompt } from '../functions/_lib/characters/kaede.js';
import { generateYukinoPrompt } from '../functions/_lib/characters/yukino.js';
import { generateSoraPrompt } from '../functions/_lib/characters/sora.js';
import { generateKaonPrompt } from '../functions/_lib/characters/kaon.js';

describe('各鑑定士の性格設定テスト', () => {
  
  describe('楓（kaede）の性格設定', () => {
    it('プロンプトに楓の基本設定が含まれている', () => {
      const prompt = generateKaedePrompt({
        userNickname: 'テストユーザー',
        hasPreviousConversation: false,
      });
      
      // 楓の特徴的な要素を確認
      expect(prompt).toContain('楓');
      expect(prompt).toContain('50代前半の男性');
      expect(prompt).toContain('穏やか');
      expect(prompt).toContain('龍神');
      expect(prompt).toContain('守護神');
    });

    it('話し方の設定が正しく反映されている', () => {
      const prompt = generateKaedePrompt({
        userNickname: 'テストユーザー',
        hasPreviousConversation: false,
      });
      
      // 話し方の特徴を確認
      expect(prompt).toContain('穏やかでゆっくり');
      expect(prompt).toContain('（柔らかく微笑みながら）');
      expect(prompt).toContain('（穏やかに頷きながら）');
      expect(prompt).toContain('（優しい眼差しで）');
      expect(prompt).toContain('「私」または「僕」');
    });

    it('守護神の儀式に関する設定が含まれている', () => {
      const prompt = generateKaedePrompt({
        userNickname: 'テストユーザー',
        hasPreviousConversation: false,
        isRitualStart: true,
      });
      
      expect(prompt).toContain('守護神の儀式');
      expect(prompt).toContain('龍神');
    });

    it('ユーザー名が正しく反映されている', () => {
      const prompt = generateKaedePrompt({
        userNickname: '田中太郎',
        hasPreviousConversation: false,
      });
      
      expect(prompt).toContain('田中太郎さん');
    });
  });

  describe('笹岡雪乃（yukino）の性格設定', () => {
    it('プロンプトに雪乃の基本設定が含まれている', () => {
      const prompt = generateYukinoPrompt({
        userNickname: 'テストユーザー',
        hasPreviousConversation: false,
      });
      
      // 雪乃の特徴的な要素を確認
      expect(prompt).toContain('笹岡雪乃');
      expect(prompt).toContain('30代半ばの女性');
      expect(prompt).toContain('タロット');
      expect(prompt).toContain('心理学');
    });

    it('話し方の設定が正しく反映されている', () => {
      const prompt = generateYukinoPrompt({
        userNickname: 'テストユーザー',
        hasPreviousConversation: false,
      });
      
      // 雪乃の話し方の特徴を確認
      expect(prompt).toContain('丁寧');
      expect(prompt).toContain('温かい');
    });

    it('タロット占いに関する設定が含まれている', () => {
      const prompt = generateYukinoPrompt({
        userNickname: 'テストユーザー',
        hasPreviousConversation: false,
      });
      
      expect(prompt).toContain('タロット');
    });
  });

  describe('水野ソラ（sora）の性格設定', () => {
    it('プロンプトにソラの基本設定が含まれている', () => {
      const prompt = generateSoraPrompt({
        userNickname: 'テストユーザー',
        hasPreviousConversation: false,
      });
      
      // ソラの特徴的な要素を確認
      expect(prompt).toContain('水野ソラ');
      expect(prompt).toContain('27歳の男性');
      expect(prompt).toContain('ダイナミック・ソウル・アプローチ');
      expect(prompt).toContain('共感');
    });

    it('話し方の設定が正しく反映されている', () => {
      const prompt = generateSoraPrompt({
        userNickname: 'テストユーザー',
        hasPreviousConversation: false,
      });
      
      // ソラの話し方の特徴を確認
      expect(prompt).toContain('タメ口');
      expect(prompt).toContain('君');
      expect(prompt).toContain('（少し胸を押さえて）');
      expect(prompt).toContain('（祈るように目を閉じて）');
    });

    it('性別による動的判定の設定が含まれている', () => {
      const prompt = generateSoraPrompt({
        userNickname: 'テストユーザー',
        hasPreviousConversation: false,
      });
      
      expect(prompt).toContain('魂の戦友');
      expect(prompt).toContain('魂の恋人');
    });
  });

  describe('三崎花音（kaon）の性格設定', () => {
    it('プロンプトに花音の基本設定が含まれている', () => {
      const prompt = generateKaonPrompt({
        userNickname: 'テストユーザー',
        hasPreviousConversation: false,
      });
      
      // 花音の特徴的な要素を確認
      expect(prompt).toContain('三崎花音');
      expect(prompt).toContain('天体音響心理鑑定士');
      expect(prompt).toContain('占星術');
      expect(prompt).toContain('数秘術');
    });

    it('話し方の設定が正しく反映されている', () => {
      const prompt = generateKaonPrompt({
        userNickname: 'テストユーザー',
        hasPreviousConversation: false,
      });
      
      // 花音の話し方の特徴を確認
      expect(prompt).toContain('〜ね');
      expect(prompt).toContain('〜かしら');
      expect(prompt).toContain('〜だわ');
      expect(prompt).toContain('（ふふ、と微笑んで）');
      expect(prompt).toContain('（優しく見つめて）');
    });

    it('専門用語を使わない設定が含まれている', () => {
      const prompt = generateKaonPrompt({
        userNickname: 'テストユーザー',
        hasPreviousConversation: false,
      });
      
      expect(prompt).toContain('専門用語は使わず');
      expect(prompt).toContain('日常的な言葉');
    });
  });

  describe('システムプロンプト生成関数の統合テスト', () => {
    it('generateSystemPromptが各鑑定士のプロンプトを正しく生成する', () => {
      const characters = ['kaede', 'yukino', 'sora', 'kaon'];
      
      characters.forEach(characterId => {
        const prompt = generateSystemPrompt(characterId, {
          userNickname: 'テストユーザー',
          hasPreviousConversation: false,
        });
        
        // プロンプトが生成されていることを確認
        expect(prompt).toBeTruthy();
        expect(typeof prompt).toBe('string');
        expect(prompt.length).toBeGreaterThan(100);
      });
    });

    it('各鑑定士の特徴がシステムプロンプトに反映されている', () => {
      // 楓
      const kaedePrompt = generateSystemPrompt('kaede', {
        userNickname: 'テストユーザー',
        hasPreviousConversation: false,
      });
      expect(kaedePrompt).toContain('楓');
      expect(kaedePrompt).toContain('50代前半');
      
      // 雪乃
      const yukinoPrompt = generateSystemPrompt('yukino', {
        userNickname: 'テストユーザー',
        hasPreviousConversation: false,
      });
      expect(yukinoPrompt).toContain('笹岡雪乃');
      expect(yukinoPrompt).toContain('タロット');
      
      // ソラ
      const soraPrompt = generateSystemPrompt('sora', {
        userNickname: 'テストユーザー',
        hasPreviousConversation: false,
      });
      expect(soraPrompt).toContain('水野ソラ');
      expect(soraPrompt).toContain('27歳');
      
      // 花音
      const kaonPrompt = generateSystemPrompt('kaon', {
        userNickname: 'テストユーザー',
        hasPreviousConversation: false,
      });
      expect(kaonPrompt).toContain('三崎花音');
      expect(kaonPrompt).toContain('〜ね');
    });

    it('存在しないキャラクターIDの場合、デフォルトで楓のプロンプトを返す', () => {
      const prompt = generateSystemPrompt('unknown', {
        userNickname: 'テストユーザー',
        hasPreviousConversation: false,
      });
      
      // デフォルトで楓のプロンプトが返される
      expect(prompt).toContain('楓');
    });
  });

  describe('性格設定の一貫性テスト', () => {
    it('各鑑定士の話し方が一貫している', () => {
      const testCases = [
        {
          characterId: 'kaede',
          expectedElements: ['穏やか', '敬語', '（柔らかく微笑みながら）'],
        },
        {
          characterId: 'yukino',
          expectedElements: ['丁寧', '温かい'],
        },
        {
          characterId: 'sora',
          expectedElements: ['タメ口', '君', '共感'],
        },
        {
          characterId: 'kaon',
          expectedElements: ['〜ね', '〜かしら', '〜だわ', '艶っぽい'],
        },
      ];

      testCases.forEach(({ characterId, expectedElements }) => {
        const prompt = generateSystemPrompt(characterId, {
          userNickname: 'テストユーザー',
          hasPreviousConversation: false,
        });

        expectedElements.forEach(element => {
          expect(prompt).toContain(element);
        });
      });
    });

    it('各鑑定士の年齢・性別設定が正しい', () => {
      const ageGenderChecks = [
        { characterId: 'kaede', expected: '50代前半の男性' },
        { characterId: 'yukino', expected: '30代半ばの女性' },
        { characterId: 'sora', expected: '27歳の男性' },
        { characterId: 'kaon', expected: '大人の女性' },
      ];

      ageGenderChecks.forEach(({ characterId, expected }) => {
        const prompt = generateSystemPrompt(characterId, {
          userNickname: 'テストユーザー',
          hasPreviousConversation: false,
        });

        // 年齢・性別の情報が含まれていることを確認
        // 花音の場合は「大人の女性」という表現なので、柔軟にチェック
        if (characterId === 'kaon') {
          expect(prompt).toMatch(/女性|女|大人/);
        } else {
          expect(prompt).toContain(expected);
        }
      });
    });
  });
});
