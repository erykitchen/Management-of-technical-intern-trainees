// app/lib/utils.ts
import { labelMapTr } from './constants';

/**
 * 和暦（令和・平成・昭和・R・H・S）を西暦（YYYY/MM/DD）に変換する
 */
export const convertToAD = (str: string) => {
  if (!str || typeof str !== 'string') return str;
  
  // 全角数字を半角に変換
  let text = str.trim().replace(/[０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0));
  
  const eras: { [key: string]: number } = { 
    '令和': 2018, '平成': 1988, '昭和': 1925, 
    'R': 2018, 'H': 1988, 'S': 1925 
  };

  for (let era in eras) {
    if (text.startsWith(era)) {
      const regex = new RegExp(`${era}\\s*(\\d+)[年.\\/-]?(\\d+)[月.\\/-]?(\\d+)日?`);
      const match = text.match(regex);
      if (match) {
        const year = parseInt(match[1]) + eras[era];
        const month = match[2].padStart(2, '0');
        const day = match[3].padStart(2, '0');
        return `${year}/${month}/${day}`;
      }
    }
  }

  // すでに西暦形式（YYYY/MM/DDなど）の場合の整形
  const adMatch = text.match(/^(\d{4})[.\/-](\d{1,2})[.\/-](\d{1,2})$/);
  if (adMatch) {
    return `${adMatch[1]}/${adMatch[2].padStart(2, '0')}/${adMatch[3].padStart(2, '0')}`;
  }
  
  return text;
};

/**
 * 生年月日から現在の年齢を計算する
 */
export const calculateAge = (birthday: string) => {
  const adBirthday = convertToAD(birthday);
  if (!adBirthday || adBirthday.length < 8) return "";
  
  const birthDate = new Date(adBirthday.replace(/\//g, '-'));
  if (isNaN(birthDate.getTime())) return "";
  
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age.toString();
};

/**
 * 期限が1ヶ月以内に迫っているかチェックする（アラート用）
 */
export const checkAlert = (dateStr: string, category: string) => {
  if (!dateStr || category === "実習終了") return false;
  
  const adDate = convertToAD(dateStr);
  const target = new Date(adDate.replace(/\//g, '-'));
  if (isNaN(target.getTime())) return false;
  
  const today = new Date();
  const limit = new Date();
  limit.setMonth(today.getMonth() + 1); // 今日の1ヶ月後
  
  return target <= limit; 
};

/**
 * 入国日から「実習終了日（1年後）」と「更新手続開始日（9ヶ月後）」を自動計算する
 */
export const calculateDates = (entryDateStr: string) => {
  const adDateStr = convertToAD(entryDateStr);
  const date = new Date(adDateStr.replace(/\//g, '-'));
  if (isNaN(date.getTime())) return { end: "", renew: "" };

  // 終了日：1年後の前日
  const nextYear = new Date(date);
  nextYear.setFullYear(nextYear.getFullYear() + 1);
  const endDate = new Date(nextYear);
  endDate.setDate(nextYear.getDate() - 1);

  // 更新開始日：終了日の3ヶ月前
  const renewDate = new Date(endDate);
  renewDate.setMonth(renewDate.getMonth() - 3);

  const fmt = (d: Date) => `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
  
  return { 
    end: fmt(endDate), 
    renew: fmt(renewDate) 
  };
};