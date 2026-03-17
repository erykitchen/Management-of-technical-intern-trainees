"use client";
import { useState, useEffect } from 'react';
import { db } from './firebase';
import { 
  collection, addDoc, getDocs, query, orderBy, doc, updateDoc, deleteDoc, serverTimestamp 
} from "firebase/firestore";

// --- 1. 型定義 ---
interface Trainee {
  id: number;
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

interface Company {
  id: string;
  companyName: string;
  settlement: string;
  representative: string;
  jobType: string;
  zipCode: string;
  address: string;
  tel: string;
  joinedDate: string;
  employeeCount: string;
  acceptance: string;
  investmentCount: string;
  investmentAmount: string;
  investmentPayDate: string;
  corporateNumber: string;
  laborInsurance: string;
  employmentInsurance: string;
  implementationNumber: string;
  acceptanceDate: string;
  industryCategory: string;
  officeZip: string;
  officeAddress: string;
  responsiblePerson: string;
  instructor: string;
  lifeInstructor: string;
  planInstructor: string;
  memo: string;
  trainees: Trainee[];
  createdAt: any;
}

// --- 2. ラベル・定数定義 ---
const labelMapCo: { [key: string]: string } = {
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

const labelMapTr: { [key: string]: string } = {
  batch: "期生", status: "ステータス", traineeName: "氏名", kana: "フリガナ", 
  traineeZip: "郵便番号", traineeAddress: "住所", 
  category: "区分", nationality: "国籍", birthday: "生年月日", age: "年齢", gender: "性別",
  period: "期間", stayLimit: "在留期限", cardNumber: "在留カード番号", passportLimit: "パスポート期限",
  passportNumber: "パスポート番号", certificateNumber: "認定番号", applyDate: "申請日",
  certDate: "認定日", entryDate: "入国日", renewStartDate: "更新手続開始日",
  assignDate: "配属日", endDate: "実習終了日", moveDate: "配属移動日", returnDate: "帰国日",
  employmentReportDate: "雇用条件届出日", trainingStartDate: "講習開始日", trainingEndDate: "講習終了日",
  memo: "備考（メモ）"
};

const categoryOptions = ["技能実習1号", "技能実習2号(1)", "技能実習2号(2)", "特定技能", "実習終了"];
const batchOptions = ["なし", "①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨", "⑩"];
const statusOptions = ["選択する", "認定申請準備中", "認定手続中", "ビザ申請中", "入国待機", "入国後講習中", "実習中", "一時帰国中", "その他", "失踪"];
const batchColorMap: { [key: string]: string } = { "①": "#E3F2FD", "②": "#FFFDE7", "③": "#FFEBEE", "④": "#F3E5F5", "⑤": "#E8F5E9", "なし": "#FFFFFF" };
const keysToClearOnNewPhase = ["status", "stayLimit", "cardNumber", "certificateNumber", "applyDate", "certDate", "entryDate", "endDate", "renewStartDate"];

const initialCompanyForm = { ...Object.keys(labelMapCo).reduce((acc: any, key) => { acc[key] = ""; return acc; }, {}), investmentCount: "1口", investmentAmount: "10千円", acceptance: "選択する" };
const initialTraineeForm = { targetCompanyId: "", batch: "なし", status: "選択する", traineeName: "", kana: "", traineeZip: "", traineeAddress: "", category: "技能実習1号", nationality: "ベトナム", birthday: "", age: "", gender: "男", period: "1年", stayLimit: "", cardNumber: "", passportLimit: "", passportNumber: "", certificateNumber: "", applyDate: "", certDate: "", entryDate: "", renewStartDate: "", assignDate: "", endDate: "", moveDate: "", returnDate: "", employmentReportDate: "", trainingStartDate: "", trainingEndDate: "", memo: "", phaseHistory: [] };

// --- 3. 便利関数 ---
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
    }
  }
  const adMatch = text.match(/^(\d{4})[.\/-](\d{1,2})[.\/-](\d{1,2})$/);
  if (adMatch) return `${adMatch[1]}/${adMatch[2].padStart(2, '0')}/${adMatch[3].padStart(2, '0')}`;
  return text;
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
  const nextYear = new Date(date); nextYear.setFullYear(nextYear.getFullYear() + 1);
  const endDate = new Date(nextYear); endDate.setDate(nextYear.getDate() - 1);
  const renewDate = new Date(endDate); renewDate.setMonth(renewDate.getMonth() - 3);
  const fmt = (d: Date) => `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
  return { end: fmt(endDate), renew: fmt(renewDate) };
};

const getAlertStyle = (dateStr: string, category: string): any => {
  if (!dateStr || category === "実習終了") return { border: '1px solid #E0E0E0' };
  const ad = convertToAD(dateStr);
  const target = new Date(ad.replace(/\//g, '-'));
  if (isNaN(target.getTime())) return { border: '1px solid #E0E0E0' };
  const diffDays = Math.ceil((target.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays <= 30) return { border: '4px double #FFD700', outline: '2px solid #E74C3C', outlineOffset: '-4px', backgroundColor: '#FFF5F5' };
  else if (diffDays <= 90) return { border: '2px solid #FFD700', backgroundColor: '#FFFFF0' };
  return { border: '1px solid #E0E0E0' };
};

const hasAlert = (t: any) => [t.stayLimit, t.passportLimit, t.endDate].some(d => {
  const s = getAlertStyle(d, t.category); return s.border && s.border !== '1px solid #E0E0E0';
});

// --- 4. メインコンポーネント ---
export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [view, setView] = useState<'list' | 'detail' | 'print_tr' | 'print_co'>('list');
  const [showTrForm, setShowTrForm] = useState(false);
  const [showCoForm, setShowCoForm] = useState(false);
  const [isEditingTr, setIsEditingTr] = useState(false);
  const [isEditingCo, setIsEditingCo] = useState(false);
  const [editingPhaseIdx, setEditingPhaseIdx] = useState<number | null>(null);
  const [currentCo, setCurrentCo] = useState<Company | null>(null);
  const [selectedTrId, setSelectedTrId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'current' | number>('current');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [trFormData, setTrFormData] = useState<any>(initialTraineeForm);
  const [coFormData, setCoFormData] = useState<any>(initialCompanyForm);

  // 印刷用ステート
  const [printCoId, setPrintCoId] = useState("");
  const [printTrIds, setPrintTrIds] = useState<number[]>([]);
  const [printFields, setPrintFields] = useState<string[]>([]);
  const [printMode, setPrintMode] = useState<'individual' | 'table'>('individual');
  const [isPreview, setIsPreview] = useState(false);

  const colors = { main: '#FFF9F0', accent: '#F57C00', text: '#2C3E50', gray: '#95A5A6', border: '#E0E0E0', danger: '#E74C3C' };
  const btnBase = { padding: '10px 18px', borderRadius: '4px', border: 'none', cursor: 'pointer', fontWeight: '600' as const, fontSize: '13px' };
  const grayCBtn = { width: '20px', height: '20px', fontSize: '9px', cursor: 'pointer', backgroundColor: 'transparent', border: `1px solid ${colors.border}`, borderRadius: '3px', color: colors.gray, marginLeft: '6px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' };

  useEffect(() => { if (isAuthenticated) fetchCompanies(); }, [isAuthenticated]);

  const fetchCompanies = async () => {
    try {
      const q = query(collection(db, "companies"), orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Company));
      setCompanies(data);
      if (currentCo) {
        const updated = data.find(c => c.id === currentCo.id);
        setCurrentCo(updated || null);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const handleLogin = () => {
    if (password === "4647") setIsAuthenticated(true);
    else alert("パスワードが正しくありません");
  };

  const copy = (text: string) => { if (text) navigator.clipboard.writeText(text); };

  // --- DB操作ロジック ---
  const handleSaveCompany = async () => {
    const cleanedData = { ...coFormData };
    Object.keys(cleanedData).forEach(key => {
      if (typeof cleanedData[key] === 'string' && key !== 'memo') {
        cleanedData[key] = convertToAD(cleanedData[key]);
      }
    });
    try {
      if (isEditingCo && currentCo?.id) {
        await updateDoc(doc(db, "companies", currentCo.id), cleanedData);
      } else {
        await addDoc(collection(db, "companies"), { ...cleanedData, trainees: [], createdAt: serverTimestamp() });
      }
      setShowCoForm(false);
      fetchCompanies();
    } catch (error) {
      console.error("Error saving company:", error);
    }
  };

  const handleDeleteCompany = async () => {
    if (!currentCo?.id || !confirm(`会社「${currentCo.companyName}」を削除しますか？`)) return;
    try {
      await deleteDoc(doc(db, "companies", currentCo.id));
      setView('list');
      setCurrentCo(null);
      fetchCompanies();
    } catch (error) {
      console.error("Error deleting company:", error);
    }
  };

  const handleSaveTrainee = async () => {
    const targetId = isEditingTr ? (trFormData.targetCompanyId || currentCo?.id) : trFormData.targetCompanyId;
    if (!targetId) return;

    const cleanedData = { ...trFormData };
    Object.keys(cleanedData).forEach(key => {
      if (typeof cleanedData[key] === 'string' && key !== 'memo') {
        cleanedData[key] = convertToAD(cleanedData[key]);
      }
    });

    const targetCo = companies.find(c => c.id === targetId);
    if (!targetCo) return;

    let updatedTrainees = [...(targetCo.trainees || [])];

    if (isEditingTr && trFormData.id) {
      updatedTrainees = updatedTrainees.map((t) => {
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

    try {
      await updateDoc(doc(db, "companies", targetId), { trainees: updatedTrainees });
      setShowTrForm(false);
      fetchCompanies();
    } catch (error) {
      console.error("Error saving trainee:", error);
    }
  };

  const handleDeleteTrainee = async () => {
    if (!selectedTrId || !currentCo?.id || !confirm("実習生を削除しますか？")) return;
    const updatedTrainees = currentCo.trainees.filter(t => t.id !== selectedTrId);
    try {
      await updateDoc(doc(db, "companies", currentCo.id), { trainees: updatedTrainees });
      setSelectedTrId(null);
      fetchCompanies();
    } catch (error) {
      console.error("Error deleting trainee:", error);
    }
  };

  // --- 計算ロジック（トップページ表示用） ---
  const activeTraineesCount = companies.reduce((sum, c) => sum + (c.trainees || []).filter(t => t.category !== "実習終了").length, 0);
  const activeCompaniesCount = companies.filter(c => (c.trainees || []).some(t => t.category !== "実習終了")).length;

  // ==========================================
  // VIEW: ログイン画面
  // ==========================================
  if (!isAuthenticated) {
    return (
      <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f0f0' }}>
        <div style={{ padding: '40px', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', textAlign: 'center' }}>
          <h2 style={{ marginBottom: '20px', color: colors.text }}>管理システム ログイン</h2>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleLogin()} placeholder="パスワードを入力" style={{ padding: '12px', marginBottom: '20px', width: '250px', display: 'block', margin: '0 auto 20px', border: '1px solid #ccc', borderRadius: '4px' }} />
          <button onClick={handleLogin} style={{ ...btnBase, backgroundColor: colors.accent, color: '#fff', width: '100%' }}>ログイン</button>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW: 印刷プレビュー画面 (A4ぴったり設定)
  // ==========================================
  if ((view === 'print_tr' || view === 'print_co') && isPreview) {
    const selectedCompany = companies.find(c => c.id === printCoId);
    const selectedTrainees = selectedCompany?.trainees.filter(t => printTrIds.includes(t.id)) || [];
    
    return (
      <div style={{ backgroundColor: '#fff', minHeight: '100vh', color: '#000' }}>
        <style>{`
          @media print { 
            .no-print { display: none !important; } 
            body { margin: 0; background: #fff; } 
            @page { margin: 8mm; size: ${printMode === 'table' ? 'A4 landscape' : 'A4 portrait'}; } 
          }
          .p-container { page-break-after: always; padding: 0; margin-bottom: 20px; }
          .p-table { border-collapse: collapse; width: 100%; border: 1.5px solid #000; }
          .p-table th, .p-table td { border: 1px solid #000; padding: 4px 8px; font-size: 11px; text-align: left; line-height: 1.2; }
          .p-table th { background-color: #f2f2f2; width: 30%; }
          .l-table { border-collapse: collapse; width: 100%; table-layout: auto; }
          .l-table th, .l-table td { border: 1px solid #000; padding: 3px 5px; font-size: 10px; text-align: left; word-break: break-all; }
          .l-table th { background-color: #f2f2f2; }
        `}</style>
        
        <div className="no-print" style={{ padding: '20px', background: '#eee', display: 'flex', gap: '10px', alignItems: 'center', borderBottom: '1px solid #ccc' }}>
          <button onClick={() => setIsPreview(false)} style={{...btnBase, backgroundColor: '#95A5A6', color: '#fff'}}>設定に戻る</button>
          <button onClick={() => window.print()} style={{ ...btnBase, backgroundColor: colors.accent, color: '#fff' }}>印刷を実行</button>
          <span style={{ fontSize: '11px', fontWeight: 'bold' }}>※印刷設定ダイアログで「ヘッダーとフッター」のチェックを外して印刷してください。</span>
        </div>
        
        <div style={{ padding: '10mm' }}>
          <h2 style={{ textAlign: 'center', textDecoration: 'underline', marginBottom: '15px', fontSize: '16px' }}>
            {view === 'print_tr' ? (printMode === 'individual' ? '技能実習生管理簿' : '実習生一覧表') : '実習実施者情報詳細'}
          </h2>
          
          {view === 'print_tr' && printMode === 'individual' ? (
            selectedTrainees.map(t => (
              <div key={t.id} className="p-container">
                <div style={{ textAlign: 'right', fontSize: '10px', marginBottom: '4px' }}>所属企業: {selectedCompany?.companyName}</div>
                <table className="p-table">
                  <tbody>
                    {printFields.map(k => (
                      <tr key={k}><th>{labelMapTr[k]}</th><td>{(t as any)[k] || '-'}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))
          ) : view === 'print_tr' && printMode === 'table' ? (
            <table className="l-table">
              <thead>
                <tr>{printFields.map(k => <th key={k}>{labelMapTr[k]}</th>)}</tr>
              </thead>
              <tbody>
                {selectedTrainees.map(t => (
                  <tr key={t.id}>{printFields.map(k => <td key={k}>{(t as any)[k] || '-'}</td>)}</tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="p-table">
              <tbody>
                {printFields.map(k => (
                  <tr key={k}><th>{labelMapCo[k]}</th><td>{(selectedCompany as any)?.[k] || '-'}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW: 一覧画面（トップページ）
  // ==========================================
  if (view === 'list') {
    return (
      <main style={{ padding: '40px', backgroundColor: '#F9F9F9', minHeight: '100vh', color: colors.text }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '40px', alignItems: 'flex-end' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '800', margin: 0 }}>アシストねっと協同組合</h1>
            <p style={{ fontSize: '12px', color: colors.gray, margin: '5px 0 0 0' }}>技能実習生管理システム</p>
          </div>
          
          <div style={{ display: 'flex', gap: '40px', alignItems: 'center' }}>
            {/* 追加要望：現在受入中事業主数 */}
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '12px', color: colors.gray, marginBottom: '4px', fontWeight: 'bold' }}>現在受入中事業主数</div>
              <div style={{ fontSize: '28px', fontWeight: '900', color: colors.accent, lineHeight: '1' }}>
                {activeCompaniesCount} <span style={{ fontSize: '14px', color: colors.text, fontWeight: 'normal' }}>件</span>
              </div>
            </div>
            {/* 組合全体受入人数 */}
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '12px', color: colors.gray, marginBottom: '4px', fontWeight: 'bold' }}>組合全体受入人数</div>
              <div style={{ fontSize: '28px', fontWeight: '900', color: colors.accent, lineHeight: '1' }}>
                {activeTraineesCount} <span style={{ fontSize: '14px', color: colors.text, fontWeight: 'normal' }}>名</span>
              </div>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => { setView('print_tr'); setPrintFields([]); setIsPreview(false); }} style={{ ...btnBase, backgroundColor: '#fff', border: `1px solid ${colors.border}`, color: colors.text }}>🖨️ 印刷設定</button>
            <button onClick={() => { setIsEditingCo(false); setCoFormData(initialCompanyForm); setShowCoForm(true); }} style={{ ...btnBase, backgroundColor: colors.accent, color: '#fff' }}>＋ 新規会社登録</button>
          </div>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {companies.map(c => (
            <div key={c.id} onClick={() => { setCurrentCo(c); setView('detail'); setSelectedTrId(null); }} style={{ padding: '24px', backgroundColor: '#fff', border: `1px solid ${colors.border}`, cursor: 'pointer', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', transition: 'transform 0.1s' }} onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
              <div style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '12px' }}>{c.companyName}</div>
              <div style={{ fontSize: '13px', color: colors.gray }}>
                受入中: {(c.trainees || []).filter(t => t.category !== "実習終了").length} 名
                <span style={{ fontSize: '11px', marginLeft: '10px' }}>(全履歴: {(c.trainees || []).length}名)</span>
              </div>
            </div>
          ))}
        </div>
        
        {showCoForm && <CoFormModal formData={coFormData} setFormData={setCoFormData} onSave={handleSaveCompany} onClose={() => setShowCoForm(false)} colors={colors} btnBase={btnBase} labels={labelMapCo} />}
      </main>
    );
  }

  // ==========================================
  // VIEW: 印刷設定画面
  // ==========================================
  if ((view === 'print_tr' || view === 'print_co') && !isPreview) {
    const labels = view === 'print_tr' ? labelMapTr : labelMapCo;
    const selCo = companies.find(c => c.id === printCoId);
    
    return (
      <main style={{ padding: '40px', backgroundColor: '#F9F9F9', minHeight: '100vh', color: colors.text }}>
        <button onClick={() => setView('list')} style={{ background: 'none', border: 'none', fontWeight: 'bold', cursor: 'pointer', color: colors.gray, marginBottom: '20px' }}>← トップへ戻る</button>
        <h2 style={{ margin: '0 0 30px 0' }}>印刷設定 ({view === 'print_tr' ? '実習生' : '会社'})</h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
          <div style={{ background: '#fff', padding: '24px', border: `1px solid ${colors.border}`, borderRadius: '8px' }}>
            <h3 style={{ marginTop: 0, fontSize: '16px' }}>1. 対象を選択</h3>
            <select style={{ width: '100%', padding: '10px', margin: '15px 0', border: '1px solid #ccc', borderRadius: '4px' }} value={printCoId} onChange={e => { setPrintCoId(e.target.value); setPrintTrIds([]); }}>
              <option value="">対象の会社を選択してください</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
            </select>
            
            {view === 'print_tr' && selCo && (
              <div style={{ maxHeight: '250px', overflowY: 'auto', border: '1px solid #eee', padding: '10px', borderRadius: '4px' }}>
                <div style={{ fontSize: '12px', color: colors.gray, marginBottom: '10px' }}>印刷する実習生を選択（複数可）</div>
                {selCo.trainees?.map(t => (
                  <label key={t.id} style={{ display: 'block', padding: '8px 5px', borderBottom: '1px solid #f5f5f5', cursor: 'pointer' }}>
                    <input type="checkbox" checked={printTrIds.includes(t.id)} onChange={e => e.target.checked ? setPrintTrIds([...printTrIds, t.id]) : setPrintTrIds(printTrIds.filter(id => id !== t.id))} style={{ marginRight: '8px' }}/> 
                    {t.traineeName} <span style={{fontSize: '11px', color: colors.gray}}>({t.batch})</span>
                  </label>
                ))}
              </div>
            )}
          </div>
          
          <div style={{ background: '#fff', padding: '24px', border: `1px solid ${colors.border}`, borderRadius: '8px' }}>
            <h3 style={{ marginTop: 0, fontSize: '16px' }}>2. 印刷項目を選択</h3>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginBottom: '10px' }}>
              <button onClick={() => setPrintFields(Object.keys(labels))} style={{ fontSize: '11px', padding: '4px 8px', cursor: 'pointer' }}>全選択</button>
              <button onClick={() => setPrintFields([])} style={{ fontSize: '11px', padding: '4px 8px', cursor: 'pointer' }}>全解除</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px', maxHeight: '300px', overflowY: 'auto', padding: '10px', border: '1px solid #eee' }}>
              {Object.keys(labels).map(k => (
                <label key={k} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                  <input type="checkbox" checked={printFields.includes(k)} onChange={e => e.target.checked ? setPrintFields([...printFields, k]) : setPrintFields(printFields.filter(f => f !== k))} style={{ marginRight: '6px' }}/> 
                  {labels[k]}
                </label>
              ))}
            </div>
          </div>

          {view === 'print_tr' && (
            <div style={{ gridColumn: 'span 2', background: '#fff', padding: '24px', border: `1px solid ${colors.border}`, borderRadius: '8px' }}>
              <h3 style={{ marginTop: 0, fontSize: '16px' }}>3. レイアウト設定</h3>
              <div style={{ display: 'flex', gap: '40px', marginTop: '15px' }}>
                <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                  <input type="radio" checked={printMode === 'individual'} onChange={() => setPrintMode('individual')} style={{ marginRight: '8px' }}/> 
                  <strong>管理簿形式</strong>（1人1枚・A4縦・詳細表示）
                </label>
                <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                  <input type="radio" checked={printMode === 'table'} onChange={() => setPrintMode('table')} style={{ marginRight: '8px' }}/> 
                  <strong>一覧表形式</strong>（複数名まとめ・A4横）
                </label>
              </div>
            </div>
          )}
        </div>
        
        <div style={{ textAlign: 'center', marginTop: '40px' }}>
          <button 
            disabled={!printCoId || printFields.length === 0 || (view === 'print_tr' && printTrIds.length === 0)} 
            onClick={() => setIsPreview(true)} 
            style={{ ...btnBase, backgroundColor: colors.accent, color: '#fff', padding: '15px 60px', fontSize: '16px', opacity: (!printCoId || printFields.length === 0) ? 0.5 : 1 }}
          >
            プレビューを表示
          </button>
        </div>
      </main>
    );
  }

  // ==========================================
  // VIEW: 詳細画面（2カラムレイアウト）
  // ==========================================
  const selTr = currentCo?.trainees?.find(t => t.id === selectedTrId);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', minHeight: '100vh', backgroundColor: '#FBFBFB', color: colors.text }}>
      
      {/* 左サイドバー: 会社情報 */}
      <aside style={{ background: '#fff', borderRight: `1px solid ${colors.border}`, padding: '24px', overflowY: 'auto', height: '100vh', position: 'sticky', top: 0 }}>
        <button onClick={() => setView('list')} style={{ background: 'none', border: 'none', color: colors.gray, fontWeight: 'bold', cursor: 'pointer', padding: 0, marginBottom: '24px' }}>← 一覧に戻る</button>
        
        <h2 style={{ fontSize: '18px', marginBottom: '24px', lineHeight: '1.4' }}>{currentCo?.companyName}</h2>
        
        <div style={{ display: 'flex', gap: '10px', marginBottom: '30px' }}>
          <button onClick={() => { setCoFormData(currentCo); setIsEditingCo(true); setShowCoForm(true); }} style={{ ...btnBase, flex: 1, backgroundColor: '#F2F2F2', color: colors.text, border: '1px solid #ccc' }}>編集</button>
          <button onClick={handleDeleteCompany} style={{ ...btnBase, backgroundColor: 'transparent', color: colors.danger, border: `1px solid ${colors.danger}` }}>削除</button>
        </div>

        {Object.keys(labelMapCo).map(k => (
          <div key={k} style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '11px', color: colors.gray, marginBottom: '2px' }}>{labelMapCo[k]}</div>
            <div style={{ fontSize: '14px', fontWeight: '600', display: 'flex', alignItems: 'center' }}>
              {(currentCo as any)?.[k] || '-'} 
              <button onClick={() => copy((currentCo as any)?.[k])} style={grayCBtn} title="コピー">C</button>
            </div>
          </div>
        ))}
      </aside>
      
      {/* 右メイン: 実習生一覧＆詳細 */}
      <main style={{ padding: '40px', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <h2 style={{ margin: 0, fontSize: '20px' }}>所属実習生</h2>
          <button onClick={() => { setTrFormData({ ...initialTraineeForm, targetCompanyId: currentCo?.id }); setIsEditingTr(false); setShowTrForm(true); }} style={{ ...btnBase, backgroundColor: colors.accent, color: '#fff' }}>
            ＋ 実習生を追加
          </button>
        </div>

        {/* 実習生タブ（バッジ） */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '40px' }}>
          {(currentCo?.trainees || []).map(t => (
            <button 
              key={t.id} 
              onClick={() => { setSelectedTrId(t.id); setActiveTab('current'); }} 
              style={{ padding: '12px 20px', borderRadius: '6px', border: selectedTrId === t.id ? `2px solid ${colors.accent}` : `1px solid ${colors.border}`, background: selectedTrId === t.id ? '#FFF' : (batchColorMap[t.batch] || '#fff'), fontWeight: 'bold', cursor: 'pointer', boxShadow: selectedTrId === t.id ? '0 2px 8px rgba(245, 124, 0, 0.2)' : 'none' }}
            >
              {t.traineeName} <span style={{ fontSize: '11px', fontWeight: 'normal', color: colors.gray }}>({t.category})</span> {hasAlert(t) && '⚠️'}
            </button>
          ))}
          {(currentCo?.trainees?.length === 0) && <p style={{ color: colors.gray, fontSize: '14px' }}>登録されている実習生はいません。</p>}
        </div>

        {/* 実習生詳細パネル */}
        {selTr && (
          <div style={{ background: '#fff', padding: '30px', border: `1px solid ${colors.border}`, borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <h3 style={{ margin: '0 0 5px 0', fontSize: '22px' }}>{selTr.traineeName}</h3>
                <div style={{ fontSize: '13px', color: colors.gray }}>{selTr.kana}</div>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => { setTrFormData(activeTab === 'current' ? selTr : selTr.phaseHistory[activeTab as number]); setIsEditingTr(true); setEditingPhaseIdx(activeTab === 'current' ? null : (activeTab as number)); setShowTrForm(true); }} style={{ ...btnBase, backgroundColor: colors.accent, color: '#fff' }}>
                  情報を編集・区分変更
                </button>
                <button onClick={handleDeleteTrainee} style={{ ...btnBase, color: colors.danger, border: `1px solid ${colors.danger}`, background: '#fff' }}>削除</button>
              </div>
            </div>

            {/* 履歴タブ */}
            <div style={{ display: 'flex', gap: '8px', margin: '20px 0 30px 0', borderBottom: `2px solid ${colors.border}`, paddingBottom: '10px' }}>
              <button onClick={() => setActiveTab('current')} style={{ padding: '8px 16px', borderRadius: '20px', background: activeTab === 'current' ? colors.text : '#f5f5f5', color: activeTab === 'current' ? '#fff' : colors.text, border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>
                最新情報 ({selTr.category})
              </button>
              {(selTr.phaseHistory || []).map((h: any, i: number) => (
                <button key={i} onClick={() => setActiveTab(i)} style={{ padding: '8px 16px', borderRadius: '20px', background: activeTab === i ? colors.text : '#f5f5f5', color: activeTab === i ? '#fff' : colors.text, border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>
                  過去履歴 ({h.category})
                </button>
              ))}
            </div>

            {/* 詳細データグリッド */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px 40px' }}>
              {Object.keys(labelMapTr).map(k => {
                const data = activeTab === 'current' ? selTr : selTr.phaseHistory[activeTab as number];
                // アラート対象の項目かどうか
                const alertStyle = ['stayLimit', 'passportLimit', 'endDate'].includes(k) && activeTab === 'current' ? getAlertStyle((data as any)[k], data.category) : {};
                
                return (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f0f0f0', padding: '8px 0' }}>
                    <span style={{ color: colors.gray, fontSize: '13px', minWidth: '120px' }}>{labelMapTr[k]}</span>
                    <span style={{ fontWeight: 'bold', fontSize: '14px', display: 'flex', alignItems: 'center', ...alertStyle, padding: alertStyle.border !== '1px solid #E0E0E0' ? '2px 6px' : '0', borderRadius: '4px' }}>
                      {(data as any)[k] || '-'} 
                      <button onClick={() => copy((data as any)[k])} style={grayCBtn}>C</button>
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </main>

      {/* モーダル群 */}
      {showCoForm && <CoFormModal formData={coFormData} setFormData={setCoFormData} onSave={handleSaveCompany} onClose={() => setShowCoForm(false)} colors={colors} btnBase={btnBase} labels={labelMapCo} />}
      {showTrForm && <TrFormModal formData={trFormData} setFormData={setTrFormData} onSave={handleSaveTrainee} onClose={() => setShowTrForm(false)} colors={colors} btnBase={btnBase} labels={labelMapTr} isEditing={isEditingTr} editIdx={editingPhaseIdx} />}
    </div>
  );
}

// ==========================================
// コンポーネント: 会社入力モーダル
// ==========================================
function CoFormModal({ formData, setFormData, onSave, onClose, colors, btnBase, labels }: any) {
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
      <div style={{ background: '#fff', padding: '40px', width: '90%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto', borderRadius: '8px' }}>
        <h2 style={{ marginTop: 0, marginBottom: '20px', borderBottom: `2px solid ${colors.accent}`, paddingBottom: '10px' }}>実習実施者(会社)情報</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {Object.keys(labels).map(k => (
            <div key={k} style={{ gridColumn: k === 'memo' ? 'span 2' : 'auto' }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold', color: colors.gray, display: 'block', marginBottom: '4px' }}>{labels[k]}</label>
              {k === 'memo' ? (
                <textarea style={{ width: '100%', padding: '10px', border: '1px solid #CCC', borderRadius: '4px', minHeight: '80px', boxSizing: 'border-box' }} value={formData[k] || ''} onChange={e => setFormData({ ...formData, [k]: e.target.value })} />
              ) : (
                <input type="text" style={{ width: '100%', padding: '10px', border: '1px solid #CCC', borderRadius: '4px', boxSizing: 'border-box' }} value={formData[k] || ''} onChange={e => setFormData({ ...formData, [k]: e.target.value })} />
              )}
            </div>
          ))}
        </div>
        <div style={{ marginTop: '30px', textAlign: 'right', position: 'sticky', bottom: 0, background: '#fff', paddingTop: '20px', borderTop: '1px solid #eee' }}>
          <button onClick={onClose} style={{ ...btnBase, backgroundColor: '#f5f5f5', color: colors.text, border: '1px solid #ccc' }}>キャンセル</button>
          <button onClick={onSave} style={{ ...btnBase, background: colors.accent, color: '#fff', marginLeft: '15px', padding: '10px 40px' }}>保存する</button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// コンポーネント: 実習生入力モーダル
// ==========================================
function TrFormModal({ formData, setFormData, onSave, onClose, colors, btnBase, labels, isEditing, editIdx }: any) {
  const handleChange = (k: string, v: string) => {
    let nd = { ...formData, [k]: v };
    // 生年月日から年齢自動計算
    if (k === 'birthday') nd.age = calculateAge(v);
    // 入国日から終了日・更新日自動計算
    if (k === 'entryDate') { 
      const { end, renew } = calculateDates(v); 
      nd.endDate = end; 
      nd.renewStartDate = renew; 
    }
    // 区分変更時の履歴自動保存ロジック
    if (k === 'category' && isEditing && editIdx === null) {
      if (confirm("区分を変更しますか？現在のデータは履歴に保存され、一部の項目がリセットされます。")) {
        const arch = { ...formData }; 
        delete arch.phaseHistory;
        nd.phaseHistory = [...(formData.phaseHistory || []), arch];
        keysToClearOnNewPhase.forEach(key => { nd[key] = (key === 'status' ? '選択する' : ''); });
      } else {
        return; // キャンセルした場合は変更を反映しない
      }
    }
    setFormData(nd);
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
      <div style={{ background: '#fff', padding: '40px', width: '90%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto', borderRadius: '8px' }}>
        <h2 style={{ marginTop: 0, marginBottom: '20px', borderBottom: `2px solid ${colors.accent}`, paddingBottom: '10px' }}>技能実習生情報</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {Object.keys(labels).map(k => (
            <div key={k} style={{ gridColumn: k === 'memo' ? 'span 2' : 'auto' }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold', color: colors.gray, display: 'block', marginBottom: '4px' }}>{labels[k]}</label>
              {['status', 'category', 'batch', 'gender'].includes(k) ? (
                <select style={{ width: '100%', padding: '10px', border: '1px solid #CCC', borderRadius: '4px', boxSizing: 'border-box' }} value={formData[k]} onChange={e => handleChange(k, e.target.value)}>
                  {(k === 'status' ? statusOptions : k === 'category' ? categoryOptions : k === 'batch' ? batchOptions : ["男", "女"]).map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : k === 'memo' ? (
                <textarea style={{ width: '100%', padding: '10px', border: '1px solid #CCC', borderRadius: '4px', minHeight: '80px', boxSizing: 'border-box' }} value={formData[k] || ''} onChange={e => handleChange(k, e.target.value)} />
              ) : (
                <input type="text" style={{ width: '100%', padding: '10px', border: '1px solid #CCC', borderRadius: '4px', boxSizing: 'border-box' }} value={formData[k] || ''} onChange={e => handleChange(k, e.target.value)} />
              )}
            </div>
          ))}
        </div>
        <div style={{ marginTop: '30px', textAlign: 'right', position: 'sticky', bottom: 0, background: '#fff', paddingTop: '20px', borderTop: '1px solid #eee' }}>
          <button onClick={onClose} style={{ ...btnBase, backgroundColor: '#f5f5f5', color: colors.text, border: '1px solid #ccc' }}>キャンセル</button>
          <button onClick={onSave} style={{ ...btnBase, background: colors.accent, color: '#fff', marginLeft: '15px', padding: '10px 40px' }}>保存する</button>
        </div>
      </div>
    </div>
  );
}