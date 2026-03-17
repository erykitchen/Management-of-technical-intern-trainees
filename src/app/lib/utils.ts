export const checkAlert = (dateString: string | undefined, category: string) => {
  if (!dateString || category === "実習終了") return null;

  const targetDate = new Date(dateString);
  const today = new Date();
  const diffTime = targetDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  // 30日以内、または期限超過 (赤黄アラート: critical)
  if (diffDays <= 30) return "critical"; 
  // 60日以内 (赤アラート: warning-red)
  if (diffDays <= 60) return "warning-red";
  // 90日以内 (黄アラート: warning-yellow)
  if (diffDays <= 90) return "warning-yellow";

  return null;
};

export const calculateAge = (birthday: string) => {
  if (!birthday) return "";
  const b = new Date(birthday);
  const today = new Date();
  let age = today.getFullYear() - b.getFullYear();
  const m = today.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < b.getDate())) age--;
  return age;
};

export const convertToAD = (dateStr: string) => {
  if (!dateStr) return "";
  return dateStr.replace(/[年月日]/g, '/').replace(/\/$/, "");
};