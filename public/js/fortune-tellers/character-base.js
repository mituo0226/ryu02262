/**
 * 基本キャラクタークラス
 * すべての鑑定士が継承する共通機能を提供
 */
export class CharacterBase {
  constructor(config) {
    this.id = config.id;
    this.name = config.name;
    this.nameKana = config.nameKana;
    this.birthday = config.birthday;
    this.zodiac = config.zodiac;
    this.birthplace = config.birthplace;
    this.profile = config.profile || '';
    this.message = config.message || '';
    this.imagePath = config.imagePath || '';
  }

  /**
   * キャラクター情報を取得
   */
  getInfo() {
    return {
      id: this.id,
      name: this.name,
      nameKana: this.nameKana,
      birthday: this.birthday,
      zodiac: this.zodiac,
      birthplace: this.birthplace,
      profile: this.profile,
      message: this.message,
      imagePath: this.imagePath,
    };
  }

  /**
   * キャラクター名を取得
   */
  getName() {
    return this.name;
  }

  /**
   * キャラクターIDを取得
   */
  getId() {
    return this.id;
  }

  /**
   * プロフィールを取得
   */
  getProfile() {
    return this.profile;
  }

  /**
   * メッセージを取得
   */
  getMessage() {
    return this.message;
  }
}

