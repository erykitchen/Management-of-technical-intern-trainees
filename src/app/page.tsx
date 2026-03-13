"use client";
import { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, addDoc, getDocs, query, orderBy, doc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";

// --- 1. ラベル・選択肢・初期値定義 ---
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
  batch: "バッチ(期生)", status: "ステータス", traineeName: "実習生氏名", kana: "フリガナ", 
  traineeZip: "郵便番号", traineeAddress: "住所", 
  category: "区分", nationality: "国籍", birthday: "生年月日", age: "年齢", gender: "性別",
  period: "期間", stayLimit: "在留期限", cardNumber: "在留カード番号", passportLimit: "パスポート期限",
  passportNumber: "パスポート番号", certificateNumber: "認定番号", applyDate: "申請日",
  certDate: "認定年月日", entryDate: "実習開始日(入国日)", renewStartDate: "更新手続開始日",
  assignDate: "配属日", endDate: "実習終了日", moveDate: "配属移動日", returnDate: "帰国日",
  employmentReportDate: "外国人雇用条件届出日", trainingStartDate: "講習開始日", trainingEndDate: "講習終了日"
};

const categoryOptions = ["技能実習1号", "技能実習2号(1)", "技能実習2号(2)", "特定技能", "実習終了"];
const batchOptions = ["なし", "①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨", "⑩"];
const nationalityOptions = ["ベトナム", "中国", "インドネシア", "フィリピン", "ミャンマー", "カンボジア", "タイ", "その他（手入力）"];
const statusOptions = ["選択する", "認定申請準備中", "認定手続中", "ビザ申請中", "入国待機", "実習中", "一時帰国中", "その他"];
const acceptanceOptions = ["選択する", "受入中", "無し"];
const genderOptions = ["男", "女"];
const keysToClearOnNewPhase = ["status", "stayLimit", "cardNumber", "certificateNumber", "applyDate", "certDate", "entryDate", "endDate", "renewStartDate"];

const batchColorMap: { [key: string]: string } = {
  "①": "#E3F2FD", "②": "#FFFDE7", "③": "#FFEBEE", "④": "#F3E5F5", "⑤": "#E8F5E9", "なし": "#FFFFFF"
};

const initialCompanyForm = {
  ...Object.keys(labelMapCo).reduce((acc: any, key) => { acc[key] = ""; return acc; }, {}),
  investmentCount: "1口", investmentAmount: "10千円", acceptance: "選択する"
};

const initialTraineeForm = {
  targetCompanyId: "", batch: "なし", status: "選択する", traineeName: "", kana: "", 
  traineeZip: "", traineeAddress: "", category: "技能実習1号", nationality: "ベトナム",
  birthday: "", age: "", gender: "男", period: "1年", stayLimit: "", 
  cardNumber: "", passportLimit: "", passportNumber: "", certificateNumber: "",
  applyDate: "", certDate: "", entryDate: "", renewStartDate: "", assignDate: "",
  endDate: "", moveDate: "", returnDate: "", employmentReportDate: "",
  trainingStartDate: "", trainingEndDate: "", memo: "", phaseHistory: []
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
    }
  }
  const adMatch = text.match(/^(\d{4})[.\/-](\d{1,2})[.\/-](\d{1,2})$/);
  if (adMatch) return `${adMatch[1]}/${adMatch[2].padStart(2, '0')}/${adMatch[3].padStart(2, '0')}`;
  return text;
};

const checkAlert = (dateStr: string, category: string) => {
  if (!dateStr || category === "実習終了") return false;
  const target = new Date(convertToAD(dateStr).replace(/\//g, '-'));
  if (isNaN(target.getTime())) return false;
  const today = new Date();
  const limit = new Date();
  limit.setMonth(today.getMonth() + 1);
  return target <= limit; 
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
  const [view, setView] = useState<'list' | 'detail'>('list');
  const [showTrForm, setShowTrForm] = useState(false);
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

  const colors = { main: '#FFF9F0', accent: '#F57C00', text: '#2C3E50', gray: '#95A5A6', lightGray: '#F2F2F2', border: '#E0E0E0', white: '#FFFFFF', danger: '#E74C3C' };
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

  useEffect(() => { fetchCompanies(); }, []);
  const copy = (text: string) => { if (text) navigator.clipboard.writeText(text); };

  const handleSaveCompany = async () => {
    if (!coFormData.companyName) { alert("会社名は必須です"); return; }
    const cleanedData = { ...coFormData };
    Object.keys(cleanedData).forEach(key => {
      if (typeof cleanedData[key] === 'string' && key !== 'memo') cleanedData[key] = convertToAD(cleanedData[key]);
    });
    try {
      if (isEditingCo && currentCo?.id) {
        await updateDoc(doc(db, "companies", currentCo.id), cleanedData);
      } else {
        await addDoc(collection(db, "companies"), { ...cleanedData, trainees: [], createdAt: serverTimestamp() });
      }
      setShowCoForm(false);
      fetchCompanies();
    } catch (e) { alert("保存エラー"); }
  };

  const handleDeleteCompany = async () => {
    if (!currentCo?.id) return;
    if (!confirm(`会社「${currentCo.companyName}」を削除しますか？`)) return;
    if (!confirm(`本当によろしいですか？所属する実習生もすべて削除されます。この操作は取り消せません。`)) return;
    try {
      await deleteDoc(doc(db, "companies", currentCo.id));
      setView('list');
      setCurrentCo(null);
      fetchCompanies();
    } catch (e) { alert("削除エラー"); }
  };

  const handleDeleteTrainee = async () => {
    if (!selectedTrId || !currentCo?.id) return;
    if (!confirm("この実習生の情報を完全に削除しますか？")) return;
    try {
      const updatedTrainees = currentCo.trainees.filter((t: any) => t.id !== selectedTrId);
      await updateDoc(doc(db, "companies", currentCo.id), { trainees: updatedTrainees });
      setSelectedTrId(null);
      fetchCompanies();
    } catch (e) { alert("削除エラー"); }
  };

  const handleSaveTrainee = async () => {
    const targetId = isEditingTr ? (trFormData.targetCompanyId || currentCo.id) : trFormData.targetCompanyId;
    if (!targetId) { alert("会社を選択してください"); return; }
    const cleanedData = { ...trFormData };
    Object.keys(cleanedData).forEach(key => {
      if (typeof cleanedData[key] === 'string' && key !== 'memo') cleanedData[key] = convertToAD(cleanedData[key]);
    });
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
      setShowTrForm(false);
      fetchCompanies();
    } catch (e) { alert("保存エラー"); }
  };

  const handleUndoPhaseChange = async (traineeId: number) => {
    const trainee = currentCo.trainees.find((t: any) => t.id === traineeId);
    if (!trainee || !trainee.phaseHistory || trainee.phaseHistory.length === 0) return;
    if (!confirm("直前の区分変更を取り消し、一つ前の状態に戻しますか？")) return;
    try {
      const newHistory = [...trainee.phaseHistory];
      const previousData = newHistory.pop();
      const updatedTrainees = currentCo.trainees.map((t: any) => {
        if (t.id === traineeId) return { ...previousData, phaseHistory: newHistory, id: t.id };
        return t;
      });
      await updateDoc(doc(db, "companies", currentCo.id), { trainees: updatedTrainees });
      setActiveTab('current');
      fetchCompanies();
    } catch (e) { alert("取り消し失敗"); }
  };

  const totalActiveTrainees = companies.reduce((sum, c) => 
    sum + (c.trainees || []).filter((t: any) => t.category !== "実習終了").length, 0
  );

  if (view === 'list') {
    return (
      <main style={{ padding: '40px', backgroundColor: '#F9F9F9', minHeight: '100vh', color: colors.text }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '40px', alignItems: 'flex-end' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '800', letterSpacing: '0.05em' }}>アシストねっと協同組合</h1>
            <p style={{ fontSize: '12px', color: colors.gray, marginTop: '4px' }}>技能実習生管理システム</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '12px', color: colors.gray, marginBottom: '5px' }}>組合全体受入人数</div>
            <div style={{ fontSize: '24px', fontWeight: '800', color: colors.accent }}>{totalActiveTrainees} <span style={{ fontSize: '14px', color: colors.text }}>名</span></div>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={() => { setTrFormData(initialTraineeForm); setIsEditingTr(false); setShowTrForm(true); }} style={{ ...btnBase, backgroundColor: colors.accent, color: '#fff' }}>＋ 新規実習生</button>
            <button onClick={() => { setIsEditingCo(false); setCoFormData(initialCompanyForm); setShowCoForm(true); }} style={{ ...btnBase, backgroundColor: colors.accent, color: '#fff' }}>＋ 新規実習実施者</button>
          </div>
        </header>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '25px' }}>
          {companies.map(c => {
            const trs = c.trainees || [];
            const activeCount = trs.filter((t: any) => t.category !== "実習終了").length;
            const hasAlert = trs.some((t: any) => checkAlert(t.stayLimit, t.category) || checkAlert(t.passportLimit, t.category));
            return (
              <div key={c.id} onClick={() => { setCurrentCo(c); setView('detail'); setFilterBatch('すべて'); }} style={{ backgroundColor: '#fff', padding: '24px', borderRadius: sharpRadius, border: hasAlert ? `2px solid ${colors.danger}` : `1px solid ${colors.border}`, cursor: 'pointer', position: 'relative', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                <div style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '10px' }}>{c.companyName}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', color: colors.gray }}>受入人数</span>
                  <span style={{ fontSize: '18px', fontWeight: '800', color: colors.accent }}>{activeCount} <span style={{ fontSize: '12px', color: colors.text }}>名</span></span>
                </div>
                {hasAlert && <div style={{ position: 'absolute', top: '-10px', right: '10px', backgroundColor: colors.danger, color: '#fff', fontSize: '10px', padding: '2px 8px', borderRadius: '10px' }}>期限注意</div>}
              </div>
            );
          })}
        </div>
        {showCoForm && <CoFormModal coFormData={coFormData} setCoFormData={setCoFormData} handleSaveCompany={handleSaveCompany} setShowCoForm={setShowCoForm} colors={colors} btnBase={btnBase} isEditing={isEditingCo} />}
        {showTrForm && <TrFormModal trFormData={trFormData} setTrFormData={setTrFormData} handleSaveTrainee={handleSaveTrainee} setShowTrForm={setShowTrForm} colors={colors} btnBase={btnBase} isEditingTr={isEditingTr} companies={companies} editingPhaseIdx={editingPhaseIdx} />}
      </main>
    );
  }

  const currentTrainee = currentCo.trainees?.find((t: any) => t.id === selectedTrId);

  return (
    <main style={{ backgroundColor: '#FBFBFB', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <nav style={{ padding: '15px 30px', backgroundColor: '#FFF', borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button onClick={() => { setView('list'); setSelectedTrId(null); }} style={{ background: 'none', border: 'none', color: colors.gray, cursor: 'pointer', fontWeight: 'bold' }}>← 一覧に戻る</button>
          {selectedTrId && (
             <button onClick={() => setSelectedTrId(null)} style={{ background: 'none', border: 'none', color: colors.accent, cursor: 'pointer', fontWeight: 'bold', fontSize: '16px' }}>/ {currentCo.companyName}</button>
          )}
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {!selectedTrId ? (
            <>
              <button onClick={() => { setTrFormData({...initialTraineeForm, targetCompanyId: currentCo.id}); setIsEditingTr(false); setShowTrForm(true); }} style={{ ...btnBase, backgroundColor: colors.accent, color: '#fff' }}>＋ 実習生追加</button>
              <button onClick={() => { setIsEditingCo(true); setCoFormData(currentCo); setShowCoForm(true); }} style={{ ...btnBase, backgroundColor: colors.accent, color: '#fff' }}>会社編集</button>
              <button onClick={handleDeleteCompany} style={{ ...btnBase, backgroundColor: '#FFF', border: `1px solid ${colors.danger}`, color: colors.danger }}>会社削除</button>
            </>
          ) : (
            <>
              <button onClick={() => { setTrFormData(activeTab === 'current' ? currentTrainee : currentTrainee.phaseHistory[activeTab as number]); setIsEditingTr(true); setEditingPhaseIdx(activeTab === 'current' ? null : (activeTab as number)); setShowTrForm(true); }} style={{ ...btnBase, backgroundColor: colors.accent, color: '#fff' }}>編集・区分変更</button>
              <button onClick={handleDeleteTrainee} style={{ ...btnBase, backgroundColor: '#FFF', border: `1px solid ${colors.danger}`, color: colors.danger }}>実習生情報を削除</button>
              <button onClick={() => setSelectedTrId(null)} style={{ ...btnBase, backgroundColor: colors.lightGray }}>閉じる</button>
            </>
          )}
        </div>
      </nav>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', flex: 1, backgroundColor: colors.border, gap: '1px' }}>
        <aside style={{ backgroundColor: '#FFF', padding: '30px', overflowY: 'auto', maxHeight: 'calc(100vh - 65px)' }}>
          {/* ★会社名クリックでGoogle検索 */}
          <h2 style={{ fontSize: '18px', marginBottom: '20px', borderBottom: `2px solid ${colors.main}`, paddingBottom: '10px' }}>
            <a 
              href={`https://www.google.com/search?q=${encodeURIComponent(currentCo.companyName)}`} 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ color: colors.text, textDecoration: 'underline', cursor: 'pointer' }}
            >
              {currentCo.companyName} <span style={{fontSize: '14px', textDecoration: 'none', display: 'inline-block'}}>🔗</span>
            </a>
          </h2>
          {Object.keys(labelMapCo).map(k => (
            <div key={k} style={{ marginBottom: '14px', fontSize: '11px' }}>
              <span style={{ color: colors.gray, display: 'block', marginBottom: '2px' }}>{labelMapCo[k]}</span>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ fontWeight: '600', fontSize: '13px' }}>{currentCo[k] || '-'}</span>
                <button onClick={() => copy(currentCo[k])} style={grayCBtn}>C</button>
              </div>
            </div>
          ))}
        </aside>

        <section style={{ backgroundColor: '#FBFBFB', padding: '40px', overflowY: 'auto' }}>
          {!selectedTrId ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <h3 style={{ fontSize: '14px', color: colors.gray }}>実習生一覧</h3>
                  <div style={{ display: 'flex', gap: '4px', backgroundColor: colors.lightGray, padding: '3px', borderRadius: '6px' }}>
                    <button onClick={() => setFilterBatch('すべて')} style={{ padding: '4px 10px', fontSize: '11px', border: 'none', borderRadius: '4px', cursor: 'pointer', backgroundColor: filterBatch === 'すべて' ? colors.white : 'transparent', color: filterBatch === 'すべて' ? colors.accent : colors.gray, fontWeight: filterBatch === 'すべて' ? 'bold' : 'normal', boxShadow: filterBatch === 'すべて' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>すべて</button>
                    {/* ★実際に存在するバッチのみ、かつ「なし」以外を表示 */}
                    {batchOptions.filter(b => b !== "なし" && (currentCo.trainees || []).some((t: any) => t.batch === b)).map(b => (
                      <button key={b} onClick={() => setFilterBatch(b)} style={{ 
                        padding: '4px 10px', fontSize: '11px', border: 'none', borderRadius: '4px', cursor: 'pointer',
                        backgroundColor: filterBatch === b ? colors.white : 'transparent',
                        color: filterBatch === b ? colors.accent : colors.gray,
                        fontWeight: filterBatch === b ? 'bold' : 'normal',
                        boxShadow: filterBatch === b ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                      }}>
                        {b}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              {categoryOptions.map(cat => {
                const list = (currentCo.trainees || []).filter((t: any) => {
                  const matchCat = t.category === cat;
                  const matchBatch = filterBatch === 'すべて' || t.batch === filterBatch;
                  return matchCat && matchBatch;
                });
                if (list.length === 0) return null;
                return (
                  <div key={cat} style={{ marginBottom: '25px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 'bold', color: cat === "実習終了" ? '#CCC' : colors.accent, marginBottom: '10px' }}>{cat}</div>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                      {list.map((t: any) => {
                        const isAlert = checkAlert(t.stayLimit, t.category) || checkAlert(t.passportLimit, t.category);
                        const bgColor = batchColorMap[t.batch] || "#FFFFFF";
                        return (
                          <button key={t.id} onClick={() => { setSelectedTrId(t.id); setActiveTab('current'); }} style={{ padding: '12px 24px', backgroundColor: bgColor, border: isAlert ? `2px solid ${colors.danger}` : `1px solid ${colors.border}`, borderRadius: sharpRadius, cursor: 'pointer', fontWeight: 'bold', color: cat === "実習終了" ? '#999' : colors.text, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {t.batch && t.batch !== "なし" && <span style={{ fontSize: '10px', backgroundColor: 'rgba(0,0,0,0.05)', padding: '2px 4px', borderRadius: '2px' }}>{t.batch}</span>}
                            {t.traineeName} {isAlert && "⚠️"}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ backgroundColor: '#FFF', padding: '35px', border: `1px solid ${colors.border}`, borderRadius: sharpRadius, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '25px' }}>
                <h3 style={{ fontSize: '20px' }}>{(activeTab === 'current' ? currentTrainee : currentTrainee.phaseHistory[activeTab as number]).traineeName}</h3>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  {/* ★区分変更取消ボタンを小さく、目立たなく */}
                  {activeTab === 'current' && currentTrainee.phaseHistory?.length > 0 && (
                    <button onClick={() => handleUndoPhaseChange(currentTrainee.id)} style={{ padding: '4px 10px', fontSize: '10px', backgroundColor: 'transparent', border: `1px solid ${colors.border}`, color: colors.gray, borderRadius: '4px', cursor: 'pointer' }}>区分変更取消</button>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '5px', marginBottom: '25px', borderBottom: `1px solid ${colors.border}` }}>
                <button onClick={() => setActiveTab('current')} style={{ padding: '10px 25px', border: 'none', background: activeTab === 'current' ? colors.main : 'none', color: colors.accent, fontWeight: 'bold', cursor: 'pointer' }}>最新データ</button>
                {[...(currentTrainee.phaseHistory || [])].reverse().map((h, idx) => {
                  const originalIdx = currentTrainee.phaseHistory.length - 1 - idx;
                  return <button key={idx} onClick={() => setActiveTab(originalIdx)} style={{ padding: '10px 25px', border: 'none', background: activeTab === originalIdx ? '#EEE' : 'none', color: '#999', cursor: 'pointer' }}>{h.category}時</button>;
                })}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 50px' }}>
                {Object.keys(labelMapTr).map(k => {
                  const data = activeTab === 'current' ? currentTrainee : currentTrainee.phaseHistory[activeTab as number];
                  const isAlertField = (k === 'stayLimit' || k === 'passportLimit') && checkAlert(data[k], data.category);
                  return (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `1px solid #F8F8F8`, padding: '10px 0', fontSize: '14px' }}>
                      <span style={{ color: colors.gray }}>{labelMapTr[k]}</span>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span style={{ fontWeight: 'bold', color: isAlertField ? colors.danger : colors.text }}>
                          {data[k] || '-'} {isAlertField && "⚠️"}
                        </span>
                        <button onClick={() => copy(data[k])} style={grayCBtn}>C</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      </div>
      {showCoForm && <CoFormModal coFormData={coFormData} setCoFormData={setCoFormData} handleSaveCompany={handleSaveCompany} setShowCoForm={setShowCoForm} colors={colors} btnBase={btnBase} isEditing={isEditingCo} />}
      {showTrForm && <TrFormModal trFormData={trFormData} setTrFormData={setTrFormData} handleSaveTrainee={handleSaveTrainee} setShowTrForm={setShowTrForm} colors={colors} btnBase={btnBase} isEditingTr={isEditingTr} companies={companies} editingPhaseIdx={editingPhaseIdx} currentCoId={currentCo?.id} />}
    </main>
  );
}

// モーダル部分は変更なしのため省略（前のコードと同様に使用可能です）