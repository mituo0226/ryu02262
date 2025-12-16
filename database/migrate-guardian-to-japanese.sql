-- 守護神のカラムを英語IDから日本語名に変換
-- 実行前にバックアップを取ることを推奨

UPDATE users SET guardian = '天照大神' WHERE guardian = 'amaterasu';
UPDATE users SET guardian = '大国主命' WHERE guardian = 'okuni-nushi';
UPDATE users SET guardian = '大日如来' WHERE guardian = 'dainithi-nyorai';
UPDATE users SET guardian = '千手観音' WHERE guardian = 'senju';
UPDATE users SET guardian = '不動明王' WHERE guardian = 'fudo';

-- 確認
SELECT id, nickname, guardian FROM users ORDER BY id;



