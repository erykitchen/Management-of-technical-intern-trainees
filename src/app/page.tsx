"use client";
import { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, addDoc, getDocs, query, orderBy, doc, updateDoc, serverTimestamp, deleteDoc } from "firebase/firestore";

<<<<<<< HEAD
// --- ラベル・カラー定義 ---
=======
// --- ラベル定義 ---
>>>>>>> 54fe49a9e62df652d9b37bad77d3e3b1956f0b62
const labelMapCo: { [key: string]: string } = {
  companyName: "会社名", settlement: "決算時期", representative: "代表者氏名", jobType: "職種（小分類）",
  zipCode: "郵便番号", address: "住所", tel: "TEL", joinedDate: "組合加入年月日",
  employeeCount: "常勤職員数", acceptance: "今回までの受入有無", investmentCount: "出資口数",
  investmentAmount: "出資金額", investmentPayDate: "出資金払込年月日", corporateNumber: "法人番号",
  laborInsurance: "労働保険番号", employmentInsurance: "雇用保険番号",
  implementationNumber: "実習実施者番号", acceptanceDate: "届出受理日",
  industryCategory: "技能実習産業分類", officeZip: "事業所郵便番号", officeAddress: "配属事業所住所",
  responsiblePerson: "責任者名", instructor: "指導員名", lifeInstructor: "生活指導員名", planInstructor: "計画指導員名",
  memo: "備考（メモ）"
};

const labelMapTr: { [key: string]: string } = {
  batch: "バッチ(期生)", status: "ステータス", traineeName: "氏名", kana: "フリガナ", 
  traineeZip: "郵便番号", traineeAddress: "住所", 
  category: "区分", nationality: "国籍", birthday: "生年月日", age: "年齢", gender: "性別",
  period: "1年", stayLimit: "在留期限", cardNumber: "在留カード番号", passportLimit: "パスポート期限",
  passportNumber: "パスポート番号", certificateNumber: "認定番号", applyDate: "申請日",
  certDate: "認定年月日", entryDate: "実習開始日", renewStartDate: "更新手続開始日",
  assignDate: "配属日", endDate: "実習終了日", moveDate: "配属移動日", returnDate: "帰国日",
  employmentReportDate: "雇用条件届出日", trainingStartDate: "講習開始日", trainingEndDate: "講習終了日"
};

// バッチの色を少し濃く調整
const batchColorMap: { [key: string]: string } = { 
  "①": "#BBDEFB", "②": "#FFF9C4", "③": "#FFCDD2", "④": "#E1BEE7", "⑤": "#C8E6C9", "なし": "#F5F5F5" 
};

const initialCompanyForm = { ...Object.keys(labelMapCo).reduce((acc: any, key) => { acc[key] = ""; return acc; }, {}), investmentCount: "1口", investmentAmount: "10千円", acceptance: "選択する" };
const initialTraineeForm = { targetCompanyId: "", batch: "なし", status: "選択する", traineeName: "", kana: "", traineeZip: "", traineeAddress: "", category: "技能実習1号", nationality: "ベトナム", birthday: "", age: "", gender: "男", period: "1年", stayLimit: "", cardNumber: "", passportLimit: "", passportNumber: "", certificateNumber: "", applyDate: "", certDate: "", entryDate: "", renewStartDate: "", assignDate: "", endDate: "", moveDate: "", returnDate: "", employmentReportDate: "", trainingStartDate: "", trainingEndDate: "", memo: "", phaseHistory: [] };

export default function Home() {
<<<<<<< HEAD
=======
  // ★重要：ビルドエラー解消のため、viewの型に印刷用画面を追加しました
>>>>>>> 54fe49a9e62df652d9b37bad77d3e3b1956f0b62
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

  // 印刷用ステート
  const [printCoId, setPrintCoId] = useState("");
  const [printTrIds, setPrintTrIds] = useState<number[]>([]);
  const [printFields, setPrintFields] = useState<string[]>([]);
  const [isPreview, setIsPreview] = useState(false);

  // デザイン設定（以前の柔らかいトーン）
  const colors = { main: '#FFF9F0', accent: '#F57C00', text: '#2C3E50', gray: '#7F8C8D', lightGray: '#F8F9FA', border: '#EEE', white: '#FFFFFF' };
  const cardRadius = '12px';
  const btnBase = { padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: '600' as const, fontSize: '14px', transition: '0.2s' };

  useEffect(() => { fetchCompanies(); }, []);
  
  const fetchCompanies = async () => {
    const q = query(collection(db, "companies"), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setCompanies(data);
    if (currentCo) {
      const updated = data.find(c => c.id === currentCo.id);
      if (updated) setCurrentCo(updated);
    }
  };

  const handleSaveCompany = async () => {
    if (!coFormData.companyName) return;
    try {
      if (isEditingCo && currentCo?.id) { await updateDoc(doc(db, "companies", currentCo.id), coFormData); }
      else { await addDoc(collection(db, "companies"), { ...coFormData, trainees: [], createdAt: serverTimestamp() }); }
      setShowCoForm(false); fetchCompanies();
    } catch (e) { alert("保存に失敗しました"); }
  };

  const handleSaveTrainee = async () => {
    const targetId = isEditingTr ? (trFormData.targetCompanyId || currentCo.id) : trFormData.targetCompanyId;
    if (!targetId) return;
    try {
      const targetCo = companies.find(c => c.id === targetId);
      let updatedTrainees = [...(targetCo.trainees || [])];
      if (isEditingTr && trFormData.id) {
        updatedTrainees = updatedTrainees.map((t: any) => t.id === trFormData.id ? trFormData : t);
      } else {
        const { targetCompanyId, ...saveData } = trFormData;
        updatedTrainees = [...updatedTrainees, { ...saveData, id: Date.now() }];
      }
      await updateDoc(doc(db, "companies", targetId), { trainees: updatedTrainees });
      setShowTrForm(false); fetchCompanies();
    } catch (e) { alert("保存に失敗しました"); }
  };

  const handleDeleteTrainee = async (traineeId: number) => {
    if (!window.confirm("この実習生データを削除しますか？")) return;
    const updatedTrainees = currentCo.trainees.filter((t: any) => t.id !== traineeId);
    await updateDoc(doc(db, "companies", currentCo.id), { trainees: updatedTrainees });
    setSelectedTrId(null);
    fetchCompanies();
  };

  const handleAddPhase = async () => {
    const nextPhase = window.prompt("追加する新しい区分を入力してください（例：技能実習2号）");
    if (!nextPhase || !selectedTrId) return;
    const trainee = currentCo.trainees.find((t: any) => t.id === selectedTrId);
    const newHistory = [...(trainee.phaseHistory || []), { category: trainee.category, endDate: new Date().toLocaleDateString() }];
    const updatedTrainee = { ...trainee, category: nextPhase, phaseHistory: newHistory };
    const updatedTrainees = currentCo.trainees.map((t: any) => t.id === selectedTrId ? updatedTrainee : t);
    await updateDoc(doc(db, "companies", currentCo.id), { trainees: updatedTrainees });
    fetchCompanies();
  };

  const totalTrainees = companies.reduce((sum, c) => sum + (c.trainees?.length || 0), 0);
  const activeCompanyCount = companies.filter(c => (c.trainees?.length || 0) > 0).length;

<<<<<<< HEAD
  // --- 印刷表示ロジック (維持) ---
=======
  // 印刷プレビュー画面（実習生）
>>>>>>> 54fe49a9e62df652d9b37bad77d3e3b1956f0b62
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

  // 印刷プレビュー画面（会社）
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

<<<<<<< HEAD
  // --- メイン一覧画面 ---
=======
  // 一覧表示
>>>>>>> 54fe49a9e62df652d9b37bad77d3e3b1956f0b62
  if (view === 'list' || view === 'print_tr' || view === 'print_co') {
    return (
      <main style={{ padding: '40px', minHeight: '100vh', backgroundColor: '#FDFCFB', color: colors.text }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '40px', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '26px', fontWeight: '900', color: colors.accent, margin: 0 }}>アシストねっと管理システム</h1>
            <div style={{ display: 'flex', gap: '15px', marginTop: '12px' }}>
              <div style={{ fontSize: '14px', backgroundColor: '#FFF', padding: '8px 18px', borderRadius: '30px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>実施者数：<strong>{activeCompanyCount}</strong> 社</div>
              <div style={{ fontSize: '14px', backgroundColor: '#FFF', padding: '8px 18px', borderRadius: '30px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>合計実習生：<strong>{totalTrainees}</strong> 名</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
<<<<<<< HEAD
            <button onClick={() => { setPrintFields([]); setPrintTrIds([]); setPrintCoId(""); setIsPreview(false); setView('print_tr'); }} style={{ ...btnBase, backgroundColor: '#FFF', border: `1.5px solid ${colors.accent}`, color: colors.accent }}>実習生印刷</button>
            <button onClick={() => { setPrintFields([]); setPrintCoId(""); setIsPreview(false); setView('print_co'); }} style={{ ...btnBase, backgroundColor: '#FFF', border: `1.5px solid ${colors.accent}`, color: colors.accent }}>会社印刷</button>
            <button onClick={() => { setIsEditingCo(false); setCoFormData(initialCompanyForm); setShowCoForm(true); }} style={{ ...btnBase, backgroundColor: colors.accent, color: '#FFF', boxShadow: '0 4px 10px rgba(245, 124, 0, 0.3)' }}>＋ 新規実施者</button>
          </div>
        </header>

        {/* 印刷設定パネル (維持) */}
        {(view === 'print_tr' || view === 'print_co') && (
          <div style={{ backgroundColor: '#FFF', padding: '30px', borderRadius: cardRadius, border: `2px solid ${colors.accent}`, marginBottom: '30px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}><h3>{view === 'print_tr' ? '📄 実習生印刷設定' : '🏢 会社印刷設定'}</h3><button onClick={() => setView('list')} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>✕</button></div>
             <select style={{ width: '100%', padding: '12px', borderRadius: '8px', border: `1px solid ${colors.border}`, marginBottom: '15px' }} value={printCoId} onChange={(e) => { setPrintCoId(e.target.value); setPrintTrIds([]); }}>
                <option value="">対象の会社を選択</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
             </select>
             {view === 'print_tr' && printCoId && (
               <div style={{ marginBottom: '20px' }}>
                 <p style={{ fontSize: '13px', fontWeight: 'bold' }}>印刷する実習生を選択：</p>
                 <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                   {companies.find(c => c.id === printCoId)?.trainees.map((t: any) => (
                     <button key={t.id} onClick={() => setPrintTrIds(prev => prev.includes(t.id) ? prev.filter(id => id !== t.id) : [...prev, t.id])} style={{ ...btnBase, backgroundColor: printTrIds.includes(t.id) ? colors.accent : colors.lightGray, color: printTrIds.includes(t.id) ? '#FFF' : colors.text }}>{t.traineeName}</button>
                   ))}
                 </div>
               </div>
             )}
             {printCoId && (
                <div>
                  <p style={{ fontSize: '13px', fontWeight: 'bold' }}>出力項目を選択：</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '8px', maxHeight: '200px', overflowY: 'auto', padding: '10px', backgroundColor: colors.lightGray, borderRadius: '8px' }}>
                    {Object.keys(view === 'print_tr' ? labelMapTr : labelMapCo).map(key => (
                      <label key={key} style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}><input type="checkbox" checked={printFields.includes(key)} onChange={() => setPrintFields(prev => prev.includes(key) ? prev.filter(f => f !== key) : [...prev, key])} /> {(view === 'print_tr' ? labelMapTr : labelMapCo)[key]}</label>
                    ))}
                  </div>
                  <button onClick={() => { setIsPreview(true); setTimeout(() => window.print(), 500); }} style={{ ...btnBase, backgroundColor: colors.accent, color: '#FFF', marginTop: '20px', width: '100%' }}>プレビューを表示して印刷</button>
=======
            <button onClick={() => { setPrintFields([]); setPrintTrIds([]); setPrintCoId(""); setIsPreview(false); setView('print_tr'); }} style={{ ...btnBase, backgroundColor: '#fff', border: `1px solid ${colors.border}` }}>実習生印刷</button>
            <button onClick={() => { setPrintFields([]); setPrintCoId(""); setIsPreview(false); setView('print_co'); }} style={{ ...btnBase, backgroundColor: '#fff', border: `1px solid ${colors.border}` }}>会社印刷</button>
            <button onClick={() => { setTrFormData(initialTraineeForm); setIsEditingTr(false); setShowTrForm(true); }} style={{ ...btnBase, backgroundColor: colors.accent, color: '#fff' }}>＋ 新規実習生</button>
            <button onClick={() => { setIsEditingCo(false); setCoFormData(initialCompanyForm); setShowCoForm(true); }} style={{ ...btnBase, backgroundColor: colors.accent, color: '#fff' }}>＋ 新規実施者</button>
          </div>
        </header>

        {/* 印刷設定パネル */}
        {(view === 'print_tr' || view === 'print_co') && (
          <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '4px', border: `1px solid ${colors.accent}`, marginBottom: '30px' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between' }}><h3>{view === 'print_tr' ? '実習生印刷設定' : '会社印刷設定'}</h3><button onClick={() => setView('list')}>✕ 閉じる</button></div>
             <select style={{ width: '100%', padding: '10px', margin: '10px 0' }} value={printCoId} onChange={(e) => { setPrintCoId(e.target.value); setPrintTrIds([]); }}>
                <option value="">対象の会社を選択してください</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
             </select>
             {view === 'print_tr' && printCoId && (
               <div style={{ margin: '10px 0' }}>
                 <p style={{ fontSize: '13px', fontWeight: 'bold' }}>印刷する実習生を選択：</p>
                 {companies.find(c => c.id === printCoId)?.trainees.map((t: any) => (
                   <button key={t.id} onClick={() => setPrintTrIds(prev => prev.includes(t.id) ? prev.filter(id => id !== t.id) : [...prev, t.id])} style={{ ...btnBase, margin: '5px', backgroundColor: printTrIds.includes(t.id) ? colors.accent : colors.lightGray, color: printTrIds.includes(t.id) ? '#fff' : colors.text }}>{t.traineeName}</button>
                 ))}
               </div>
             )}
             {(printCoId && (view === 'print_co' || printTrIds.length > 0)) && (
                <div style={{ marginTop: '20px' }}>
                  <p style={{ fontSize: '13px', fontWeight: 'bold' }}>出力項目を選択：</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '5px' }}>
                    {Object.keys(view === 'print_tr' ? labelMapTr : labelMapCo).map(key => (
                      <label key={key} style={{ fontSize: '12px', cursor: 'pointer' }}><input type="checkbox" checked={printFields.includes(key)} onChange={() => setPrintFields(prev => prev.includes(key) ? prev.filter(f => f !== key) : [...prev, key])} /> {(view === 'print_tr' ? labelMapTr : labelMapCo)[key]}</label>
                    ))}
                  </div>
                  <button onClick={() => { setIsPreview(true); setTimeout(() => window.print(), 500); }} style={{ ...btnBase, backgroundColor: colors.accent, color: '#fff', marginTop: '20px', width: '200px' }}>プレビュー・印刷</button>
>>>>>>> 54fe49a9e62df652d9b37bad77d3e3b1956f0b62
                </div>
             )}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '25px' }}>
          {companies.map(c => (
<<<<<<< HEAD
            <div key={c.id} onClick={() => { setCurrentCo(c); setView('detail'); }} style={{ backgroundColor: '#FFF', padding: '25px', borderRadius: cardRadius, border: `1px solid ${colors.border}`, cursor: 'pointer', transition: '0.3s', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
              <div style={{ fontWeight: '800', fontSize: '18px', color: colors.text }}>{c.companyName}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }}>
                <span style={{ fontSize: '13px', color: colors.gray }}>受入実習生</span>
                <span style={{ fontWeight: 'bold', fontSize: '16px', color: colors.accent }}>{(c.trainees || []).length} 名</span>
              </div>
=======
            <div key={c.id} onClick={() => { setCurrentCo(c); setView('detail'); }} style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '4px', border: `1px solid ${colors.border}`, cursor: 'pointer' }}>
              <div style={{ fontWeight: 'bold' }}>{c.companyName}</div>
              <div style={{ fontSize: '12px', color: colors.gray, marginTop: '10px' }}>受入人数: {(c.trainees || []).length} 名</div>
>>>>>>> 54fe49a9e62df652d9b37bad77d3e3b1956f0b62
            </div>
          ))}
        </div>
        {showCoForm && <CoFormModal coFormData={coFormData} setCoFormData={setCoFormData} handleSaveCompany={handleSaveCompany} setShowCoForm={setShowCoForm} colors={colors} btnBase={btnBase} isEditing={isEditingCo} radius={cardRadius} />}
        {showTrForm && <TrFormModal trFormData={trFormData} setTrFormData={setTrFormData} handleSaveTrainee={handleSaveTrainee} setShowTrForm={setShowTrForm} colors={colors} btnBase={btnBase} isEditingTr={isEditingTr} companies={companies} currentCoId={currentCo?.id} radius={cardRadius} />}
      </main>
    );
  }

<<<<<<< HEAD
  // --- 詳細画面 ---
  const currentTrainee = currentCo.trainees?.find((t: any) => t.id === selectedTrId);
  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#FFF' }}>
      <nav style={{ padding: '15px 30px', borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={() => { setView('list'); setSelectedTrId(null); }} style={{ ...btnBase, backgroundColor: colors.lightGray, color: colors.text }}>← 一覧に戻る</button>
        <div style={{ fontWeight: 'bold' }}>{currentCo.companyName} 管理画面</div>
      </nav>
      
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', flex: 1 }}>
        <aside style={{ padding: '25px', borderRight: `1px solid ${colors.border}`, backgroundColor: '#FDFDFD' }}>
          <h2 style={{ fontSize: '20px', marginBottom: '25px', color: colors.accent }}>企業詳細</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {Object.keys(labelMapCo).map(k => (
              <div key={k} style={{ fontSize: '12px' }}>
                <span style={{ color: colors.gray }}>{labelMapCo[k]}</span>
                <div style={{ fontWeight: 'bold', marginTop: '3px', wordBreak: 'break-all' }}>{currentCo[k] || '---'}</div>
              </div>
            ))}
          </div>
          <button onClick={() => { setCoFormData(currentCo); setIsEditingCo(true); setShowCoForm(true); }} style={{ ...btnBase, backgroundColor: colors.lightGray, width: '100%', marginTop: '30px', border: `1px solid ${colors.border}` }}>企業情報を編集</button>
        </aside>

        <section style={{ padding: '40px', backgroundColor: '#FFF' }}>
          {!selectedTrId ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <h3 style={{ margin: 0 }}>在籍実習生</h3>
                <button onClick={() => { setTrFormData({ ...initialTraineeForm, targetCompanyId: currentCo.id }); setIsEditingTr(false); setShowTrForm(true); }} style={{ ...btnBase, backgroundColor: colors.accent, color: '#FFF' }}>＋ 新規実習生を追加</button>
              </div>
              <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                {(currentCo.trainees || []).map((t: any) => (
                  <button key={t.id} onClick={() => setSelectedTrId(t.id)} style={{ padding: '20px', backgroundColor: batchColorMap[t.batch] || '#FFF', border: `1px solid ${colors.border}`, borderRadius: cardRadius, textAlign: 'left', minWidth: '160px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                    <div style={{ fontSize: '11px', fontWeight: 'bold', color: 'rgba(0,0,0,0.4)', marginBottom: '5px' }}>{t.batch}期生</div>
                    <div style={{ fontWeight: '800', fontSize: '16px' }}>{t.traineeName}</div>
                    <div style={{ fontSize: '12px', marginTop: '10px', color: 'rgba(0,0,0,0.5)' }}>{t.category}</div>
                  </button>
                ))}
=======
  // 詳細画面
  const currentTrainee = currentCo.trainees?.find((t: any) => t.id === selectedTrId);
  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <nav style={{ padding: '15px 30px', backgroundColor: '#FFF', borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between' }}><button onClick={() => { setView('list'); setSelectedTrId(null); }} style={{ background: 'none', border: 'none', color: colors.gray, cursor: 'pointer', fontWeight: 'bold' }}>← 一覧に戻る</button></nav>
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', flex: 1 }}>
        <aside style={{ padding: '20px', borderRight: `1px solid ${colors.border}`, backgroundColor: '#FDFDFD' }}>
          <h2 style={{ fontSize: '18px', marginBottom: '20px' }}>{currentCo.companyName}</h2>
          {Object.keys(labelMapCo).map(k => (<div key={k} style={{ marginBottom: '12px', fontSize: '12px' }}><span style={{ color: colors.gray }}>{labelMapCo[k]}</span><div style={{ fontWeight: 'bold' }}>{currentCo[k] || '-'}</div></div>))}
          <button onClick={() => { setCoFormData(currentCo); setIsEditingCo(true); setShowCoForm(true); }} style={{ ...btnBase, backgroundColor: colors.lightGray, width: '100%', marginTop: '20px' }}>会社情報を編集</button>
        </aside>
        <section style={{ padding: '30px' }}>
          {!selectedTrId ? (
            <div>
              <h3 style={{ marginBottom: '20px' }}>在籍実習生一覧</h3>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {(currentCo.trainees || []).map((t: any) => (<button key={t.id} onClick={() => setSelectedTrId(t.id)} style={{ padding: '15px 25px', backgroundColor: batchColorMap[t.batch] || '#FFF', border: `1px solid ${colors.border}`, borderRadius: '4px', textAlign: 'left' }}><div style={{ fontSize: '11px', color: colors.gray }}>{t.batch}期生</div><div style={{ fontWeight: 'bold' }}>{t.traineeName}</div></button>))}
>>>>>>> 54fe49a9e62df652d9b37bad77d3e3b1956f0b62
              </div>
            </div>
          ) : (
            <div>
<<<<<<< HEAD
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <button onClick={() => setSelectedTrId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px' }}>←</button>
                  <h3 style={{ margin: 0, fontSize: '22px' }}>{currentTrainee.traineeName}</h3>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => handleAddPhase()} style={{ ...btnBase, backgroundColor: '#E8F5E9', color: '#2E7D32' }}>区分を更新</button>
                  <button onClick={() => { setTrFormData(currentTrainee); setIsEditingTr(true); setShowTrForm(true); }} style={{ ...btnBase, backgroundColor: colors.lightGray }}>編集</button>
                  <button onClick={() => handleDeleteTrainee(currentTrainee.id)} style={{ ...btnBase, backgroundColor: '#FFEBEE', color: '#C62828' }}>削除</button>
                </div>
              </div>

              {/* タブ切り替え的な表示 */}
              <div style={{ display: 'flex', gap: '20px', borderBottom: `1px solid ${colors.border}`, marginBottom: '25px' }}>
                <div style={{ padding: '10px 0', borderBottom: `3px solid ${colors.accent}`, fontWeight: 'bold' }}>基本情報</div>
                {currentTrainee.phaseHistory?.length > 0 && <div style={{ padding: '10px 0', color: colors.gray }}>履歴あり</div>}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '20px' }}>
                {Object.keys(labelMapTr).map(k => (
                  <div key={k} style={{ borderBottom: `1px solid ${colors.lightGray}`, paddingBottom: '10px' }}>
                    <div style={{ fontSize: '11px', color: colors.gray }}>{labelMapTr[k]}</div>
                    <div style={{ fontWeight: 'bold', marginTop: '4px' }}>{currentTrainee[k] || '---'}</div>
                  </div>
                ))}
              </div>

              {/* 区分履歴の表示 */}
              {currentTrainee.phaseHistory?.length > 0 && (
                <div style={{ marginTop: '40px', padding: '20px', backgroundColor: colors.lightGray, borderRadius: cardRadius }}>
                  <h4 style={{ margin: '0 0 15px 0', fontSize: '14px' }}>過去の区分履歴</h4>
                  {currentTrainee.phaseHistory.map((h: any, i: number) => (
                    <div key={i} style={{ fontSize: '13px', marginBottom: '5px', display: 'flex', justifyContent: 'space-between' }}>
                      <span>{h.category}</span>
                      <span style={{ color: colors.gray }}>終了日: {h.endDate}</span>
                    </div>
                  ))}
                </div>
              )}
=======
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}><h3>{currentTrainee.traineeName} の詳細</h3><button onClick={() => { setTrFormData(currentTrainee); setIsEditingTr(true); setShowTrForm(true); }} style={{ ...btnBase, backgroundColor: colors.lightGray }}>実習生情報を編集</button></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {Object.keys(labelMapTr).map(k => (<div key={k} style={{ borderBottom: '1px solid #EEE', padding: '8px 0' }}><div style={{ fontSize: '11px', color: colors.gray }}>{labelMapTr[k]}</div><div style={{ fontWeight: 'bold' }}>{currentTrainee[k] || '-'}</div></div>))}
              </div>
>>>>>>> 54fe49a9e62df652d9b37bad77d3e3b1956f0b62
            </div>
          )}
        </section>
      </div>

      {showCoForm && <CoFormModal coFormData={coFormData} setCoFormData={setCoFormData} handleSaveCompany={handleSaveCompany} setShowCoForm={setShowCoForm} colors={colors} btnBase={btnBase} isEditing={isEditingCo} radius={cardRadius} />}
      {showTrForm && <TrFormModal trFormData={trFormData} setTrFormData={setTrFormData} handleSaveTrainee={handleSaveTrainee} setShowTrForm={setShowTrForm} colors={colors} btnBase={btnBase} isEditingTr={isEditingTr} companies={companies} currentCoId={currentCo?.id} radius={cardRadius} />}
    </main>
  );
}

<<<<<<< HEAD
// --- サブコンポーネント ---
function CoFormModal({ coFormData, setCoFormData, handleSaveCompany, setShowCoForm, colors, btnBase, isEditing, radius }: any) {
  const handleChange = (k: string, v: string) => setCoFormData({ ...coFormData, [k]: v });
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
      <div style={{ backgroundColor: '#FFF', padding: '40px', borderRadius: radius, width: '90%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <h2 style={{ marginBottom: '30px', color: colors.accent }}>{isEditing ? '🏢 企業情報の編集' : '🏢 新規実施者の登録'}</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {Object.keys(labelMapCo).map(k => (
            <div key={k}><label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>{labelMapCo[k]}</label>
            <input style={{ width: '100%', padding: '10px', borderRadius: '8px', border: `1px solid ${colors.border}`, backgroundColor: colors.lightGray }} value={coFormData[k] || ''} onChange={e => handleChange(k, e.target.value)} /></div>
          ))}
        </div>
        <div style={{ marginTop: '40px', display: 'flex', gap: '15px', justifyContent: 'flex-end' }}>
          <button onClick={() => setShowCoForm(false)} style={{ ...btnBase, backgroundColor: colors.lightGray }}>キャンセル</button>
          <button onClick={handleSaveCompany} style={{ ...btnBase, backgroundColor: colors.accent, color: '#FFF' }}>この内容で保存する</button>
        </div>
=======
// --- コンポーネント ---
function CoFormModal({ coFormData, setCoFormData, handleSaveCompany, setShowCoForm, colors, btnBase, isEditing }: any) {
  const handleChange = (k: string, v: string) => setCoFormData({ ...coFormData, [k]: v });
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
      <div style={{ backgroundColor: '#FFF', padding: '30px', borderRadius: '8px', width: '90%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto' }}>
        <h2 style={{ marginBottom: '20px' }}>{isEditing ? '会社情報の編集' : '新規実施者の登録'}</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>{Object.keys(labelMapCo).map(k => (<div key={k}><label style={{ fontSize: '11px', fontWeight: 'bold' }}>{labelMapCo[k]}</label><input style={{ width: '100%', padding: '8px', border: `1px solid #ccc`, borderRadius: '4px' }} value={coFormData[k] || ''} onChange={e => handleChange(k, e.target.value)} /></div>))}</div>
        <div style={{ marginTop: '30px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}><button onClick={() => setShowCoForm(false)} style={{ ...btnBase, backgroundColor: colors.lightGray }}>キャンセル</button><button onClick={handleSaveCompany} style={{ ...btnBase, backgroundColor: colors.accent, color: '#FFF' }}>保存する</button></div>
>>>>>>> 54fe49a9e62df652d9b37bad77d3e3b1956f0b62
      </div>
    </div>
  );
}

<<<<<<< HEAD
function TrFormModal({ trFormData, setTrFormData, handleSaveTrainee, setShowTrForm, colors, btnBase, isEditingTr, companies, currentCoId, radius }: any) {
  const handleChange = (k: string, v: string) => setTrFormData({ ...trFormData, [k]: v });
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
      <div style={{ backgroundColor: '#FFF', padding: '40px', borderRadius: radius, width: '90%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <h2 style={{ marginBottom: '30px', color: colors.accent }}>{isEditingTr ? '👤 実習生情報の編集' : '👤 新規実習生の登録'}</h2>
        {!isEditingTr && (
          <div style={{ marginBottom: '25px' }}>
            <label style={{ fontSize: '12px', fontWeight: 'bold' }}>配属先の企業</label>
            <select style={{ width: '100%', padding: '12px', borderRadius: '8px', border: `1px solid ${colors.border}`, marginTop: '5px' }} value={trFormData.targetCompanyId || currentCoId || ""} onChange={e => handleChange('targetCompanyId', e.target.value)}>
              <option value="">企業を選択してください</option>
              {companies.map((c: any) => <option key={c.id} value={c.id}>{c.companyName}</option>)}
            </select>
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {Object.keys(labelMapTr).map(k => (
            <div key={k}><label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>{labelMapTr[k]}</label>
            <input style={{ width: '100%', padding: '10px', borderRadius: '8px', border: `1px solid ${colors.border}`, backgroundColor: colors.lightGray }} value={trFormData[k] || ''} onChange={e => handleChange(k, e.target.value)} /></div>
          ))}
        </div>
        <div style={{ marginTop: '40px', display: 'flex', gap: '15px', justifyContent: 'flex-end' }}>
          <button onClick={() => setShowTrForm(false)} style={{ ...btnBase, backgroundColor: colors.lightGray }}>キャンセル</button>
          <button onClick={handleSaveTrainee} style={{ ...btnBase, backgroundColor: colors.accent, color: '#FFF' }}>この内容で保存する</button>
        </div>
=======
function TrFormModal({ trFormData, setTrFormData, handleSaveTrainee, setShowTrForm, colors, btnBase, isEditingTr, companies, currentCoId }: any) {
  const handleChange = (k: string, v: string) => setTrFormData({ ...trFormData, [k]: v });
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
      <div style={{ backgroundColor: '#FFF', padding: '30px', borderRadius: '8px', width: '90%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto' }}>
        <h2 style={{ marginBottom: '20px' }}>実習生情報の登録・編集</h2>
        {!isEditingTr && (
          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '11px', fontWeight: 'bold' }}>配属先の会社を選択</label>
            <select style={{ width: '100%', padding: '10px', border: `1px solid #ccc`, borderRadius: '4px' }} value={trFormData.targetCompanyId || currentCoId || ""} onChange={e => handleChange('targetCompanyId', e.target.value)}><option value="">会社を選んでください</option>{companies.map((c: any) => <option key={c.id} value={c.id}>{c.companyName}</option>)}</select>
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>{Object.keys(labelMapTr).map(k => (<div key={k}><label style={{ fontSize: '11px', fontWeight: 'bold' }}>{labelMapTr[k]}</label><input style={{ width: '100%', padding: '8px', border: `1px solid #ccc`, borderRadius: '4px' }} value={trFormData[k] || ''} onChange={e => handleChange(k, e.target.value)} /></div>))}</div>
        <div style={{ marginTop: '30px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}><button onClick={() => setShowTrForm(false)} style={{ ...btnBase, backgroundColor: colors.lightGray }}>キャンセル</button><button onClick={handleSaveTrainee} style={{ ...btnBase, backgroundColor: colors.accent, color: '#FFF' }}>保存する</button></div>
>>>>>>> 54fe49a9e62df652d9b37bad77d3e3b1956f0b62
      </div>
    </div>
  );
}
