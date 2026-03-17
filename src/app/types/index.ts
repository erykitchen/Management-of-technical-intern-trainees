export interface Trainee {
  id: number;
  targetCompanyId?: string; // ← ここに「?」付きで追加
  batch: string;
  status: string;
  traineeName: string;
  kana: string;
  traineeZip: string;
  traineeAddress: string;
  category: string;
  nationality: string;
  birthday: string;
  age: string;
  gender: string;
  period: string;
  stayLimit: string;
  cardNumber: string;
  passportLimit: string;
  passportNumber: string;
  certificateNumber: string;
  applyDate: string;
  certDate: string;
  entryDate: string;
  renewStartDate: string;
  assignDate: string;
  endDate: string;
  moveDate: string;
  returnDate: string;
  employmentReportDate: string;
  trainingStartDate: string;
  trainingEndDate: string;
  memo: string;
  phaseHistory: any[];
}

export interface Company {
  id: string;
  companyName: string;
  trainees: Trainee[];
  [key: string]: any;
}