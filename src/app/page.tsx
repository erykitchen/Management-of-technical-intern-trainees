"use client";

import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, addDoc, onSnapshot, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { 
  labelMapCo, labelMapTr, batchColorMap, initialCompanyForm, initialTraineeForm, 
  categoryOptions, batchOptions 
} from './lib/constants';
import { checkAlert } from './lib/utils';
import { CoFormModal, TrFormModal } from './components/Modals';

// --- スタイル・基本設定 ---
const colors = {
  main: '#E6EEF6', accent: '#344EAD', text: '#333', gray: '#888',
  lightGray: '#F2F2F2', border: '#E0E0E0', white: '#FFF', danger: '#D32F2F'
};
const btnBase: React.CSSProperties = {
  padding: '8px 18px', borderRadius: '4px', border: 'none', cursor: 'pointer',
  fontWeight: 'bold', fontSize: '13px', transition: '0.2s', display: 'flex', alignItems: 'center', gap: '5px'
};
const grayCBtn: React.CSSProperties = {
  marginLeft: '8px', padding: '2px 6px', fontSize: '10px', backgroundColor: '#EEE',
  border: '1px solid #CCC', borderRadius: '3px', cursor: 'pointer', color: '#666'
};
const sharpRadius = '2px';

export default function Home() {
  // --- States ---
  const [companies, setCompanies] = useState<any[]>([]);
  const [view, setView] = useState<'list' | 'detail' | 'print_tr' | 'print_co'>('list');
  const [currentCo, setCurrentCo] = useState<any>(null);
  const [selectedTrId, setSelectedTrId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'current' | number>('current');
  const [filterBatch, setFilterBatch] = useState('すべて');

  // Modals
  const [showCoForm, setShowCoForm] = useState(false);
  const [showTrForm, setShowTrForm] = useState(false);
  const [isEditingCo, setIsEditingCo] = useState(false);
  const [isEditingTr, setIsEditingTr] = useState(false);
  const [editingPhaseIdx, setEditingPhaseIdx] = useState<number | null>(null);
  const [coFormData, setCoFormData] = useState<any>(initialCompanyForm);
  const [trFormData, setTrFormData] = useState<any>(initialTraineeForm);

  // Print
  const [printFields, setPrintFields] = useState<string[]>([]);
  const [isPreview, setIsPreview] = useState(false);

  // --- Firestore Realtime Sync ---
  useEffect(() => {
    return onSnapshot(collection(db, "companies"), (snapshot) => {
      setCompanies(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, []);

  useEffect(() => {
    if (currentCo) {
      const updated = companies.find(c => c.id === currentCo.id);
      if (updated) setCurrentCo(updated);
    }
  }, [companies]);

  // --- Handlers ---
  const copy = (txt: string) => { if (txt) { navigator.clipboard.writeText(txt); alert("コピーしました"); } };

  const handleSaveCompany = async () => {
    try {
      if (isEditingCo) {
        await updateDoc(doc(db, "companies", coFormData.id), coFormData);
      } else {
        await addDoc(collection(db, "companies"), { ...coFormData, trainees: [] });
      }
      setShowCoForm(false);
      setCoFormData(initialCompanyForm);
    } catch (e) { alert("エラーが発生しました"); }
  };

  const handleDeleteCompany = async () => {
    if (confirm("この会社と所属する実習生データをすべて削除しますか？")) {
      await deleteDoc(doc(db, "companies", currentCo.id));
      setView('list');
    }
  };

  const handleSaveTrainee = async () => {
    const targetId = trFormData.targetCompanyId || currentCo?.id;
    if (!targetId) return alert("会社を選択してください");
    const targetComp = companies.find(c => c.id === targetId);
    if (!targetComp) return;

    let newTrainees = [...(targetComp.trainees || [])];
    if (isEditingTr) {
      const idx = newTrainees.findIndex(t => t.id === trFormData.id);
      if (editingPhaseIdx !== null) {
        newTrainees[idx].phaseHistory[editingPhaseIdx] = { ...trFormData };
      } else {
        newTrainees[idx] = { ...trFormData };
      }
    } else {
      newTrainees.push({ ...trFormData, id: Date.now().toString() });
    }

    await updateDoc(doc(db, "companies", targetId), { trainees: newTrainees });
    setShowTrForm(false);
    setTrFormData(initialTraineeForm);
  };

  const handleDeleteTrainee = async () => {
    if (confirm("この実習生を削除しますか？")) {
      const newTrainees = currentCo.trainees.filter((t: any) => t.id !== selectedTrId);
      await updateDoc(doc(db, "companies", currentCo.id), { trainees: newTrainees });
      setSelectedTrId(null);
    }
  };

  const handleUndoPhaseChange = async (trId: string) => {
    if (!confirm("最新の区分変更を取り消し、履歴の最後を現役に復元しますか？")) return;
    const newTrainees = currentCo.trainees.map((t: any) => {
      if (t.id === trId && t.phaseHistory?.length > 0) {
        const history = [...t.phaseHistory];
        const last = history.pop();
        return { ...last, phaseHistory: history };
      }
      return t;
    });
    await updateDoc(doc(db, "companies", currentCo.id), { trainees: newTrainees });
  };

  // --- Render Helpers ---
  if (isPreview) {
    const dataList = view === 'print_tr' ? (currentCo.trainees || []) : [currentCo];
    const labels = view === 'print_tr' ? labelMapTr : labelMapCo;
    return (
      <div style={{ padding: '40px', backgroundColor: '#fff' }}>
        <button className="no-print" onClick={() => setIsPreview(false)} style={{ marginBottom: '20px', padding: '10px' }}>戻る</button>
        {dataList.map((item: any, i: number) => (
          <div key={i} style={{ marginBottom: '50px', pageBreakAfter: 'always' }}>
            <h2 style={{ borderBottom: '2px solid #333', paddingBottom: '5px', marginBottom: '20px' }}>
              {view === 'print_tr' ? `実習生情報: ${item.traineeName}` : `会社情報: ${item.companyName}`}
            </h2>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {printFields.map(f => (
                  <tr key={f}>
                    <td style={{ border: '1px solid #ccc', padding: '8px', backgroundColor: '#f5f5f5', width: '30%', fontSize: '12px' }}>{labels[f]}</td>
                    <td style={{ border: '1px solid #ccc', padding: '8px', fontSize: '13px' }}>{item[f] || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
        <style>{`@media print { .no-print { display: none; } }`}</style>
      </div>
    );
  }

  if (view === 'list') {
    return (
      <main style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: '900', color: colors.accent, letterSpacing: '-0.5px' }}>Management Portal</h1>
          <button onClick={() => { setIsEditingCo(false); setCoFormData(initialCompanyForm); setShowCoForm(true); }} style={{ ...btnBase, backgroundColor: colors.accent, color: '#fff', padding: '12px 24px' }}>＋ 新規実施者(会社)登録</button>
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