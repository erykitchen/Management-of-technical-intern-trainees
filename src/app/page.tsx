"use client";

import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { 
  collection, addDoc, getDocs, query, orderBy, doc, updateDoc, deleteDoc, serverTimestamp 
} from "firebase/firestore";

// 外部定義ファイルとの連携
import { 
  labelMapCo, labelMapTr, categoryOptions, batchOptions, 
  batchColorMap, initialCompanyForm, initialTraineeForm 
} from './lib/constants';
import { convertToAD, checkAlert } from './lib/utils';
import { CoFormModal, TrFormModal } from './components/Modals';

export default function Home() {
  // 画面状態の管理
  const [view, setView] = useState<'list' | 'detail'>('list');
  const [showTrForm, setShowTrForm] = useState(false);
  const [showCoForm, setShowCoForm] = useState(false);
  const [isEditingTr, setIsEditingTr] = useState(false);
  const [isEditingCo, setIsEditingCo] = useState(false);
  const [currentCo, setCurrentCo] = useState<any>(null);
  const [selectedTrId, setSelectedTrId] = useState<number | null>(null);
  const [companies, setCompanies] = useState<any[]>([]);
  const [trFormData, setTrFormData] = useState<any>(initialTraineeForm);
  const [coFormData, setCoFormData] = useState<any>(initialCompanyForm);
  
  // 以前あったフィルタと印刷モードを復元
  const [filterBatch, setFilterBatch] = useState<string>('すべて');
  const [isPrintMode, setIsPrintMode] = useState(false);

  // デザイン定義（以前のコードを1px単位で維持）
  const colors = { main: '#FFF9F0', accent: '#F57C00', text: '#2C3E50', gray: '#95A5A6', border: '#E0E0E0', white: '#FFFFFF', danger: '#E74C3C', lightGray: '#F2F2F2' };
  const sharpRadius = '4px';
  const btnBase = { padding: '10px 18px', borderRadius: sharpRadius, border: 'none', cursor: 'pointer', fontWeight: '600' as const, fontSize: '13px' };

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

  // 保存ロジック（Modals.tsxから呼び出されます）
  const handleSaveTrainee = async () => {
    if (!currentCo) return;
    const cleanedData = { ...trFormData };
    // 日付の西暦変換を適用
    Object.keys(cleanedData).forEach(key => {
      if (typeof cleanedData[key] === 'string' && key !== 'memo') cleanedData[key] = convertToAD(cleanedData[key]);
    });

    try {
      let updatedTrainees = [...(currentCo.trainees || [])];
      if (isEditingTr) {
        updatedTrainees = updatedTrainees.map((t: any) => t.id === trFormData.id ? cleanedData : t);
      } else {
        updatedTrainees.push({ ...cleanedData, id: Date.now(), phaseHistory: [] });
      }
      await updateDoc(doc(db, "companies", currentCo.id), { trainees: updatedTrainees });
      setShowTrForm(false);
      fetchCompanies();
    } catch (e) { alert("保存エラー"); }
  };

  const handleSaveCompany = async () => {
    try {
      if (isEditingCo && currentCo) {
        await updateDoc(doc(db, "companies", currentCo.id), coFormData);
      } else {
        await addDoc(collection(db, "companies"), { ...coFormData, trainees: [], createdAt: serverTimestamp() });
      }
      setShowCoForm(false);
      fetchCompanies();
    } catch (e) { alert("エラーが発生しました"); }
  };

  // --- 1. メイン一覧表示 ---
  if (view === 'list') {
    return (
      <main style={{ padding: '40px', backgroundColor: '#F9F9F9', minHeight: '100vh', color: colors.text }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px', alignItems: 'center' }}>
          <h1 style={{ fontSize: '24px', fontWeight: '800', letterSpacing: '-0.5px' }}>技能実習生管理システム</h1>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => setIsPrintMode(!isPrintMode)} style={{ ...btnBase, backgroundColor: isPrintMode ? colors.text : colors.white, color: isPrintMode ? '#fff' : colors.text, border: `1px solid ${colors.border}` }}>
              {isPrintMode ? '印刷選択を解除' : '印刷用一括選択'}
            </button>
            <button onClick={() => { setIsEditingCo(false); setCoFormData(initialCompanyForm); setShowCoForm(true); }} style={{ ...btnBase, backgroundColor: colors.accent, color: '#fff' }}>
              ＋ 新規実施者を追加
            </button>
          </div>
        </header>

        {/* 以前あったフィルタボタン群を復元 */}
        <div style={{ marginBottom: '25px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {['すべて', ...batchOptions].map(b => (
            <button key={b} onClick={() => setFilterBatch(b)} style={{ ...btnBase, fontSize: '11px', padding: '6px 14px', backgroundColor: filterBatch === b ? colors.text : colors.white, color: filterBatch === b ? '#fff' : colors.text, border: `1px solid ${colors.border}` }}>
              {b}
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '20px' }}>
          {companies.map(c => {
            const trainees = c.trainees || [];
            // フィルタリングロジックの復元
            const filteredTrainees = trainees.filter((t: any) => 
              (filterBatch === 'すべて' || t.batch === filterBatch) && t.category !== "実習終了"
            );
            const hasAlert = trainees.some((t: any) => checkAlert(t.stayLimit, t.category));

            return (
              <div key={c.id} onClick={() => { if(!isPrintMode) { setCurrentCo(c); setView('detail'); } }} style={{ backgroundColor: '#fff', padding: '25px', borderRadius: sharpRadius, border: hasAlert ? `2px solid ${colors.danger}` : `1px solid ${colors.border}`, cursor: isPrintMode ? 'default' : 'pointer', transition: 'all 0.2s' }}>
                <div style={{ fontWeight: '800', fontSize: '17px', marginBottom: '15px' }}>{c.companyName}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {filteredTrainees.map((t: any) => (
                    <span key={t.id} style={{ fontSize: '11px', padding: '4px 10px', backgroundColor: batchColorMap[t.batch] || '#f0f0f0', borderRadius: '4px', fontWeight: '600', border: checkAlert(t.stayLimit, t.category) ? `1px solid ${colors.danger}` : 'none' }}>
                      {t.traineeName}
                    </span>
                  ))}
                  {filteredTrainees.length === 0 && <span style={{ color: colors.gray, fontSize: '12px' }}>該当なし</span>}
                </div>
              </div>
            );
          })}
        </div>
        
        {showCoForm && <CoFormModal coFormData={coFormData} setCoFormData={setCoFormData} handleSaveCompany={handleSaveCompany} setShowCoForm={setShowCoForm} colors={colors} btnBase={btnBase} isEditing={isEditingCo} />}
      </main>
    );
  }

  // --- 2. 詳細表示画面 ---
  return (
    <main style={{ backgroundColor: '#FBFBFB', minHeight: '100vh' }}>
      <nav style={{ padding: '15px 30px', backgroundColor: '#FFF', borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10 }}>
        <button onClick={() => { setView('list'); setSelectedTrId(null); }} style={{ background: 'none', border: 'none', color: colors.gray, cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>← 一覧に戻る</button>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => { setIsEditingCo(true); setCoFormData(currentCo); setShowCoForm(true); }} style={{ ...btnBase, backgroundColor: colors.white, border: `1px solid ${colors.border}`, color: colors.text }}>実施者情報を編集</button>
          <button onClick={() => { setTrFormData({...initialTraineeForm, targetCompanyId: currentCo.id}); setIsEditingTr(false); setShowTrForm(true); }} style={{ ...btnBase, backgroundColor: colors.accent, color: '#fff' }}>＋ 実習生を追加</button>
        </div>
      </nav>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', minHeight: 'calc(100vh - 65px)' }}>
        <aside style={{ backgroundColor: '#FFF', padding: '30px', borderRight: `1px solid ${colors.border}` }}>
          <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '25px', color: colors.text, lineHeight: '1.4' }}>{currentCo.companyName}</h2>
          {Object.keys(labelMapCo).map(k => (
            <div key={k} style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '11px', color: colors.gray, display: 'block', marginBottom: '5px', fontWeight: 'bold', textTransform: 'uppercase' }}>{labelMapCo[k]}</label>
              <div style={{ fontSize: '14px', fontWeight: '600', color: colors.text }}>{currentCo[k] || '未設定'}</div>
            </div>
          ))}
          <button onClick={() => { if(confirm("この実施者を削除しますか？")) { deleteDoc(doc(db, "companies", currentCo.id)); setView('list'); fetchCompanies(); } }} style={{ marginTop: '30px', color: colors.danger, background: 'none', border: 'none', fontSize: '12px', cursor: 'pointer' }}>実施者の削除</button>
        </aside>

        <section style={{ padding: '40px' }}>
          {categoryOptions.map(cat => {
            const list = (currentCo.trainees || []).filter((t: any) => t.category === cat);
            if (list.length === 0) return null;
            return (
              <div key={cat} style={{ marginBottom: '40px' }}>
                <div style={{ fontSize: '14px', fontWeight: '800', color: colors.accent, marginBottom: '18px', display: 'flex', alignItems: 'center' }}>
                  <span style={{ width: '4px', height: '16px', backgroundColor: colors.accent, marginRight: '10px', borderRadius: '2px' }}></span>
                  {cat}（{list.length}名）
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px' }}>
                  {list.map((t: any) => (
                    <div key={t.id} onClick={() => { setTrFormData(t); setIsEditingTr(true); setShowTrForm(true); }} style={{ padding: '18px', backgroundColor: batchColorMap[t.batch] || '#fff', border: checkAlert(t.stayLimit, t.category) ? `2px solid ${colors.danger}` : `1px solid ${colors.border}`, borderRadius: sharpRadius, cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', position: 'relative' }}>
                      <div style={{ fontWeight: 'bold', fontSize: '15px', marginBottom: '8px' }}>{t.traineeName}</div>
                      <div style={{ fontSize: '11px', color: colors.gray }}>{t.status}</div>
                      <div style={{ fontSize: '11px', fontWeight: 'bold', marginTop: '4px' }}>{t.batch}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </section>
      </div>

      {showTrForm && <TrFormModal trFormData={trFormData} setTrFormData={setTrFormData} handleSaveTrainee={handleSaveTrainee} setShowTrForm={setShowTrForm} colors={colors} btnBase={btnBase} isEditingTr={isEditingTr} companies={companies} currentCoId={currentCo?.id} />}
    </main>
  );
}