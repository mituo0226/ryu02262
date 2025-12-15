/**
 * 守護神決定ユーティリティ
 * 
 * 生年月日から守護神を決定するロジック
 */

/**
 * 守護神の定義
 */
const GUARDIANS = [
  {
    id: '天照大神',
    name: '天照大神',
    image: 'amaterasu.png',
    message: 'あなたは天照大神に守られています。太陽のように明るく、前向きな力を授かっています。'
  },
  {
    id: '大国主命',
    name: '大国主命',
    image: 'okuni-nushi.png', // 注意: 実際のファイル名は okuni-nushi.png（仕様では okuni-nishi.png と記載されていましたが、実ファイルに合わせています）
    message: 'あなたは大国主命に守られています。豊かさと調和の力を授かっています。'
  },
  {
    id: '大日如来',
    name: '大日如来',
    image: 'dainithi-nyorai.png',
    message: 'あなたは大日如来に守られています。智慧と光明の力を授かっています。'
  },
  {
    id: '千手観音',
    name: '千手観音',
    image: 'senju.png',
    message: 'あなたは千手観音に守られています。慈悲と救済の力を授かっています。'
  },
  {
    id: '不動明王',
    name: '不動明王',
    image: 'fudo.png',
    message: 'あなたは不動明王に守られています。不動の意志と守護の力を授かっています。'
  }
];

/**
 * 生年月日から守護神を決定する
 * 
 * @param {string} birthday - 生年月日（"YYYY-MM-DD" または "YYYYMMDD" 形式）
 * @returns {Object} { id, name, image, message } の形式で守護神情報を返す
 * 
 * @example
 * const guardian = getGuardian('1974-02-26');
 * // { id: 'amaterasu', name: '天照大神', image: 'amaterasu.png', ... }
 */
export function getGuardian(birthday) {
  if (!birthday) {
    throw new Error('生年月日が指定されていません');
  }

  // ハイフンを削除して数値に変換
  const numericDate = birthday.replace(/-/g, '');
  const dateNumber = parseInt(numericDate, 10);

  if (isNaN(dateNumber)) {
    throw new Error('無効な生年月日形式です');
  }

  // 5で割った余り（0〜4）で守護神を決定
  const remainder = dateNumber % 5;
  const guardian = GUARDIANS[remainder];

  if (!guardian) {
    throw new Error('守護神の決定に失敗しました');
  }

  return { ...guardian };
}

/**
 * 生年月日の各要素から守護神を決定する
 * 
 * @param {number} birthYear - 生年
 * @param {number} birthMonth - 生月
 * @param {number} birthDay - 生日
 * @returns {Object} { id, name, image, message } の形式で守護神情報を返す
 * 
 * @example
 * const guardian = getGuardianFromParts(1974, 2, 26);
 */
export function getGuardianFromParts(birthYear, birthMonth, birthDay) {
  // YYYYMMDD形式の文字列を作成
  const yearStr = String(birthYear).padStart(4, '0');
  const monthStr = String(birthMonth).padStart(2, '0');
  const dayStr = String(birthDay).padStart(2, '0');
  const birthday = `${yearStr}-${monthStr}-${dayStr}`;
  
  return getGuardian(birthday);
}

/**
 * すべての守護神情報を取得する
 * @returns {Array} 守護神の配列
 */
export function getAllGuardians() {
  return GUARDIANS.map(g => ({ ...g }));
}

