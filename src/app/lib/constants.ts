export const labelMapCo: { [key: string]: string } = {
  companyName: "実習実施者名",
  address: "所在地",
  tel: "電話番号",
  representative: "代表者名",
  acceptance: "受入区分",
  memo: "備考"
};

export const labelMapTr: { [key: string]: string } = {
  traineeName: "氏名",
  nationality: "国籍",
  gender: "性別",
  birthday: "生年月日",
  age: "年齢",
  entryDate: "入国日",
  stayLimit: "在留期限",
  passportLimit: "旅券期限",
  category: "実習区分",
  status: "進捗状況",
  batch: "期生"
};

export const categoryOptions = ["第1号", "第2号", "第3号", "特定技能", "実習終了"];
export const batchOptions = ["なし", "1期生", "2期生", "3期生", "4期生", "5期生"];
export const nationalityOptions = ["ベトナム", "カンボジア", "インドネシア", "タイ", "フィリピン"];
export const statusOptions = ["選択する", "申請中", "許可済み", "待機中"];
export const acceptanceOptions = ["単独型", "団体監理型"];
export const genderOptions = ["男性", "女性"];

export const batchColorMap: { [key: string]: string } = {
  "1期生": "#E3F2FD",
  "2期生": "#F1F8E9",
  "3期生": "#FFF3E0",
  "4期生": "#F3E5F5",
  "5期生": "#EFEBE9"
};

export const initialCompanyForm = {
  companyName: "",
  address: "",
  tel: "",
  representative: "",
  acceptance: "団体監理型",
  memo: ""
};

export const initialTraineeForm = {
  traineeName: "",
  nationality: "ベトナム",
  gender: "男性",
  birthday: "",
  age: "",
  entryDate: "",
  stayLimit: "",
  passportLimit: "",
  category: "第1号",
  status: "選択する",
  batch: "なし",
  targetCompanyId: ""
};

// ★Modals.tsx で必要になる定義を追加★
export const keysToClearOnNewPhase = ["entryDate", "stayLimit", "status", "period"];