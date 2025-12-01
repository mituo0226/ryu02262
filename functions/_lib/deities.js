export const deities = [
  '桜舞い散る春の道',
  '月明かりに浮かぶ夢',
  '星降る夜の物語',
  '朝露に光る希望',
  '夕焼けのやさしさ',
  '虹の架け橋',
  '春風に揺れる花',
  '雪化粧の静けさ',
  '風鈴の涼しい音',
  '蝉しぐれの夏',
  '紅葉散る小道',
  '初雪の贈り物',
  '菜の花畑の春',
  '蛍舞う夕べ',
  '雲海に浮かぶ夢',
  '波の音の子守歌',
  '霧雨の潤い',
  '落葉の敷き毯',
  '春霞の揺らぎ',
  '小鳥のさえずり',
  '小川のせせらぎ',
  '野原の風車',
  '藤色の花',
  '金色の稲穂'
];

export function getRandomDeity() {
  const index = Math.floor(Math.random() * deities.length);
  return deities[index];
}

