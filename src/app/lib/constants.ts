// --- ラベル・選択肢・初期値定義 ---
export const labelMapCo: { [key: string]: string } = {
  companyName: "会社名", settlement: "決算時期", representative: "代表者氏名", jobType: "職種（小分類）",
  zipCode: "郵便番号", address: "住所", tel: "TEL", joinedDate: "組合加入年月日",
  employeeCount: "常勤職員数", acceptance: "今回までの実習生受入の有無", investmentCount: "出資口数",
  investmentAmount: "出資金額", investmentPayDate: "出資金払込年月日", corporateNumber: "法人番号",
  laborInsurance: "労働保険番号（14桁）", employmentInsurance: "雇用保険適応事業所番号（11桁）",
  implementationNumber: "実習実施者番号", acceptanceDate: "実習実施者届出受理日",
  industryCategory: "技能実習産業分類", officeZip: "事業所郵便番号", officeAddress: "技能実習生配属事業所住所",
  responsiblePerson: "技能実習責任者名", instructor: "技能実習指導員名", lifeInstructor: "生活指導員名", planInstructor: "技能実習計画指導員名",
  memo: "備考（メモ）"
};

export const labelMapTr: { [key: string]: string } = {
  batch: "バッチ(期生)", status: "ステータス", traineeName: "実習生氏名", kana: "フリガナ", 
  traineeZip: "郵便番号", traineeAddress: "住所", 
  category: "区分", nationality: "国籍", birthday: "生年月日", age: "年齢", gender: "性別",
  period: "期間", stayLimit: "在留期限", cardNumber: "在留カード番号", passportLimit: "パスポート期限",
  passportNumber: "パスポート番号", certificateNumber: "認定番号", applyDate: "申請日",
  certDate: "認定年月日", entryDate: "実習開始日(入国日)", renewStartDate: "更新手続開始日",
  assignDate: "配属日", endDate: "実習終了日", moveDate: "配属移動日", returnDate: "帰国日",
  employmentReportDate: "外国人雇用条件届出日", trainingStartDate: "講習開始日", trainingEndDate: "講習終了日"
};

export const categoryOptions = ["技能実習1号", "技能実習2号(1)", "技能実習2号(2)", "特定技能", "実習終了"];
export const batchOptions = ["なし", "①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨", "⑩"];
export const nationalityOptions = ["ベトナム", "中国", "インドネシア", "フィリピン", "ミャンマー", "カンボジア", "タイ", "その他（手入力）"];
export const statusOptions = ["選択する", "認定申請準備中", "認定手続中", "ビザ申請中", "入国待機", "実習中", "一時帰国中", "その他"];
export const acceptanceOptions = ["選択する", "受入中", "無し"];
export const genderOptions = ["男", "女"];
export const keysToClearOnNewPhase = ["status", "stayLimit", "cardNumber", "certificateNumber", "applyDate", "certDate", "entryDate", "endDate", "renewStartDate"];

export const batchColorMap: { [key: string]: string } = {
  "①": "#E3F2FD", "②": "#FFFDE7", "③": "#FFEBEE", "④": "#F3E5F5", "⑤": "#E8F5E9", "なし": "#FFFFFF"
};

export const initialCompanyForm = {
  ...Object.keys(labelMapCo).reduce((acc: any, key) => { acc[key] = ""; return acc; }, {}),
  investmentCount: "1口", investmentAmount: "10千円", acceptance: "選択する"
};

export const initialTraineeForm = {
  targetCompanyId: "", batch: "なし", status: "選択する", traineeName: "", kana: "", 
  traineeZip: "", traineeAddress: "", category: "技能実習1号", nationality: "ベトナム",
  birthday: "", age: "", gender: "男", period: "1年", stayLimit: "", 
  cardNumber: "", passportLimit: "", passportNumber: "", certificateNumber: "",
  applyDate: "", certDate: "", entryDate: "", renewStartDate: "", assignDate: "",
  endDate: "", moveDate: "", returnDate: "", employmentReportDate: "",
  trainingStartDate: "", trainingEndDate: "", memo: "", phaseHistory: []
};