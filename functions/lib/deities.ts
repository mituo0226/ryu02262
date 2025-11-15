export const deities = [
  '天照大神', '須佐之男命', '大国主命', '八幡神', '稲荷神', '伊邪那岐命',
  '伊邪那美命', '弁財天', '毘沙門天', '布袋尊', '大黒天', '恵比寿',
  '寿老人', '福禄寿', '猿田彦命', '月読命', '住吉大神', '菅原道真公',
  '秋葉大神', '白山比咩大神', '春日大社の神々', '熊野権現', '金毘羅大神', '愛宕大神'
];

export function getRandomDeity(): string {
  const index = Math.floor(Math.random() * deities.length);
  return deities[index];
}
