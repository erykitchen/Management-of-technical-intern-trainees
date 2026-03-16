"use client";
import { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, addDoc, getDocs, query, orderBy, doc, updateDoc, serverTimestamp } from "firebase/firestore";

// --- 1. 定義・ラベル ---
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
  period: "1年", stayLimit: "在留期限", cardNumber: "在留カード番号", passportLimit: "パスポート期限",
  passportNumber: "パスポート番号", certificateNumber: "認定番号", applyDate: "申請日",
  certDate: "認定年月日", entryDate: "実習開始日(入国日)", renewStartDate: "更新手続開始日",
  assignDate: "配属日", endDate: "実習終了日", moveDate: "配属移動日", returnDate: "帰国日",
  employmentReportDate: "外国人雇用条件届出日", trainingStartDate: "講習開始日", trainingEndDate: "講習終了日"
};

const batchColorMap: { [key: string]: string } = { "①": "#E3F2FD", "②": "#FFFDE7", "③": "#FFEBEE", "④": "#F3E5F5", "⑤": "#E8F5E9", "なし": "#FFFFFF" };

const initialCompanyForm = { ...Object.keys(labelMapCo).reduce((acc: any, key) => { acc[key] = ""; return acc; }, {}), investmentCount: "1口", investmentAmount: "10千円", acceptance: "選択する" };
const initialTraineeForm = { targetCompanyId: "", batch: "なし", status: "選択する", traineeName: "", kana: "", traineeZip: "", traineeAddress: "", category: "技能実習1号", nationality: "ベトナム", birthday: "", age: "", gender: "男", period: "1年", stayLimit: "", cardNumber: "", passportLimit: "", passportNumber: "", certificateNumber: "", applyDate: "", certDate: "", entryDate: "", renewStartDate: "", assignDate: "", endDate: "", moveDate: "", returnDate: "", employmentReportDate: "", trainingStartDate: "", trainingEndDate: "", memo: "", phaseHistory: [] };

const convertToAD = (str: string) => {
  if (!str || typeof str !== 'string') return str;
  let text = str.trim().replace(/[０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0));
  const eras: { [key: string]: number } = { '令和': 2018, '平成': 1988, '昭和': 1925, 'R': 2018, 'H': 1988, 'S': 1925 };
  for (let era in eras) { if (text.startsWith(era)) { const match = text.match(new RegExp(`${era}\\s*(\\d+)[年.\\/-]?(\\d+)[月.\\/-]?(\\d+)日?`)); if (match) { const year = parseInt(match[1]) + eras[era]; return `${year}/${match[2].padStart(2, '0')}/${match[3].padStart(2, '0')}`; } } }
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

// --- 2. メインコンポーネント ---
export default function Home() {
 // 印刷用の型を追加します
const [view, setView] = useState<'list' | 'detail' | 'print_tr' | 'print_co'>('list');
  const [showTrForm, setShowTrForm] = useState(false);
  const [showCoForm, setShowCoForm] = useState(false);
  const [isEditingTr, setIsEditingTr] = useState(false);
  const [isEditingCo, setIsEditingCo] = useState(false);
  const [currentCo, setCurrentCo] = useState<any>(null);
  const [selectedTrId, setSelectedTrId] = useState<number | null>(null);
  const [companies, setCompanies] = useState<any[]>([]);
  const [trFormData, setTrFormData] = useState<any>(initialTraineeForm);
  const [coFormData, setCoFormData] = useState<any>(initialCompanyForm);

  const [printCoId, setPrintCoId] = useState("");
  const [printTrIds, setPrintTrIds] = useState<number[]>([]);
  const [printFields, setPrintFields] = useState<string[]>([]);
  const [isPreview, setIsPreview] = useState(false);

  const colors = { main: '#FFF9F0', accent: '#F57C00', text: '#2C3E50', gray: '#95A5A6', lightGray: '#F2F2F2', border: '#E0E0E0', white: '#FFFFFF' };
  const btnBase = { padding: '10px 18px', borderRadius: '4px', border: 'none', cursor: 'pointer', fontWeight: '600' as const, fontSize: '13px' };

  useEffect(() => { fetchCompanies(); }, []);
  const fetchCompanies = async () => {
    const q = query(collection(db, "companies"), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setCompanies(data);
    if (currentCo) setCurrentCo(data.find(c => c.id === currentCo.id) || null);
  };

  const handleSaveCompany = async () => {
    if (!coFormData.companyName) return;
    try {
      if (isEditingCo && currentCo?.id) { await updateDoc(doc(db, "companies", currentCo.id), coFormData); }
      else { await addDoc(collection(db, "companies"), { ...coFormData, trainees: [], createdAt: serverTimestamp() }); }
      setShowCoForm(false); fetchCompanies();
    } catch (e) { alert("保存エラー"); }
  };

  const handleSaveTrainee = async () => {
    const targetId = isEditingTr ? (trFormData.targetCompanyId || currentCo.id) : trFormData.targetCompanyId;
    if (!targetId) return;
    try {
      const targetCo = companies.find(c => c.id === targetId);
      let updatedTrainees = [...(targetCo.trainees || [])];
      if (isEditingTr && trFormData.id) { updatedTrainees = updatedTrainees.map((t: any) => t.id === trFormData.id ? trFormData : t); }
      else { const { targetCompanyId, ...saveData } = trFormData; updatedTrainees = [...updatedTrainees, { ...saveData, id: Date.now() }]; }
      await updateDoc(doc(db, "companies", targetId), { trainees: updatedTrainees });
      setShowTrForm(false); fetchCompanies();
    } catch (e) { alert("保存エラー"); }
  };

  const totalTrainees = companies.reduce((sum, c) => sum + (c.trainees?.length || 0), 0);
  const activeCompanyCount = companies.filter(c => (c.trainees?.length || 0) > 0).length;

  if (view === 'print_tr' && isPreview) {
    const selectedCompany = companies.find(c => c.id === printCoId);
    const selectedTrainees = selectedCompany?.trainees.filter((t: any) => printTrIds.includes(t.id)) || [];
    return (
      <div style={{ padding: '40px', backgroundColor: '#fff' }}>
        <div className="no-print" style={{ marginBottom: '20px' }}><button onClick={() => setIsPreview(false)} style={{ ...btnBase, backgroundColor: colors.lightGray }}>設定に戻る</button></div>
        <h2 style={{ textAlign: 'center' }}>実習生情報一覧 ({selectedCompany?.companyName})</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
          <thead><tr><th style={{ border: '1px solid #000', padding: '8px', backgroundColor: '#eee' }}>項目</th>{selectedTrainees.map((t: any) => <th key={t.id} style={{ border: '1px solid #000', padding: '8px' }}>{t.traineeName}</th>)}</tr></thead>
          <tbody>{printFields.map(field => (<tr key={field}><td style={{ border: '1px solid #000', padding: '8px', fontWeight: 'bold' }}>{labelMapTr[field]}</td>{selectedTrainees.map((t: any) => <td key={t.id} style={{ border: '1px solid #000', padding: '8px' }}>{t[field] || "-"}</td>)}</tr>))}</tbody>
        </table>
        <style dangerouslySetInnerHTML={{ __html: `@media print { .no-print { display: none; } }` }} />
      </div>
    );
  }

  if (view === 'print_co' && isPreview) {
    const selectedCompany = companies.find(c => c.id === printCoId);
    return (
      <div style={{ padding: '40px', backgroundColor: '#fff' }}>
        <div className="no-print" style={{ marginBottom: '20px' }}><button onClick={() => setIsPreview(false)} style={{ ...btnBase, backgroundColor: colors.lightGray }}>設定に戻る</button></div>
        <h2 style={{ textAlign: 'center' }}>実習実施者情報 ({selectedCompany?.companyName})</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
          <tbody>{printFields.map(field => (<tr key={field}><td style={{ border: '1px solid #000', padding: '12px', fontWeight: 'bold', width: '250px', backgroundColor: '#eee' }}>{labelMapCo[field]}</td><td style={{ border: '1px solid #000', padding: '12px' }}>{selectedCompany?.[field] || "-"}</td></tr>))}</tbody>
        </table>
        <style dangerouslySetInnerHTML={{ __html: `@media print { .no-print { display: none; } }` }} />
      </div>
    );
  }

  if (view === 'list') {
    return (
      <main style={{ padding: '40px', minHeight: '100vh', backgroundColor: '#F9F9F9' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '40px', alignItems: 'flex-end' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '800', margin: 0 }}>アシストねっと管理システム</h1>
            <div style={{ display: 'flex', gap: '20px', marginTop: '10px' }}>
              <div style={{ fontSize: '14px', color: colors.text, backgroundColor: '#fff', padding: '8px 15px', borderRadius: '20px', border: `1px solid ${colors.border}` }}>受入中実習生実施者数：<strong>{activeCompanyCount}</strong> 社</div>
              <div style={{ fontSize: '14px', color: colors.text, backgroundColor: '#fff', padding: '8px 15px', borderRadius: '20px', border: `1px solid ${colors.border}` }}>組合全体受入人数：<strong>{totalTrainees}</strong> 名</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div style={{ marginRight: '20px', display: 'flex', gap: '10px' }}>
              <button onClick={() => { setPrintFields([]); setPrintTrIds([]); setPrintCoId(""); setIsPreview(false); setView('print_tr'); }} style={{ ...btnBase, backgroundColor: '#fff', border: `1px solid ${colors.border}`, color: colors.text }}>実習生情報の印刷</button>
              <button onClick={() => { setPrintFields([]); setPrintCoId(""); setIsPreview(false); setView('print_co'); }} style={{ ...btnBase, backgroundColor: '#fff', border: `1px solid ${colors.border}`, color: colors.text }}>会社情報の印刷</button>
            </div>
            <button onClick={() => { setTrFormData(initialTraineeForm); setIsEditingTr(false); setShowTrForm(true); }} style={{ ...btnBase, backgroundColor: colors.accent, color: '#fff' }}>＋ 新規実習生</button>
            <button onClick={() => { setIsEditingCo(false); setCoFormData(initialCompanyForm); setShowCoForm(true); }} style={{ ...btnBase, backgroundColor: colors.accent, color: '#fff' }}>＋ 新規実施者</button>
          </div>
        </header>

        {(view === 'print_tr' || view === 'print_co') && (
          <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '4px', border: `1px solid ${colors.accent}`, marginBottom: '30px' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between' }}><h3>{view === 'print_tr' ? '実習生印刷設定' : '会社印刷設定'}</h3><button onClick={() => setView('list')}>✕</button></div>
             <select style={{ width: '100%', padding: '10px', margin: '10px 0' }} value={printCoId} onChange={(e) => { setPrintCoId(e.target.value); setPrintTrIds([]); }}>
                <option value="">会社を選択</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
             </select>
             {view === 'print_tr' && printCoId && (
               <div style={{ margin: '10px 0' }}>
                 {companies.find(c => c.id === printCoId)?.trainees.map((t: any) => (
                   <button key={t.id} onClick={() => setPrintTrIds(prev => prev.includes(t.id) ? prev.filter(id => id !== t.id) : [...prev, t.id])} style={{ ...btnBase, margin: '5px', backgroundColor: printTrIds.includes(t.id) ? colors.accent : colors.lightGray, color: printTrIds.includes(t.id) ? '#fff' : colors.text }}>{t.traineeName}</button>
                 ))}
               </div>
             )}
             {(printCoId && (view === 'print_co' || printTrIds.length > 0)) && (
                <div style={{ marginTop: '20px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '5px' }}>
                    {Object.keys(view === 'print_tr' ? labelMapTr : labelMapCo).map(key => (
                      <label key={key} style={{ fontSize: '12px' }}><input type="checkbox" checked={printFields.includes(key)} onChange={() => setPrintFields(prev => prev.includes(key) ? prev.filter(f => f !== key) : [...prev, key])} /> {(view === 'print_tr' ? labelMapTr : labelMapCo)[key]}</label>
                    ))}
                  </div>
                  <button onClick={() => { setIsPreview(true); setTimeout(() => window.print(), 500); }} style={{ ...btnBase, backgroundColor: colors.accent, color: '#fff', marginTop: '20px' }}>印刷する (A4)</button>
                </div>
             )}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {companies.map(c => (
            <div key={c.id} onClick={() => { setCurrentCo(c); setView('detail'); }} style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '4px', border: `1px solid ${colors.border}`, cursor: 'pointer' }}>
              <div style={{ fontWeight: 'bold' }}>{c.companyName}</div>
              <div style={{ fontSize: '12px', color: colors.gray, marginTop: '10px' }}>受入: {(c.trainees || []).length} 名</div>
            </div>
          ))}
        </div>
        {showCoForm && <CoFormModal coFormData={coFormData} setCoFormData={setCoFormData} handleSaveCompany={handleSaveCompany} setShowCoForm={setShowCoForm} colors={colors} btnBase={btnBase} isEditing={isEditingCo} />}
        {showTrForm && <TrFormModal trFormData={trFormData} setTrFormData={setTrFormData} handleSaveTrainee={handleSaveTrainee} setShowTrForm={setShowTrForm} colors={colors} btnBase={btnBase} isEditingTr={isEditingTr} companies={companies} currentCoId={currentCo?.id} />}
      </main>
    );
  }

  const currentTrainee = currentCo.trainees?.find((t: any) => t.id === selectedTrId);
  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <nav style={{ padding: '15px 30px', backgroundColor: '#FFF', borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between' }}><button onClick={() => { setView('list'); setSelectedTrId(null); }} style={{ background: 'none', border: 'none', color: colors.gray, cursor: 'pointer', fontWeight: 'bold' }}>← 一覧に戻る</button></nav>
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', flex: 1 }}>
        <aside style={{ padding: '20px', borderRight: `1px solid ${colors.border}` }}>
          <h2>{currentCo.companyName}</h2>
          {Object.keys(labelMapCo).map(k => (<div key={k} style={{ marginBottom: '10px', fontSize: '12px' }}><span style={{ color: colors.gray }}>{labelMapCo[k]}</span><div style={{ fontWeight: 'bold' }}>{currentCo[k] || '-'}</div></div>))}
          <button onClick={() => { setCoFormData(currentCo); setIsEditingCo(true); setShowCoForm(true); }} style={{ ...btnBase, backgroundColor: colors.lightGray, width: '100%', marginTop: '20px' }}>編集</button>
        </aside>
        <section style={{ padding: '30px' }}>
          {!selectedTrId ? (<div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>{(currentCo.trainees || []).map((t: any) => (<button key={t.id} onClick={() => setSelectedTrId(t.id)} style={{ padding: '10px 20px', backgroundColor: batchColorMap[t.batch] || '#FFF', border: `1px solid ${colors.border}`, borderRadius: '4px' }}>{t.traineeName}</button>))}</div>) :
          (<div><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><h3>{currentTrainee.traineeName}</h3><button onClick={() => { setTrFormData(currentTrainee); setIsEditingTr(true); setShowTrForm(true); }} style={{ ...btnBase, backgroundColor: colors.lightGray }}>編集</button></div><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '20px' }}>{Object.keys(labelMapTr).map(k => (<div key={k} style={{ borderBottom: '1px solid #EEE', padding: '5px 0' }}><div style={{ fontSize: '11px', color: colors.gray }}>{labelMapTr[k]}</div><div style={{ fontWeight: 'bold' }}>{currentTrainee[k] || '-'}</div></div>))}</div></div>)}
        </section>
      </div>
      {showCoForm && <CoFormModal coFormData={coFormData} setCoFormData={setCoFormData} handleSaveCompany={handleSaveCompany} setShowCoForm={setShowCoForm} colors={colors} btnBase={btnBase} isEditing={isEditingCo} />}
      {showTrForm && <TrFormModal trFormData={trFormData} setTrFormData={setTrFormData} handleSaveTrainee={handleSaveTrainee} setShowTrForm={setShowTrForm} colors={colors} btnBase={btnBase} isEditingTr={isEditingTr} companies={companies} currentCoId={currentCo?.id} />}
    </main>
  );
}

// --- 3. サブコンポーネント ---
function CoFormModal({ coFormData, setCoFormData, handleSaveCompany, setShowCoForm, colors, btnBase, isEditing }: any) {
  const handleChange = (k: string, v: string) => setCoFormData({ ...coFormData, [k]: v });
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
      <div style={{ backgroundColor: '#FFF', padding: '30px', borderRadius: '8px', width: '90%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
        <h2>{isEditing ? '会社編集' : '新規登録'}</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>{Object.keys(labelMapCo).map(k => (<div key={k}><label style={{ fontSize: '11px' }}>{labelMapCo[k]}</label><input style={{ width: '100%', padding: '5px' }} value={coFormData[k] || ''} onChange={e => handleChange(k, e.target.value)} /></div>))}</div>
        <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}><button onClick={handleSaveCompany} style={{ ...btnBase, backgroundColor: colors.accent, color: '#FFF' }}>保存</button><button onClick={() => setShowCoForm(false)} style={{ ...btnBase, backgroundColor: colors.lightGray }}>閉じる</button></div>
      </div>
    </div>
  );
}

function TrFormModal({ trFormData, setTrFormData, handleSaveTrainee, setShowTrForm, colors, btnBase, isEditingTr, companies, currentCoId }: any) {
  const handleChange = (k: string, v: string) => { let newData = { ...trFormData, [k]: v }; if (k === 'birthday') newData.age = calculateAge(v); setTrFormData(newData); };
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
      <div style={{ backgroundColor: '#FFF', padding: '30px', borderRadius: '8px', width: '90%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
        <h2>実習生登録</h2>
        {!isEditingTr && (<select style={{ width: '100%', marginBottom: '20px', padding: '10px' }} value={trFormData.targetCompanyId || currentCoId} onChange={e => handleChange('targetCompanyId', e.target.value)}><option value="">会社を選択</option>{companies.map((c: any) => <option key={c.id} value={c.id}>{c.companyName}</option>)}</select>)}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>{Object.keys(labelMapTr).map(k => (<div key={k}><label style={{ fontSize: '11px' }}>{labelMapTr[k]}</label><input style={{ width: '100%', padding: '5px' }} value={trFormData[k] || ''} onChange={e => handleChange(k, e.target.value)} /></div>))}</div>
        <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}><button onClick={handleSaveTrainee} style={{ ...btnBase, backgroundColor: colors.accent, color: '#FFF' }}>保存</button><button onClick={() => setShowTrForm(false)} style={{ ...btnBase, backgroundColor: colors.lightGray }}>閉じる</button></div>
      </div>
    </div>
  );
}