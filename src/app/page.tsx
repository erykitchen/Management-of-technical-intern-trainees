"use client";
import { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, addDoc, getDocs, query, orderBy, doc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";

// 分割したファイルからのインポート
import { 
  labelMapCo, labelMapTr, categoryOptions, batchOptions, 
  batchColorMap, initialCompanyForm, initialTraineeForm 
} from './lib/constants';
import { convertToAD, checkAlert } from './lib/utils';
import { CoFormModal, TrFormModal } from './components/Modals';

export default function Home() {
  const [view, setView] = useState<'list' | 'detail' | 'print_tr' | 'print_co'>('list');
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

  const [printCoId, setPrintCoId] = useState("");
  const [printTrIds, setPrintTrIds] = useState<number[]>([]);
  const [printFields, setPrintFields] = useState<string[]>([]);
  const [isPreview, setIsPreview] = useState(false);

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
      if (updated) setCurrentCo(updated);
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

  if (view === 'print_tr' && isPreview) {
    const selectedCompany = companies.find(c => c.id === printCoId);
    const selectedTrainees = selectedCompany?.trainees.filter((t: any) => printTrIds.includes(t.id)) || [];
    return (
      <div className="print-area" style={{ padding: '20px', backgroundColor: '#fff' }}>
        <style>{`@media print { .no-print { display: none !important; } body { background: #fff; } }`}</style>
        <button className="no-print" onClick={() => setIsPreview(false)} style={{ ...btnBase, backgroundColor: colors.accent, color: '#fff', marginBottom: '20px' }}>設定に戻る</button>
        {selectedTrainees.map((t: any) => (
          <div key={t.id} style={{ marginBottom: '40px', pageBreakAfter: 'always', border: '1px solid #000', padding: '20px' }}>
            <h2 style={{ borderBottom: '2px solid #000', paddingBottom: '10px' }}>実習生情報シート ({selectedCompany?.companyName})</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
              <tbody>
                {printFields.map(key => (
                  <tr key={key}>
                    <td style={{ border: '1px solid #000', padding: '8px', width: '30%', backgroundColor: '#f2f2f2', fontWeight: 'bold' }}>{labelMapTr[key]}</td>
                    <td style={{ border: '1px solid #000', padding: '8px' }}>{t[key] || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    );
  }

  if (view === 'print_co' && isPreview) {
    const selectedCompany = companies.find(c => c.id === printCoId);
    return (
      <div className="print-area" style={{ padding: '20px', backgroundColor: '#fff' }}>
        <style>{`@media print { .no-print { display: none !important; } body { background: #fff; } }`}</style>
        <button className="no-print" onClick={() => setIsPreview(false)} style={{ ...btnBase, backgroundColor: colors.accent, color: '#fff', marginBottom: '20px' }}>設定に戻る</button>
        <div style={{ border: '1px solid #000', padding: '20px' }}>
          <h2 style={{ borderBottom: '2px solid #000', paddingBottom: '10px' }}>実習実施者（受入企業）情報詳細</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
            <tbody>
              {printFields.map(key => (
                <tr key={key}>
                  <td style={{ border: '1px solid #000', padding: '8px', width: '30%', backgroundColor: '#f2f2f2', fontWeight: 'bold' }}>{labelMapCo[key]}</td>
                  <td style={{ border: '1px solid #000', padding: '8px' }}>{selectedCompany?.[key] || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (view === 'list' || view === 'print_tr' || view === 'print_co') {
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
            <button onClick={() => { setPrintFields([]); setPrintTrIds([]); setPrintCoId(""); setIsPreview(false); setView('print_tr'); }} style={{ ...btnBase, backgroundColor: '#fff', border: `1px solid ${colors.border}`, color: colors.text }}>実習生情報の印刷</button>
            <button onClick={() => { setPrintFields([]); setPrintCoId(""); setIsPreview(false); setView('print_co'); }} style={{ ...btnBase, backgroundColor: '#fff', border: `1px solid ${colors.border}`, color: colors.text }}>会社情報の印刷</button>
            <button onClick={() => { setTrFormData(initialTraineeForm); setIsEditingTr(false); setShowTrForm(true); }} style={{ ...btnBase, backgroundColor: colors.accent, color: '#fff' }}>＋ 新規実習生</button>
            <button onClick={() => { setIsEditingCo(false); setCoFormData(initialCompanyForm); setShowCoForm(true); }} style={{ ...btnBase, backgroundColor: colors.accent, color: '#fff' }}>＋ 新規実施者</button>
          </div>
        </header>

        {(view === 'print_tr' || view === 'print_co') && (
          <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '4px', border: `2px solid ${colors.accent}`, marginBottom: '30px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold' }}>{view === 'print_tr' ? '実習生 印刷設定' : '会社 印刷設定'}</h3>
              <button onClick={() => setView('list')} style={{ ...btnBase, backgroundColor: colors.lightGray }}>✕ 閉じる</button>
            </div>
            
            <label style={{ fontSize: '13px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>対象の会社を選択：</label>
            <select style={{ width: '100%', padding: '12px', marginBottom: '20px', borderRadius: '4px', border: '1px solid #ccc' }} value={printCoId} onChange={(e) => { setPrintCoId(e.target.value); setPrintTrIds([]); }}>
              <option value="">対象の会社を選択してください</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
            </select>

            {view === 'print_tr' && printCoId && (
              <div style={{ marginBottom: '20px' }}>
                <p style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '10px' }}>印刷する実習生を選択：</p>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {companies.find(c => c.id === printCoId)?.trainees.map((t: any) => (
                    <button key={t.id} onClick={() => setPrintTrIds(prev => prev.includes(t.id) ? prev.filter(id => id !== t.id) : [...prev, t.id])} style={{ ...btnBase, backgroundColor: printTrIds.includes(t.id) ? colors.accent : colors.lightGray, color: printTrIds.includes(t.id) ? '#fff' : colors.text }}>{t.traineeName}</button>
                  ))}
                </div>
              </div>
            )}

            {(printCoId && (view === 'print_co' || printTrIds.length > 0)) && (
              <div>
                <p style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '10px' }}>出力項目を選択：</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '8px', padding: '15px', backgroundColor: '#f9f9f9', borderRadius: '4px', marginBottom: '20px' }}>
                  {Object.keys(view === 'print_tr' ? labelMapTr : labelMapCo).map(key => (
                    <label key={key} style={{ fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <input type="checkbox" checked={printFields.includes(key)} onChange={() => setPrintFields(prev => prev.includes(key) ? prev.filter(f => f !== key) : [...prev, key])} />
                      {(view === 'print_tr' ? labelMapTr : labelMapCo)[key]}
                    </label>
                  ))}
                </div>
                <button onClick={() => { setIsPreview(true); setTimeout(() => window.print(), 500); }} style={{ ...btnBase, backgroundColor: colors.accent, color: '#fff', width: '200px', fontSize: '15px' }}>プレビュー・印刷</button>
              </div>
            )}
          </div>
        )}

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
        {showTrForm && <TrFormModal trFormData={trFormData} setTrFormData={setTrFormData} handleSaveTrainee={handleSaveTrainee} setShowTrForm={setShowTrForm} colors={colors} btnBase={btnBase} isEditingTr={isEditingTr} companies={companies} editingPhaseIdx={editingPhaseIdx} currentCoId={currentCo?.id} />}
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
          <h2 style={{ fontSize: '18px', marginBottom: '20px', borderBottom: `2px solid ${colors.main}`, paddingBottom: '10px' }}>
            <a href={`https://www.google.com/search?q=${encodeURIComponent(currentCo.companyName)}`} target="_blank" rel="noopener noreferrer" style={{ color: colors.text, textDecoration: 'underline' }}>
              {currentCo.companyName} <span style={{fontSize: '14px', display: 'inline-block'}}>🔗</span>
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
                    <button onClick={() => setFilterBatch('すべて')} style={{ padding: '4px 10px', fontSize: '11px', border: 'none', borderRadius: '4px', cursor: 'pointer', backgroundColor: filterBatch === 'すべて' ? colors.white : 'transparent', color: filterBatch === 'すべて' ? colors.accent : colors.gray }}>すべて</button>
                    {batchOptions.filter(b => b !== "なし" && (currentCo.trainees || []).some((t: any) => t.batch === b)).map(b => (
                      <button key={b} onClick={() => setFilterBatch(b)} style={{ padding: '4px 10px', fontSize: '11px', border: 'none', borderRadius: '4px', cursor: 'pointer', backgroundColor: filterBatch === b ? colors.white : 'transparent', color: filterBatch === b ? colors.accent : colors.gray }}>{b}</button>
                    ))}
                  </div>
                </div>
              </div>
              {categoryOptions.map(cat => {
                const list = (currentCo.trainees || []).filter((t: any) => (t.category === cat && (filterBatch === 'すべて' || t.batch === filterBatch)));
                if (list.length === 0) return null;
                return (
                  <div key={cat} style={{ marginBottom: '25px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 'bold', color: cat === "実習終了" ? '#CCC' : colors.accent, marginBottom: '10px' }}>{cat}</div>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                      {list.map((t: any) => {
                        const isAlert = checkAlert(t.stayLimit, t.category) || checkAlert(t.passportLimit, t.category);
                        const bgColor = batchColorMap[t.batch] || "#FFFFFF";
                        return (
                          <button key={t.id} onClick={() => { setSelectedTrId(t.id); setActiveTab('current'); }} style={{ padding: '12px 24px', backgroundColor: bgColor, border: isAlert ? `2px solid ${colors.danger}` : `1px solid ${colors.border}`, borderRadius: sharpRadius, cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
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
            <div style={{ backgroundColor: '#FFF', padding: '35px', border: `1px solid ${colors.border}`, borderRadius: sharpRadius }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '25px' }}>
                <h3 style={{ fontSize: '20px' }}>{(activeTab === 'current' ? currentTrainee : currentTrainee.phaseHistory[activeTab as number]).traineeName}</h3>
                {activeTab === 'current' && currentTrainee.phaseHistory?.length > 0 && (
                  <button onClick={() => handleUndoPhaseChange(currentTrainee.id)} style={{ padding: '4px 10px', fontSize: '10px', backgroundColor: 'transparent', border: `1px solid ${colors.border}`, color: colors.gray, cursor: 'pointer' }}>区分変更取消</button>
                )}
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
                        <span style={{ fontWeight: 'bold', color: isAlertField ? colors.danger : colors.text }}>{data[k] || '-'} {isAlertField && "⚠️"}</span>
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