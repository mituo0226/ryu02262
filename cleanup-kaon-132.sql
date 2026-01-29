DELETE FROM conversations WHERE user_id = 132 AND character_id = 'kaon';
SELECT COUNT(*) as remaining FROM conversations WHERE user_id = 132 AND character_id = 'kaon';