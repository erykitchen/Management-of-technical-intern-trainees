export interface Trainee {
  id: number;
  traineeName: string;
  kana?: string;
  batch: string;
  status: string;
  category: string;
  stayLimit: string;
  targetCompanyId?: string;
  [key: string]: any; // その他の詳細項目を許容
}

export interface Company {
  id: string;
  companyName: string;
  trainees: Trainee[];
  [key: string]: any;
}