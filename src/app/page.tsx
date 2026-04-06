"use client";
import { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, addDoc, getDocs, query, orderBy, doc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";

// --- 1. 定義・ラベル設定 ---
const labelMapCo: { [key: string]: string } = {
  companyName: "会社名", kana: "ふりがな", representative: "代表者氏名", jobType: "職種（小分類）",
  zipCode: "郵便番号", address: "住所", tel: "TEL", fax: "FAX", joinedDate: "組合加入年月日",
  employeeCount: "常勤職員数", acceptance: "技能実習生受け入れの有無", investmentCount: "出資口数",
  investmentAmount: "出資金額", investmentPayDate: "出資金払込年月日", corporateNumber: "法人番号",
  laborInsurance: "労働保険番号（14桁）", employmentInsurance: "雇用保険適応事業所番号（11桁）",
  implementationNumber: "実習実施者番号", acceptanceDate: "実習実施者受理日",
  industryCategory: "技能実習産業分類", officeZip: "事業所郵便番号", officeAddress: "技能実習生配属事業所住所",
  responsiblePerson: "技能実習責任者氏名", instructor: "技能実習指導員氏名", lifeInstructor: "生活指導員氏名",
  planInstructor: "技能実習計画指導員氏名", industryType: "業種", memo: "備考（メモ）"
};

const labelMapTr: { [key: string]: string } = {
  batch: "バッチ(期生)", status: "ステータス", traineeName: "実習生氏名", kana: "フリガナ", 
  traineeZip: "郵便番号", traineeAddress: "住所", category: "区分", nationality: "国籍", 
  birthday: "生年月日", age: "年齢", gender: "性別", period: "期間", stayLimit: "在留期限", 
  cardNumber: "在留カード番号", passportLimit: "パスポート期限", passportNumber: "パスポート番号", 
  certificateNumber: "認定番号", applyDate: "申請日", certDate: "認定年月日", 
  entryDate: "実習開始日(入国日)", renewStartDate: "更新手続開始日", assignDate: "配属日", 
  endDate: "実習終了日", moveDate: "配属移動日", returnDate: "帰国日", 
  employmentReportDate: "外国人雇用条件届出日", trainingStartDate: "講習開始日", 
  trainingEndDate: "講習終了日", examDate: "技能検定時期", memo: "備考（メモ）"
};

const categoryOptions = ["技能実習1号", "技能実習2号(1)", "技能実習2号(2)", "特定技能", "実習終了"];
const batchOptions = ["なし", "①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨", "⑩"];
const statusOptions = ["選択する", "認定申請準備中", "認定手続中", "ビザ申請中", "入国待機", "入国後講習中", "実習中", "一時帰国中", "その他", "失踪"];
const assigneeOptions = ["", "朝比奈", "政所"];
const todoCategoryOptions = ["TODO", "支払関係", "試験関係"];
const keysToClearOnNewPhase = ["status", "stayLimit", "cardNumber", "certificateNumber", "applyDate", "certDate", "entryDate", "endDate", "renewStartDate"];

const batchColorMap: { [key: string]: string } = {
  "①": "#E3F2FD", "②": "#FFFDE7", "③": "#FFEBEE", "④": "#F3E5F5", "⑤": "#E8F5E9", "なし": "#FFFFFF"
};

const initialCompanyForm = {
  ...Object.keys(labelMapCo).reduce((acc: any, key) => { acc[key] = ""; return acc; }, {}),
  investmentCount: "1口", investmentAmount: "10口", acceptance: "選択する"
};

const initialTraineeForm = {
  targetCompanyId: "", batch: "なし", status: "選択する", traineeName: "", kana: "", 
  traineeZip: "", traineeAddress: "", category: "技能実習1号", nationality: "ベトナム",
  birthday: "", age: "", gender: "男", period: "1年", stayLimit: "", 
  cardNumber: "", passportLimit: "", passportNumber: "", certificateNumber: "",
  applyDate: "", certDate: "", entryDate: "", renewStartDate: "", assignDate: "",
  endDate: "", moveDate: "", returnDate: "", employmentReportDate: "",
  trainingStartDate: "", trainingEndDate: "", examDate: "", memo: "", phaseHistory: []
};

const initialTodoForm = { 
  companyId: "", traineeId: "", batch: "なし", task: "", detail: "", 
  deadline: "", assignee: "", todoCategory: "TODO" 
};

// --- 2. 便利関数 ---
const convertToAD = (str: string) => {
  if (!str || typeof str !== 'string') return str;
  let text = str.trim().replace(/[０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0));
  const eras: { [key: string]: number } = { '令和': 2018, '平成': 1988, '昭和': 1925, 'R': 2018, 'H': 1988, 'S': 1925 };
  for (let era in eras) {
    if (text.startsWith(era)) {
      const match = text.match(new RegExp(`${era}\\s*(\\d+)[年.\\/-]?(\\d+)[月.\\/-]?(\\d+)日?`));
      if (match) {
        const year = parseInt(match[1]) + eras[era];
        return `${year}/${match[2].padStart(2, '0')}/${match[3].padStart(2, '0')}`;
      }
      const monthMatch = text.match(new RegExp(`${era}\\s*(\\d+)[年.\\/-]?(\\d+)[月]?`));
      if (monthMatch) {
        const year = parseInt(monthMatch[1]) + eras[era];
        return `${year}/${monthMatch[2].padStart(2, '0')}/01`;
      }
    }
  }
  const adMatch = text.match(/^(\d{4})[.\/-](\d{1,2})[.\/-](\d{1,2})$/);
  if (adMatch) return `${adMatch[1]}/${adMatch[2].padStart(2, '0')}/${adMatch[3].padStart(2, '0')}`;
  const adMonthMatch = text.match(/^(\d{4})[.\/-](\d{1,2})$/);
  if (adMonthMatch) return `${adMonthMatch[1]}/${adMonthMatch[2].padStart(2, '0')}/01`;
  return text;
};

const getRemainingDays = (dateStr: string) => {
  const ad = convertToAD(dateStr);
  const target = new Date(ad.replace(/\//g, '-'));
  if (isNaN(target.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

const getAlertStyle = (dateStr: string, fieldKey: string, category: string): any => {
  if (!dateStr || category === "実習終了") return { color: '#2C3E50' };
  const alertFields = ["stayLimit", "examDate", "deadline"];
  if (!alertFields.includes(fieldKey)) return {};
  const diffDays = getRemainingDays(dateStr);
  if (diffDays === null) return { color: '#2C3E50' };

  if (diffDays <= 30) return { border: '4px double #FFD700', outline: '2px solid #E74C3C', outlineOffset: '-4px', backgroundColor: '#FFF5F5' };
  else if (diffDays <= 60) return { border: '2px solid #E74C3C', backgroundColor: '#FFF5F5' };
  else if (diffDays <= 90) return { border: '2px solid #FFD700', backgroundColor: '#FFFFF0' };
  return {};
};

const hasAlert = (t: any) => {
  const alertFields = ["stayLimit", "examDate"];
  return alertFields.some(key => {
    const style = getAlertStyle(t[key], key, t.category);
    return style.border && style.border !== 'none';
  });
};

const calculateAge = (birthday: string) => {
  const adBirthday = convertToAD(birthday);
  if (!adBirthday || adBirthday.length < 8) return "";
  const birthDate = new Date(adBirthday.replace(/\//g, '-'));
  if (isNaN(birthDate.getTime())) return "";
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  if (today < new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate())) age--;
  return age.toString();
};

const calculateDates = (entryDateStr: string) => {
  const adDateStr = convertToAD(entryDateStr);
  const date = new Date(adDateStr.replace(/\//g, '-'));
  if (isNaN(date.getTime())) return { end: "", renew: "" };
  const nextYear = new Date(date);
  nextYear.setFullYear(nextYear.getFullYear() + 1);
  const endDate = new Date(nextYear);
  endDate.setDate(nextYear.getDate() - 1);
  const renewDate = new Date(endDate);
  renewDate.setMonth(renewDate.getMonth() - 3);
  const fmt = (d: Date) => `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
  return { end: fmt(endDate), renew: fmt(renewDate) };
};

// --- 3. メインコンポーネント ---
export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [view, setView] = useState<'list' | 'detail' | 'print_tr' | 'print_co'>('list');
  const [showTrForm, setShowTrForm] = useState(false);
  const [showTrMethodModal, setShowTrMethodModal] = useState(false);
  const [showCoMethodModal, setShowCoMethodModal] = useState(false);
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [showCoCsvModal, setShowCoCsvModal] = useState(false);
  const [showCoForm, setShowCoForm] = useState(false);
  const [isEditingTr, setIsEditingTr] = useState(false);
  const [isEditingCo, setIsEditingCo] = useState(false);
  const [editingPhaseIdx, setEditingPhaseIdx] = useState<number | null>(null);
  const [currentCo, setCurrentCo] = useState<any>(null);
  const [selectedTrId, setSelectedTrId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'current' | number>('current');
  const [companies, setCompanies] = useState<any[]>([]);
  const [trFormData, setTrFormData] = useState<any>(initialTraineeForm);
  const [coFormData, setCoFormData] = useState<any>(initialCompanyForm);
  const [filterBatch, setFilterBatch] = useState<string>('すべて');

  // TODOステート
  const [todos, setTodos] = useState<any[]>([]);
  const [showTodoForm, setShowTodoForm] = useState(false);
  const [todoFormData, setTodoFormData] = useState<any>(initialTodoForm);
  const [isEditingTodo, setIsEditingTodo] = useState(false);
  const [selectedTodo, setSelectedTodo] = useState<any>(null);
  const [showAssigneeModal, setShowAssigneeModal] = useState(false);
  const [selectedAssigneeFilter, setSelectedAssigneeFilter] = useState<string | null>(null);

  // 期限アラート・保留ステート
  const [selectedAlert, setSelectedAlert] = useState<any>(null);
  const [pendingMemo, setPendingMemo] = useState("");

  // 印刷ステート
  const [printCoId, setPrintCoId] = useState("");
  const [printTrIds, setPrintTrIds] = useState<number[]>([]);
  const [printFields, setPrintFields] = useState<string[]>([]);
  const [printMode, setPrintMode] = useState<'individual' | 'table'>('individual');
  const [isPreview, setIsPreview] = useState(false);

  const colors = { main: '#FFF9F0', accent: '#F57C00', text: '#2C3E50', gray: '#95A5A6', lightGray: '#F2F2F2', border: '#E0E0E0', white: '#FFFFFF', danger: '#E74C3C', info: '#3498DB' };
  const sharpRadius = '4px';
  const btnBase = { padding: '10px 18px', borderRadius: sharpRadius, border: 'none', cursor: 'pointer', fontWeight: '600' as const, fontSize: '13px' };
  const grayCBtn = { width: '20px', height: '20px', fontSize: '9px', cursor: 'pointer', backgroundColor: 'transparent', border: `1px solid ${colors.border}`, borderRadius: '3px', color: colors.gray, marginLeft: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' };

  const fetchCompanies = async () => {
    const q = query(collection(db, "companies"), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setCompanies(data);
    if (currentCo) {
      const updated = data.find(c => c.id === currentCo.id);
      setCurrentCo(updated || null);
    }
  };

  const fetchTodos = async () => {
    const q = query(collection(db, "todos"), orderBy("deadline", "asc"));
    const querySnapshot = await getDocs(q);
    setTodos(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  useEffect(() => { fetchCompanies(); fetchTodos(); }, []);
  const copy = (text: string) => { if (text) navigator.clipboard.writeText(text); };

  const totalActiveTrainees = companies.reduce((sum, c) => sum + (c.trainees || []).filter((t: any) => t.category !== "実習終了").length, 0);
  const activeCompanyCount = companies.filter(c => (c.trainees || []).some((t: any) => t.category !== "実習終了")).length;

  const handleSaveCompany = async () => {
    if (!coFormData.companyName) { alert("会社名は必須です"); return; }
    const cleanedData = { ...coFormData };
    Object.keys(cleanedData).forEach(key => { if (typeof cleanedData[key] === 'string' && key !== 'memo') cleanedData[key] = convertToAD(cleanedData[key]); });
    try {
      if (isEditingCo && currentCo?.id) await updateDoc(doc(db, "companies", currentCo.id), cleanedData);
      else await addDoc(collection(db, "companies"), { ...cleanedData, trainees: [], createdAt: serverTimestamp(), completedTodos: [], pendingAlerts: [] });
      setShowCoForm(false); fetchCompanies();
    } catch (e) { alert("保存エラー"); }
  };

  const handleSaveTodo = async () => {
    if (!todoFormData.task || !todoFormData.companyId) { alert("会社名とやることは必須です"); return; }
    const cleaned = { ...todoFormData, deadline: convertToAD(todoFormData.deadline) };
    try {
      if (isEditingTodo && selectedTodo?.id) await updateDoc(doc(db, "todos", selectedTodo.id), cleaned);
      else await addDoc(collection(db, "todos"), { ...cleaned, createdAt: serverTimestamp(), completed: false });
      setShowTodoForm(false); fetchTodos();
    } catch (e) { alert("TODO保存エラー"); }
  };

  const handleCompleteTodo = async (todo: any) => {
    try {
      const company = companies.find(c => c.id === todo.companyId);
      if (!company) return;
      const completedEntry = { ...todo, completedAt: new Date().toLocaleDateString(), completedId: Date.now() };
      const updatedHistory = [...(company.completedTodos || []), completedEntry];
      await updateDoc(doc(db, "companies", company.id), { completedTodos: updatedHistory });
      await deleteDoc(doc(db, "todos", todo.id));
      fetchCompanies(); fetchTodos();
    } catch (e) { alert("完了処理エラー"); }
  };

  const handleDeleteCompletedTodo = async (todoId: number) => {
    if (!confirm("完了済みの履歴を削除しますか？")) return;
    try {
      const updatedHistory = currentCo.completedTodos.filter((t: any) => t.completedId !== todoId);
      await updateDoc(doc(db, "companies", currentCo.id), { completedTodos: updatedHistory });
      fetchCompanies();
    } catch (e) { alert("削除エラー"); }
  };

  // 保留処理
  const handleMoveToPending = async () => {
    if (!pendingMemo.trim()) { alert("保留にする理由を入力してください。"); return; }
    try {
      const company = selectedAlert.co;
      const pendingItem = {
        traineeId: selectedAlert.trainee.id,
        field: selectedAlert.fieldKey, // どの期限か (stayLimit or examDate)
        deadline: selectedAlert.deadline,
        memo: pendingMemo,
        movedAt: new Date().toLocaleDateString()
      };
      const updatedPending = [...(company.pendingAlerts || []), pendingItem];
      await updateDoc(doc(db, "companies", company.id), { pendingAlerts: updatedPending });
      setSelectedAlert(null);
      setPendingMemo("");
      fetchCompanies();
    } catch (e) { alert("保留エラー"); }
  };

  const handleCoCsvImport = async (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      const rows = text.split(/\r?\n(?=(?:(?:[^"]*"){2})*[^"]*$)/).filter(line => line.trim() !== "");
      if (rows.length < 2) return;
      const headers = rows[0].split(/[,\t]/).map(h => h.trim().replace(/^"|"$/g, ''));
      const csvToKeyMap: any = Object.entries(labelMapCo).reduce((acc, [key, label]) => { acc[label] = key; return acc; }, {} as any);
      let count = 0;
      for (let i = 1; i < rows.length; i++) {
        const values = rows[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.trim().replace(/^"|"$/g, ''));
        if (!values.some(v => v.trim() !== "")) continue;
        let coData: any = { ...initialCompanyForm, trainees: [], createdAt: serverTimestamp(), completedTodos: [], pendingAlerts: [] };
        headers.forEach((h, idx) => {
          const key = csvToKeyMap[h];
          if (key) {
            let val = values[idx] || "";
            val = val.replace(/\r?\n/g, " "); 
            if (key !== 'memo') val = convertToAD(val);
            coData[key] = val;
          }
        });
        if (coData.companyName) { await addDoc(collection(db, "companies"), coData); count++; }
      }
      alert(`${count}件の会社情報を取り込み完了`);
      setShowCoCsvModal(false); fetchCompanies();
    };
    reader.readAsText(file);
  };

  const handleDeleteCompany = async () => {
    if (!currentCo?.id) return;
    if (!confirm(`会社「${currentCo.companyName}」を削除しますか？`)) return;
    try { await deleteDoc(doc(db, "companies", currentCo.id)); setView('list'); setCurrentCo(null); fetchCompanies(); } catch (e) { alert("削除エラー"); }
  };

  const handleDeleteTrainee = async () => {
    if (!selectedTrId || !currentCo?.id) return;
    if (!confirm("この実習生の情報を完全に削除しますか？")) return;
    try {
      const updatedTrainees = currentCo.trainees.filter((t: any) => t.id !== selectedTrId);
      await updateDoc(doc(db, "companies", currentCo.id), { trainees: updatedTrainees });
      setSelectedTrId(null); fetchCompanies();
    } catch (e) { alert("削除エラー"); }
  };

  const handleSaveTrainee = async () => {
    const targetId = isEditingTr ? (trFormData.targetCompanyId || currentCo.id) : trFormData.targetCompanyId;
    if (!targetId) { alert("会社を選択してください"); return; }
    const cleanedData = { ...trFormData };
    Object.keys(cleanedData).forEach(key => { if (typeof cleanedData[key] === 'string' && key !== 'memo') cleanedData[key] = convertToAD(cleanedData[key]); });
    try {
      const targetCo = companies.find(c => c.id === targetId);
      let updatedTrainees = [...(targetCo.trainees || [])];
      if (isEditingTr && trFormData.id) {
        updatedTrainees = updatedTrainees.map((t: any) => {
          if (t.id === trFormData.id) {
            if (editingPhaseIdx !== null) {
              const newHistory = [...(t.phaseHistory || [])];
              newHistory[editingPhaseIdx] = { ...cleanedData };
              return { ...t, phaseHistory: newHistory };
            }
            return cleanedData;
          }
          return t;
        });
      } else {
        const { targetCompanyId, ...saveData } = cleanedData;
        updatedTrainees = [...updatedTrainees, { ...saveData, id: Date.now(), phaseHistory: [] }];
      }
      await updateDoc(doc(db, "companies", targetId), { trainees: updatedTrainees });
      setShowTrForm(false); fetchCompanies();
    } catch (e) { alert("保存エラー"); }
  };

  const handleCsvImport = async (companyId: string, file: File) => {
    if (!companyId) { alert("会社を選択してください"); return; }
    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      const lines = text.split(/\r?\n/).filter(line => line.trim() !== "");
      if (lines.length < 2) return;
      const newTrainees: any[] = [];
      const headers = lines[0].split(/[,\t]/).map(h => h.trim());
      const csvToKeyMap: any = { "バッチ(期生)": "batch", "ステータス": "status", "実習生氏名": "traineeName", "フリガナ": "kana", "郵便番号": "traineeZip", "住所": "traineeAddress", "国籍": "nationality", "生年月日": "birthday", "性別": "gender", "在留期限": "stayLimit", "在留カード番号": "cardNumber", "パスポート期限": "passportLimit", "パスポート番号": "passportNumber", "認定番号": "certificateNumber", "申請日": "applyDate", "認定年月日": "certDate", "実習開始日(入国日)": "entryDate", "配属日": "assignDate", "外国人雇用条件届出日": "employmentReportDate", "技能検定時期": "examDate" };
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(/[,\t]/);
        if (!values.some(v => v.trim() !== "")) continue;
        let trainee: any = { ...initialTraineeForm, id: Date.now() + i, category: "技能実習1号" };
        headers.forEach((h, idx) => {
          const key = csvToKeyMap[h];
          if (key) {
            let val = values[idx]?.trim() || "";
            if (!['traineeName', 'kana', 'traineeAddress', 'cardNumber', 'passportNumber', 'certificateNumber', 'memo'].includes(key)) val = convertToAD(val);
            trainee[key] = val;
          }
        });
        if (trainee.birthday) trainee.age = calculateAge(trainee.birthday);
        if (trainee.entryDate) { const { end, renew } = calculateDates(trainee.entryDate); trainee.endDate = end; trainee.renewStartDate = renew; }
        newTrainees.push(trainee);
      }
      try {
        const targetCo = companies.find(c => c.id === companyId);
        await updateDoc(doc(db, "companies", companyId), { trainees: [...(targetCo.trainees || []), ...newTrainees] });
        alert(`${newTrainees.length}名取り込み完了`); setShowCsvModal(false); fetchCompanies();
      } catch (err) { alert("エラー"); }
    };
    reader.readAsText(file);
  };

  if (!isLoggedIn) {
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: '#F9F9F9', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
        <div style={{ padding: '40px', background: '#fff', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', textAlign: 'center' }}>
          <h2 style={{ marginBottom: '20px', fontSize: '18px', color: '#2C3E50' }}>パスワードを入力してください</h2>
          <input type="password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} style={{ padding: '10px', width: '200px', borderRadius: '4px', border: '1px solid #ddd', marginBottom: '20px', textAlign: 'center', fontSize: '18px', color: '#000' }} onKeyDown={(e) => { if (e.key === 'Enter' && passwordInput === '4647') setIsLoggedIn(true); }} />
          <br /><button onClick={() => { if (passwordInput === '4647') setIsLoggedIn(true); else alert("パスワードが違います"); }} style={{ padding: '10px 30px', backgroundColor: '#F57C00', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>ログイン</button>
        </div>
      </div>
    );
  }

  // --- 印刷プレビュー (変更なしのため省略... 元のコードの通り) ---
  if ((view === 'print_tr' || view === 'print_co') && isPreview) {
    // ... 前回の回答と同じ内容 ...
  }

  // --- 印刷設定画面 (変更なしのため省略... 元のコードの通り) ---
  if ((view === 'print_tr' || view === 'print_co') && !isPreview) {
    // ... 前回の回答と同じ内容 ...
  }

  // --- トップ一覧画面 ---
  if (view === 'list') {
    const alertList: any[] = [];
    const pendingList: any[] = [];

    companies.forEach(c => {
      // 保留リストの構築
      (c.pendingAlerts || []).forEach((p: any) => {
        const trainee = (c.trainees || []).find((t: any) => t.id === p.traineeId);
        if (trainee) {
          pendingList.push({ co: c, trainee, field: labelMapTr[p.field], deadline: p.deadline, memo: p.memo, movedAt: p.movedAt });
        }
      });

      // 通常のアラートリスト（保留中のものは除外）
      (c.trainees || []).forEach((t: any) => {
        ["stayLimit", "examDate"].forEach(key => {
          // すでに保留済みかチェック
          const isPending = (c.pendingAlerts || []).some((p: any) => p.traineeId === t.id && p.field === key);
          if (isPending) return;

          const style = getAlertStyle(t[key], key, t.category);
          if (style.border && style.border !== 'none') {
            alertList.push({ co: c, trainee: t, fieldKey: key, companyName: c.companyName, traineeName: t.traineeName, field: labelMapTr[key], deadline: t[key], days: getRemainingDays(t[key]), style });
          }
        });
      });
    });

    return (
      <main style={{ padding: '40px', backgroundColor: '#F9F9F9', minHeight: '100vh', color: colors.text }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px', alignItems: 'flex-end' }}>
          <div><h1 style={{ fontSize: '24px', fontWeight: '800' }}>アシストねっと協同組合</h1><p style={{ fontSize: '12px', color: colors.gray, marginTop: '4px' }}>技能実習生管理システム</p></div>
          <div style={{ display: 'flex', gap: '30px', textAlign: 'right' }}>
            <div><div style={{ fontSize: '12px', color: colors.gray, marginBottom: '5px' }}>受入中事業主数</div><div style={{ fontSize: '24px', fontWeight: '800', color: colors.accent }}>{activeCompanyCount} <span style={{ fontSize: '14px', color: colors.text }}>社</span></div></div>
            <div><div style={{ fontSize: '12px', color: colors.gray, marginBottom: '5px' }}>組合全体受入人数</div><div style={{ fontSize: '24px', fontWeight: '800', color: colors.accent }}>{totalActiveTrainees} <span style={{ fontSize: '14px', color: colors.text }}>名</span></div></div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => { setIsPreview(false); setView('print_tr'); }} style={{ ...btnBase, backgroundColor: '#fff', border: `1px solid ${colors.border}` }}>実習生情報印刷</button>
            <button onClick={() => { setIsPreview(false); setView('print_co'); }} style={{ ...btnBase, backgroundColor: '#fff', border: `1px solid ${colors.border}` }}>会社情報印刷</button>
            <button onClick={() => setShowTrMethodModal(true)} style={{ ...btnBase, backgroundColor: colors.accent, color: '#fff' }}>＋ 新規実習生</button>
            <button onClick={() => setShowCoMethodModal(true)} style={{ ...btnBase, backgroundColor: colors.accent, color: '#fff' }}>＋ 新規実習実施者</button>
          </div>
        </header>

        {/* 期限注意リスト & 保留リスト (左右分割) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
          {/* 左：期限注意リスト */}
          <div style={{ backgroundColor: '#fff', borderRadius: '8px', padding: '20px', border: `1px solid ${colors.border}`, maxHeight: '350px', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '16px', marginBottom: '15px' }}>⚠️ 期限注意リスト</h3>
            {alertList.length === 0 ? <p style={{ fontSize: '13px', color: colors.gray }}>注意対象はいません。</p> : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead><tr style={{ textAlign: 'left', borderBottom: `1px solid ${colors.border}` }}><th style={{ padding: '8px' }}>会社名</th><th style={{ padding: '8px' }}>実習生名</th><th style={{ padding: '8px' }}>項目</th><th style={{ padding: '8px' }}>残り</th></tr></thead>
                <tbody>
                  {alertList.sort((a, b) => (a.days ?? 999) - (b.days ?? 999)).map((item, idx) => (
                    <tr key={idx} onClick={() => setSelectedAlert(item)} style={{ borderBottom: `1px solid #f9f9f9`, cursor: 'pointer', ...item.style }}>
                      <td style={{ padding: '8px' }}>{item.companyName}</td><td style={{ padding: '8px' }}>{item.traineeName}</td><td style={{ padding: '8px' }}>{item.field}</td><td style={{ padding: '8px', fontWeight: 'bold' }}>あと {item.days} 日</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          {/* 右：保留リスト */}
          <div style={{ backgroundColor: '#fff', borderRadius: '8px', padding: '20px', border: `1px solid ${colors.border}`, maxHeight: '350px', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '16px', marginBottom: '15px', color: colors.gray }}>⏸ 保留リスト</h3>
            {pendingList.length === 0 ? <p style={{ fontSize: '13px', color: colors.gray }}>保留中の項目はありません。</p> : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                <thead><tr style={{ textAlign: 'left', borderBottom: `1px solid ${colors.border}` }}><th style={{ padding: '8px' }}>会社/実習生</th><th style={{ padding: '8px' }}>項目/期限</th><th style={{ padding: '8px' }}>保留理由</th></tr></thead>
                <tbody>
                  {pendingList.map((item, idx) => (
                    <tr key={idx} onClick={() => { setCurrentCo(item.co); setSelectedTrId(item.trainee.id); setView('detail'); }} style={{ borderBottom: `1px solid #f9f9f9`, cursor: 'pointer' }}>
                      <td style={{ padding: '8px' }}><b>{item.co.companyName}</b><br/>{item.trainee.traineeName}</td>
                      <td style={{ padding: '8px' }}>{item.field}<br/>{item.deadline}</td>
                      <td style={{ padding: '8px', color: colors.info }}>{item.memo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* TODOリスト (3分割表示) */}
        <div style={{ backgroundColor: '#fff', borderRadius: '8px', padding: '25px', border: `1px solid ${colors.border}`, marginBottom: '40px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '18px' }}>📝 TODO管理</h3>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setShowAssigneeModal(true)} style={{ ...btnBase, backgroundColor: colors.info, color: '#fff' }}>担当者別に見る</button>
              <button onClick={() => { setTodoFormData(initialTodoForm); setIsEditingTodo(false); setShowTodoForm(true); }} style={{ ...btnBase, backgroundColor: colors.accent, color: '#fff' }}>＋ TODO登録</button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
            {todoCategoryOptions.map(cat => (
              <div key={cat} style={{ backgroundColor: '#FBFBFB', padding: '15px', borderRadius: '8px', border: `1px solid ${colors.border}` }}>
                <h4 style={{ fontSize: '14px', marginBottom: '15px', borderBottom: `2px solid ${colors.accent}`, paddingBottom: '5px' }}>【{cat}】</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {todos.filter(t => (t.todoCategory || "TODO") === cat).map(todo => {
                    const company = companies.find(c => c.id === todo.companyId);
                    const trainee = company?.trainees?.find((tr: any) => tr.id === Number(todo.traineeId));
                    const style = getAlertStyle(todo.deadline, 'deadline', '');
                    return (
                      <div key={todo.id} style={{ padding: '12px', backgroundColor: '#fff', border: `1px solid ${colors.border}`, borderRadius: '6px', cursor: 'pointer', ...style }} onClick={() => setSelectedTodo(todo)}>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                          <input type="checkbox" onChange={() => handleCompleteTodo(todo)} onClick={(e) => e.stopPropagation()} style={{ marginTop: '4px' }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: '800', fontSize: '15px', color: colors.text }}>{company?.companyName || "不明な会社"}</div>
                            <div style={{ fontSize: '12px', marginTop: '4px', fontWeight: 'bold' }}>{todo.task}</div>
                            <div style={{ fontSize: '11px', color: colors.gray, marginTop: '2px' }}>
                              {trainee ? trainee.traineeName : (todo.batch !== "なし" ? todo.batch : "")} 
                              {todo.deadline && ` | 期限: ${todo.deadline}`}
                              {todo.assignee && <span style={{ marginLeft: '8px', color: colors.info }}>[担当: {todo.assignee}]</span>}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 実施者一覧 (変更なし) */}
        <h3 style={{ fontSize: '16px', marginBottom: '15px' }}>🏢 実習実施者一覧</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '15px' }}>
          {companies.map(c => {
            const trs = c.trainees || [];
            const activeCount = trs.filter((t: any) => t.category !== "実習終了").length;
            const alertTrigger = trs.some((t: any) => hasAlert(t));
            return (
              <div key={c.id} onClick={() => { setCurrentCo(c); setView('detail'); setFilterBatch('すべて'); }} style={{ backgroundColor: '#fff', padding: '15px', borderRadius: sharpRadius, border: alertTrigger ? `2px solid ${colors.danger}` : `1px solid ${colors.border}`, cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '5px' }}>{c.companyName}</div>
                <div style={{ fontSize: '12px', color: colors.gray }}>受入中: <span style={{ fontWeight: '800', color: colors.accent }}>{activeCount}</span> 名</div>
              </div>
            );
          })}
        </div>

        {/* --- モーダル類 --- */}

        {/* 期限アラート詳細 & 保留登録モーダル */}
        {selectedAlert && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 3500, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ backgroundColor: '#FFF', padding: '30px', borderRadius: '8px', width: '450px' }}>
              <h3 style={{ marginBottom: '10px' }}>期限確認</h3>
              <div style={{ padding: '15px', background: '#f9f9f9', borderRadius: '6px', fontSize: '14px', marginBottom: '20px' }}>
                <b>会社：</b> {selectedAlert.companyName}<br/>
                <b>対象：</b> {selectedAlert.traineeName}<br/>
                <b>項目：</b> {selectedAlert.field}<br/>
                <b>期限：</b> {selectedAlert.deadline} (残り {selectedAlert.days} 日)
              </div>
              
              <div style={{ borderTop: `1px solid ${colors.border}`, paddingTop: '20px', marginTop: '20px' }}>
                <label style={{ fontSize: '12px', fontWeight: 'bold' }}>保留の理由（必須）</label>
                <textarea 
                  placeholder="保留にする理由をメモしてください" 
                  style={{ width: '100%', height: '80px', padding: '10px', marginTop: '5px', border: `1px solid ${colors.border}` }}
                  value={pendingMemo}
                  onChange={(e) => setPendingMemo(e.target.value)}
                />
                <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                  <button onClick={() => { setSelectedAlert(null); setPendingMemo(""); }} style={{ ...btnBase, backgroundColor: colors.lightGray, flex: 1 }}>閉じる</button>
                  <button onClick={handleMoveToPending} style={{ ...btnBase, backgroundColor: colors.info, color: '#fff', flex: 1.5 }}>この項目を保留リストへ</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TODO入力フォーム */}
        {showTodoForm && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 3000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ backgroundColor: '#FFF', padding: '30px', borderRadius: '8px', width: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
              <h3>TODO{isEditingTodo ? '編集' : '登録'}</h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '15px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 'bold' }}>分類</label>
                  <select style={{ width: '100%', padding: '8px' }} value={todoFormData.todoCategory} onChange={e => setTodoFormData({ ...todoFormData, todoCategory: e.target.value })}>
                    {todoCategoryOptions.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 'bold' }}>担当者</label>
                  <select style={{ width: '100%', padding: '8px' }} value={todoFormData.assignee} onChange={e => setTodoFormData({ ...todoFormData, assignee: e.target.value })}>
                    {assigneeOptions.map(o => <option key={o} value={o}>{o === "" ? "(空)" : o}</option>)}
                  </select>
                </div>
              </div>

              <label style={{ fontSize: '11px', display: 'block', marginTop: '15px' }}>会社名</label>
              <select style={{ width: '100%', padding: '8px', marginBottom: '10px' }} value={todoFormData.companyId} onChange={e => setTodoFormData({ ...todoFormData, companyId: e.target.value, traineeId: "" })}>
                <option value="">会社を選択</option>{companies.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
              </select>

              {todoFormData.companyId && (
                <>
                  <label style={{ fontSize: '11px', display: 'block' }}>対象（バッチまたは個人）</label>
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                    <select style={{ flex: 1, padding: '8px' }} value={todoFormData.batch} onChange={e => setTodoFormData({ ...todoFormData, batch: e.target.value, traineeId: "" })}>
                      <option value="なし">バッチで選択</option>{batchOptions.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                    <select style={{ flex: 1, padding: '8px' }} value={todoFormData.traineeId} onChange={e => setTodoFormData({ ...todoFormData, traineeId: e.target.value, batch: "なし" })}>
                      <option value="">個人で選択</option>
                      {companies.find(c => c.id === todoFormData.companyId)?.trainees?.map((t: any) => (
                        <option key={t.id} value={t.id}>{t.traineeName} ({t.batch})</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              <input type="text" placeholder="やること" style={{ width: '100%', padding: '8px', marginBottom: '10px' }} value={todoFormData.task} onChange={e => setTodoFormData({ ...todoFormData, task: e.target.value })} />
              <textarea placeholder="詳細メモ" style={{ width: '100%', padding: '8px', marginBottom: '10px', height: '80px' }} value={todoFormData.detail} onChange={e => setTodoFormData({ ...todoFormData, detail: e.target.value })} />
              <input type="text" placeholder="期限 (例: 2026/04/30)" style={{ width: '100%', padding: '8px', marginBottom: '20px' }} value={todoFormData.deadline} onChange={e => setTodoFormData({ ...todoFormData, deadline: e.target.value })} />
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button onClick={() => setShowTodoForm(false)} style={{ ...btnBase, backgroundColor: colors.lightGray }}>中止</button>
                <button onClick={handleSaveTodo} style={{ ...btnBase, backgroundColor: colors.accent, color: '#fff' }}>保存</button>
              </div>
            </div>
          </div>
        )}

        {/* 担当者別フィルタポップアップ */}
        {showAssigneeModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 4000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ backgroundColor: '#FFF', padding: '30px', borderRadius: '8px', width: '600px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ marginBottom: '20px' }}>担当者別TODO表示</h3>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                {["担当者無", "朝比奈", "政所"].map(name => (
                  <button 
                    key={name} 
                    onClick={() => setSelectedAssigneeFilter(name === "担当者無" ? "" : name)}
                    style={{ ...btnBase, backgroundColor: (selectedAssigneeFilter === (name === "担当者無" ? "" : name)) ? colors.info : colors.lightGray, color: (selectedAssigneeFilter === (name === "担当者無" ? "" : name)) ? '#fff' : '#000' }}
                  >
                    {name}
                  </button>
                ))}
              </div>
              <div style={{ flex: 1, overflowY: 'auto', border: `1px solid ${colors.border}`, padding: '15px', borderRadius: '6px' }}>
                {selectedAssigneeFilter !== null ? (
                  todos.filter(t => (t.assignee || "") === selectedAssigneeFilter).length === 0 ? (
                    <p>該当するTODOはありません。</p>
                  ) : (
                    todos.filter(t => (t.assignee || "") === selectedAssigneeFilter).map(todo => {
                      const company = companies.find(c => c.id === todo.companyId);
                      const trainee = company?.trainees?.find((tr: any) => tr.id === Number(todo.traineeId));
                      return (
                        <div key={todo.id} style={{ padding: '10px', borderBottom: `1px solid ${colors.border}`, fontSize: '13px' }}>
                          <span 
                            onClick={() => { setCurrentCo(company); setView('detail'); setShowAssigneeModal(false); }}
                            style={{ fontWeight: 'bold', color: colors.accent, cursor: 'pointer', textDecoration: 'underline' }}
                          >
                            {company?.companyName}
                          </span>
                          {" / "}
                          {trainee && (
                            <span 
                              onClick={() => { setCurrentCo(company); setSelectedTrId(trainee.id); setView('detail'); setShowAssigneeModal(false); }}
                              style={{ color: colors.info, cursor: 'pointer', textDecoration: 'underline' }}
                            >
                              {trainee.traineeName}
                            </span>
                          )}
                          <div style={{ fontWeight: 'bold', marginTop: '5px' }}>{todo.task}</div>
                          <div style={{ fontSize: '11px', color: colors.gray }}>期限: {todo.deadline || "なし"}</div>
                        </div>
                      );
                    })
                  )
                ) : <p>担当者を選択してください。</p>}
              </div>
              <button onClick={() => { setShowAssigneeModal(false); setSelectedAssigneeFilter(null); }} style={{ ...btnBase, marginTop: '20px', backgroundColor: colors.lightGray }}>閉じる</button>
            </div>
          </div>
        )}

        {/* TODO詳細ポップアップ (既存を修正) */}
        {selectedTodo && !showTodoForm && (
          <div onClick={() => setSelectedTodo(null)} style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.3)', zIndex: 2500, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div onClick={e => e.stopPropagation()} style={{ backgroundColor: '#FFF', padding: '30px', borderRadius: '8px', width: '400px' }}>
              <div onClick={() => { setCurrentCo(companies.find(c => c.id === selectedTodo.companyId)); setView('detail'); setSelectedTodo(null); }} style={{ fontSize: '15px', color: colors.accent, cursor: 'pointer', fontWeight: '800', textDecoration: 'underline', marginBottom: '5px' }}>{companies.find(c => c.id === selectedTodo.companyId)?.companyName}</div>
              <h3 style={{ marginBottom: '15px' }}>{selectedTodo.task}</h3>
              <div style={{ fontSize: '14px', background: '#f9f9f9', padding: '15px', borderRadius: '4px', marginBottom: '15px' }}>{selectedTodo.detail || '詳細なし'}</div>
              <div style={{ fontSize: '13px', display: 'flex', justifyContent: 'space-between' }}>
                <span>期限: <b>{selectedTodo.deadline || '未設定'}</b></span>
                {selectedTodo.assignee && <span style={{ color: colors.info }}>担当: {selectedTodo.assignee}</span>}
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button onClick={() => { setTodoFormData(selectedTodo); setIsEditingTodo(true); setShowTodoForm(true); setSelectedTodo(null); }} style={{ ...btnBase, flex: 1, backgroundColor: colors.info, color: '#fff' }}>編集</button>
                <button onClick={() => setSelectedTodo(null)} style={{ ...btnBase, flex: 1, backgroundColor: colors.lightGray }}>閉じる</button>
              </div>
            </div>
          </div>
        )}

        {/* その他の既存モーダル (省略...) */}
        {showTrMethodModal && (<div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}><div style={{ backgroundColor: '#FFF', padding: '30px', borderRadius: '8px', textAlign: 'center' }}><h3>登録方法選択</h3><div style={{ display: 'flex', gap: '15px', marginTop: '20px' }}><button onClick={() => { setShowTrMethodModal(false); setTrFormData(initialTraineeForm); setIsEditingTr(false); setShowTrForm(true); }} style={{ ...btnBase, backgroundColor: colors.accent, color: '#fff' }}>手入力</button><button onClick={() => { setShowTrMethodModal(false); setShowCsvModal(true); }} style={{ ...btnBase, backgroundColor: '#27ae60', color: '#fff' }}>CSV</button><button onClick={() => setShowTrMethodModal(false)} style={{ ...btnBase, backgroundColor: colors.lightGray }}>中止</button></div></div></div>)}
        {showCoMethodModal && (<div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}><div style={{ backgroundColor: '#FFF', padding: '30px', borderRadius: '8px', textAlign: 'center' }}><h3>登録方法選択</h3><div style={{ display: 'flex', gap: '15px', marginTop: '20px' }}><button onClick={() => { setShowCoMethodModal(false); setCoFormData(initialCompanyForm); setIsEditingCo(false); setShowCoForm(true); }} style={{ ...btnBase, backgroundColor: colors.accent, color: '#fff' }}>手入力</button><button onClick={() => { setShowCoMethodModal(false); setShowCoCsvModal(true); }} style={{ ...btnBase, backgroundColor: '#27ae60', color: '#fff' }}>CSV</button><button onClick={() => setShowCoMethodModal(false)} style={{ ...btnBase, backgroundColor: colors.lightGray }}>中止</button></div></div></div>)}
        {showCsvModal && (<div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}><div style={{ backgroundColor: '#FFF', padding: '30px', borderRadius: '8px', width: '400px' }}><h3>実習生CSV</h3><select id="csvCompany" style={{ width: '100%', padding: '8px', marginBottom: '15px' }}><option value="">会社選択</option>{companies.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}</select><input type="file" accept=".csv" onChange={(e) => { const file = e.target.files?.[0]; const coId = (document.getElementById('csvCompany') as HTMLSelectElement).value; if (file) handleCsvImport(coId, file); }} /><button onClick={() => setShowCsvModal(false)} style={{ ...btnBase, backgroundColor: colors.lightGray, width: '100%', marginTop: '15px' }}>閉じる</button></div></div>)}
        {showCoCsvModal && (<div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}><div style={{ backgroundColor: '#FFF', padding: '30px', borderRadius: '8px', width: '400px' }}><h3>実施者CSV</h3><input type="file" accept=".csv" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleCoCsvImport(file); }} /><button onClick={() => setShowCoCsvModal(false)} style={{ ...btnBase, backgroundColor: colors.lightGray, width: '100%', marginTop: '15px' }}>閉じる</button></div></div>)}
        {showCoForm && <CoFormModal coFormData={coFormData} setCoFormData={setCoFormData} handleSaveCompany={handleSaveCompany} setShowCoForm={setShowCoForm} colors={colors} btnBase={btnBase} copy={copy} grayCBtn={grayCBtn} />}
        {showTrForm && <TrFormModal trFormData={trFormData} setTrFormData={setTrFormData} handleSaveTrainee={handleSaveTrainee} setShowTrForm={setShowTrForm} colors={colors} btnBase={btnBase} isEditingTr={isEditingTr} companies={companies} editingPhaseIdx={editingPhaseIdx} />}
      </main>
    );
  }

  // --- 会社詳細画面 (変更なしのため省略...) ---
  if (view === 'detail') {
    // ... 前回の回答と同じ内容 ...
    // ※ ただし、完了したTODOを削除する際に pendingAlerts 等が消えないように Firestore の構造は守られます
    const currentTrainee = currentCo.trainees?.find((t: any) => t.id === selectedTrId);
    return (
      <main style={{ backgroundColor: '#FBFBFB', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <nav style={{ padding: '15px 30px', backgroundColor: '#FFF', borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '15px' }}><button onClick={() => { setView('list'); setSelectedTrId(null); }} style={{ background: 'none', border: 'none', color: colors.gray, cursor: 'pointer', fontWeight: 'bold' }}>← 戻る</button>{selectedTrId && <button onClick={() => setSelectedTrId(null)} style={{ background: 'none', border: 'none', color: colors.accent, cursor: 'pointer', fontWeight: 'bold' }}>/ {currentCo.companyName}</button>}</div>
          <div style={{ display: 'flex', gap: '10px' }}>
            {!selectedTrId ? (
              <><button onClick={() => { setIsEditingCo(true); setCoFormData(currentCo); setShowCoForm(true); }} style={{ ...btnBase, backgroundColor: colors.accent, color: '#fff' }}>編集</button><button onClick={handleDeleteCompany} style={{ ...btnBase, backgroundColor: '#FFF', border: `1px solid ${colors.danger}`, color: colors.danger }}>削除</button></>
            ) : (
              <><button onClick={() => { setTrFormData(activeTab === 'current' ? currentTrainee : currentTrainee.phaseHistory[activeTab as number]); setIsEditingTr(true); setEditingPhaseIdx(activeTab === 'current' ? null : (activeTab as number)); setShowTrForm(true); }} style={{ ...btnBase, backgroundColor: colors.accent, color: '#fff' }}>編集・区分変更</button><button onClick={handleDeleteTrainee} style={{ ...btnBase, border: `1px solid ${colors.danger}`, color: colors.danger }}>削除</button><button onClick={() => setSelectedTrId(null)} style={{ ...btnBase, backgroundColor: colors.lightGray }}>閉じる</button></>
            )}
          </div>
        </nav>
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', flex: 1, backgroundColor: colors.border, gap: '1px' }}>
          <aside style={{ backgroundColor: '#FFF', padding: '30px', overflowY: 'auto', maxHeight: 'calc(100vh - 65px)' }}>
            <h2 style={{ fontSize: '18px', marginBottom: '20px', borderBottom: `2px solid ${colors.main}`, paddingBottom: '10px' }}>{currentCo.companyName}</h2>
            {Object.keys(labelMapCo).map(k => { 
              if (k === 'memo') return null; 
              return (
                <div key={k} style={{ marginBottom: '14px', fontSize: '11px' }}>
                  <span style={{ color: colors.gray, display: 'block', marginBottom: '2px' }}>{labelMapCo[k]}</span>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontWeight: '600', fontSize: '13px' }}>{currentCo[k] || '-'}</div>
                    <button onClick={() => copy(currentCo[k])} style={grayCBtn}>C</button>
                  </div>
                </div>
              ); 
            })}
            <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: `1px solid ${colors.border}` }}><label style={{ fontSize: '11px', color: colors.gray }}>会社メモ</label><textarea value={currentCo.memo || ''} onChange={async (e) => { const m = e.target.value; setCurrentCo({ ...currentCo, memo: m }); await updateDoc(doc(db, "companies", currentCo.id), { memo: m }); }} style={{ width: '100%', height: '100px', padding: '10px', fontSize: '12px' }} /></div>
            <div style={{ marginTop: '30px', paddingTop: '20px', borderTop: `2px solid ${colors.main}` }}>
              <h4 style={{ fontSize: '13px', marginBottom: '10px' }}>✅ 完了したやること</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(currentCo.completedTodos || []).sort((a: any, b: any) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()).map((todo: any, idx: number) => (
                  <div key={idx} style={{ padding: '8px', fontSize: '12px', border: `1px solid ${colors.border}`, borderRadius: '4px', backgroundColor: '#fcfcfc', position: 'relative' }}>
                    <div onClick={() => setSelectedTodo(todo)} style={{ cursor: 'pointer' }}><div style={{ fontWeight: 'bold' }}>{todo.task}</div><div style={{ fontSize: '10px', color: colors.gray }}>完了: {todo.completedAt}</div></div>
                    <button onClick={() => handleDeleteCompletedTodo(todo.completedId)} style={{ position: 'absolute', top: '5px', right: '5px', background: 'none', border: 'none', color: colors.danger, fontSize: '10px' }}>×</button>
                  </div>
                ))}
              </div>
            </div>
          </aside>
          <section style={{ backgroundColor: '#FBFBFB', padding: '40px', overflowY: 'auto' }}>
            {!selectedTrId ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}><h3 style={{ fontSize: '14px', color: colors.gray }}>実習生一覧</h3>
                  <div style={{ display: 'flex', gap: '4px', backgroundColor: colors.lightGray, padding: '3px', borderRadius: '6px' }}>
                    <button onClick={() => setFilterBatch('すべて')} style={{ padding: '4px 10px', fontSize: '11px', border: 'none', borderRadius: '4px', backgroundColor: filterBatch === 'すべて' ? colors.white : 'transparent' }}>すべて</button>
                    {batchOptions.filter(b => b !== "なし" && (currentCo.trainees || []).some((t: any) => t.batch === b)).map(b => (<button key={b} onClick={() => setFilterBatch(b)} style={{ padding: '4px 10px', fontSize: '11px', border: 'none', borderRadius: '4px', backgroundColor: filterBatch === b ? colors.white : 'transparent' }}>{b}</button>))}
                  </div>
                </div>
                {categoryOptions.map(cat => {
                  const list = (currentCo.trainees || []).filter((t: any) => t.category === cat && (filterBatch === 'すべて' || t.batch === filterBatch));
                  if (list.length === 0) return null;
                  return (<div key={cat} style={{ marginBottom: '25px' }}><div style={{ fontSize: '11px', fontWeight: 'bold', color: colors.accent, marginBottom: '10px' }}>{cat}</div><div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>{list.map((t: any) => (<button key={t.id} onClick={() => { setSelectedTrId(t.id); setActiveTab('current'); }} style={{ padding: '12px 24px', backgroundColor: batchColorMap[t.batch] || "#FFF", border: hasAlert(t) ? `2px solid ${colors.danger}` : `1px solid ${colors.border}`, borderRadius: sharpRadius, fontWeight: 'bold' }}>{t.traineeName} {hasAlert(t) && "⚠️"}</button>))}</div></div>);
                })}
              </div>
            ) : (
              <div style={{ backgroundColor: '#FFF', padding: '35px', border: `1px solid ${colors.border}`, borderRadius: sharpRadius }}>
                <h3 style={{ fontSize: '20px', marginBottom: '20px' }}>{(activeTab === 'current' ? currentTrainee : currentTrainee.phaseHistory[activeTab as number]).traineeName}</h3>
                <div style={{ display: 'flex', gap: '2px', marginBottom: '25px' }}>
                  <button onClick={() => setActiveTab('current')} style={{ padding: '10px 20px', border: `1px solid ${activeTab === 'current' ? colors.accent : colors.border}`, borderBottom: activeTab === 'current' ? 'none' : `1px solid ${colors.border}`, background: activeTab === 'current' ? colors.white : colors.lightGray, fontWeight: 'bold', borderRadius: '4px 4px 0 0', position: 'relative', top: '1px', zIndex: 1 }}>最新</button>
                  {[...(currentTrainee.phaseHistory || [])].reverse().map((h, idx) => { const oIdx = currentTrainee.phaseHistory.length - 1 - idx; return <button key={idx} onClick={() => setActiveTab(oIdx)} style={{ padding: '10px 20px', border: `1px solid ${activeTab === oIdx ? colors.accent : colors.border}`, borderBottom: activeTab === oIdx ? 'none' : `1px solid ${colors.border}`, background: activeTab === oIdx ? colors.white : colors.lightGray, borderRadius: '4px 4px 0 0', position: 'relative', top: '1px' }}>{h.category}時</button>; })}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 50px', borderTop: `1px solid ${colors.border}`, paddingTop: '20px' }}>
                  {Object.keys(labelMapTr).map(k => {
                    if (k === 'memo') return null;
                    const data = activeTab === 'current' ? currentTrainee : currentTrainee.phaseHistory[activeTab as number];
                    const alertStyle = getAlertStyle(data[k], k, data.category);
                    return (<div key={k} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: alertStyle.border ? 'none' : `1px solid #F0F0F0`, padding: '12px 5px', fontSize: '14px', ...alertStyle }}><span style={{ color: colors.gray }}>{labelMapTr[k]}</span><div style={{ display: 'flex', alignItems: 'center' }}><span style={{ fontWeight: 'bold' }}>{data[k] || '-'}</span><button onClick={() => copy(data[k])} style={grayCBtn}>C</button></div></div>);
                  })}
                </div>
                <div style={{ marginTop: '40px', paddingTop: '20px', borderTop: `2px solid ${colors.main}` }}><label style={{ fontSize: '14px', fontWeight: 'bold', display: 'block', marginBottom: '10px' }}>個人メモ</label><textarea value={currentTrainee.memo || ''} onChange={async (e) => { const m = e.target.value; const trs = currentCo.trainees.map((t: any) => t.id === currentTrainee.id ? { ...t, memo: m } : t); setCurrentCo({ ...currentCo, trainees: trs }); await updateDoc(doc(db, "companies", currentCo.id), { trainees: trs }); }} style={{ width: '100%', height: '200px', padding: '15px', fontSize: '14px', border: `1px solid ${colors.border}`, borderRadius: '8px', backgroundColor: '#F0F9FF' }} /></div>
              </div>
            )}
          </section>
        </div>
        {showCoForm && <CoFormModal coFormData={coFormData} setCoFormData={setCoFormData} handleSaveCompany={handleSaveCompany} setShowCoForm={setShowCoForm} colors={colors} btnBase={btnBase} copy={copy} grayCBtn={grayCBtn} />}
        {showTrForm && <TrFormModal trFormData={trFormData} setTrFormData={setTrFormData} handleSaveTrainee={handleSaveTrainee} setShowTrForm={setShowTrForm} colors={colors} btnBase={btnBase} isEditingTr={isEditingTr} companies={companies} editingPhaseIdx={editingPhaseIdx} />}
      </main>
    );
  }
  return null;
}

// --- サブコンポーネント (CoFormModal, TrFormModal は既存通りだが担当者等のUIを必要に応じて追加) ---
function CoFormModal({ coFormData, setCoFormData, handleSaveCompany, setShowCoForm, colors, btnBase, copy, grayCBtn }: any) {
  const handleChange = (k: string, v: string) => setCoFormData({ ...coFormData, [k]: v });
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 3000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ backgroundColor: '#FFF', padding: '40px', borderRadius: '8px', width: '90%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto' }}>
        <h2>実施者情報入力</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          {Object.keys(labelMapCo).map(k => (
            <div key={k} style={{ gridColumn: k === 'memo' ? 'span 2' : 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label style={{ fontSize: '11px', fontWeight: 'bold' }}>{labelMapCo[k]}</label>
                {k !== 'memo' && <button onClick={() => copy(coFormData[k])} style={grayCBtn}>C</button>}
              </div>
              {k === 'memo' ? 
                <textarea value={coFormData[k] || ''} style={{ width: '100%', padding: '8px', border: '1px solid #CCC', height: '100px' }} onChange={e => handleChange(k, e.target.value)} /> 
                : <input type="text" value={coFormData[k] || ''} style={{ width: '100%', padding: '8px', border: '1px solid #CCC' }} onChange={e => handleChange(k, e.target.value)} />
              }
            </div>
          ))}
        </div>
        <div style={{ marginTop: '20px', textAlign: 'right' }}>
          <button onClick={() => setShowCoForm(false)} style={{ ...btnBase, backgroundColor: colors.lightGray, marginRight: '10px' }}>中止</button>
          <button onClick={handleSaveCompany} style={{ ...btnBase, backgroundColor: colors.accent, color: '#FFF' }}>保存</button>
        </div>
      </div>
    </div>
  );
}

function TrFormModal({ trFormData, setTrFormData, handleSaveTrainee, setShowTrForm, colors, btnBase, isEditingTr, companies, editingPhaseIdx }: any) {
  const handleChange = (k: string, v: string) => {
    let newData = { ...trFormData, [k]: v };
    if (k === 'birthday') newData.age = calculateAge(v);
    if (k === 'entryDate') { const { end, renew } = calculateDates(v); newData.endDate = end; newData.renewStartDate = renew; }
    if (k === 'category' && isEditingTr && editingPhaseIdx === null) { if (confirm("区分を変更しますか？")) { const arc = { ...trFormData }; delete arc.phaseHistory; newData.phaseHistory = [...(trFormData.phaseHistory || []), arc]; keysToClearOnNewPhase.forEach(key => { newData[key] = (key === "status") ? "選択する" : ""; }); } }
    setTrFormData(newData);
  };
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 3000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ backgroundColor: '#FFF', padding: '40px', borderRadius: '8px', width: '90%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto' }}>
        <h2>実習生情報入力</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          {!isEditingTr && (<div style={{ gridColumn: 'span 2' }}><label style={{ fontSize: '11px', fontWeight: 'bold' }}>配属会社</label><select style={{ width: '100%', padding: '8px', border: '1px solid #CCC' }} value={trFormData.targetCompanyId} onChange={e => handleChange('targetCompanyId', e.target.value)}><option value="">会社を選択</option>{companies.map((c: any) => <option key={c.id} value={c.id}>{c.companyName}</option>)}</select></div>)}
          {Object.keys(labelMapTr).map(k => (
            <div key={k} style={{ gridColumn: k === 'memo' ? 'span 2' : 'auto' }}>
              <label style={{ fontSize: '11px', fontWeight: 'bold' }}>{labelMapTr[k]}</label>
              {['status', 'category', 'batch', 'gender'].includes(k) ? (
                <select style={{ width: '100%', padding: '8px', border: '1px solid #CCC' }} value={trFormData[k]} onChange={e => handleChange(k, e.target.value)}>
                  {(k === 'status' ? statusOptions : k === 'category' ? categoryOptions : k === 'batch' ? batchOptions : ["男", "女"]).map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : k === 'memo' ? 
                <textarea value={trFormData[k] || ''} style={{ width: '100%', padding: '8px', border: '1px solid #CCC', height: '100px' }} onChange={e => handleChange(k, e.target.value)} /> 
                : <input type="text" value={trFormData[k] || ''} style={{ width: '100%', padding: '8px', border: '1px solid #CCC' }} onChange={e => handleChange(k, e.target.value)} />
              }
            </div>
          ))}
        </div>
        <div style={{ marginTop: '20px', textAlign: 'right' }}>
          <button onClick={() => setShowTrForm(false)} style={{ ...btnBase, backgroundColor: colors.lightGray, marginRight: '10px' }}>中止</button>
          <button onClick={handleSaveTrainee} style={{ ...btnBase, backgroundColor: colors.accent, color: '#FFF' }}>保存</button>
        </div>
      </div>
    </div>
  );
}