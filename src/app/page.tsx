"use client";

import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { 
  collection, addDoc, getDocs, query, orderBy, doc, updateDoc, deleteDoc, serverTimestamp 
} from "firebase/firestore";

// 外部ファイルから定数と関数を読み込み
import { 
  labelMapCo, labelMapTr, categoryOptions, batchOptions, 
  batchColorMap, initialCompanyForm, initialTraineeForm 
} from './lib/constants';

import { 
  convertToAD, checkAlert 
} from './lib/utils';

import { 
  CoFormModal, TrFormModal 
} from './components/Modals';

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

  // デザイン定義（以前のものを完全維持）
  const colors = { main: '#FFF9F0', accent: '#F57C00', text: '#2C3E50', gray: '#95A5A6', border: '#E0E0E0', white: '#FFFFFF', danger: '#E74C3C', lightGray: '#F2F2F2' };
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

  // --- 実習生保存ロジック ---
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

  // --- 会社保存・削除ロジック ---
  const handleSaveCompany = async () => {
    if (!coFormData.companyName) return;
    try {
      if (isEditingCo && currentCo?.id) {
        await updateDoc(doc(db, "companies", currentCo.id), coFormData);
      } else {
        await addDoc(collection(db, "companies"), { ...coFormData, trainees: [], createdAt: serverTimestamp() });
      }
      setShowCoForm(false);
      fetchCompanies();
    } catch (e) { alert("エラー"); }
  };

  const handleDeleteCompany = async () => {
    if (!currentCo?.id || !confirm("削除しますか？")) return;
    await deleteDoc(doc(db, "companies", currentCo.id));
    setView('list'); fetchCompanies();
  };

  if (view === 'list') {
    return (
      <main style={{ padding: '40px', backgroundColor: '#F9F9F9', minHeight: '100vh', color: colors.text }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '40px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: '800' }}>技能実習生管理システム</h1>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={() => { setIsEditingCo(false); setCoFormData(initialCompanyForm); setShowCoForm(true); }} style={{ ...btnBase, backgroundColor: colors.accent, color: '#fff' }}>＋ 新規実施者</button>
          </div>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '25px' }}>
          {companies.map(c => {
            const activeCount = (c.trainees || []).filter((t: any) => t.category !== "実習終了").length;
            const hasAlert = (c.trainees || []).some((t: any) => checkAlert(t.stayLimit, t.category));
            return (
              <div key={c.id} onClick={() => { setCurrentCo(c); setView('detail'); }} style={{ backgroundColor: '#fff', padding: '24px', borderRadius: sharpRadius, border: hasAlert ? `2px solid ${colors.danger}` : `1px solid ${colors.border}`, cursor: 'pointer' }}>
                <div style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '10px' }}>{c.companyName}</div>
                <div style={{ fontSize: '13px', color: colors.gray }}>受入人数: <span style={{ fontWeight: '800', color: colors.accent }}>{activeCount} 名</span></div>
              </div>
            );
          })}
        </div>
        {showCoForm && <CoFormModal coFormData={coFormData} setCoFormData={setCoFormData} handleSaveCompany={handleSaveCompany} setShowCoForm={setShowCoForm} colors={colors} btnBase={btnBase} isEditing={isEditingCo} />}
      </main>
    );
  }

  // 詳細画面
  const currentTrainee = currentCo.trainees?.find((t: any) => t.id === selectedTrId);

  return (
    <main style={{ backgroundColor: '#FBFBFB', minHeight: '100vh' }}>
      <nav style={{ padding: '15px 30px', backgroundColor: '#FFF', borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between' }}>
        <button onClick={() => { setView('list'); setSelectedTrId(null); }} style={{ background: 'none', border: 'none', color: colors.gray, cursor: 'pointer' }}>← 一覧に戻る</button>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => { setTrFormData({...initialTraineeForm, targetCompanyId: currentCo.id}); setIsEditingTr(false); setShowTrForm(true); }} style={{ ...btnBase, backgroundColor: colors.accent, color: '#fff' }}>＋ 実習生追加</button>
        </div>
      </nav>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', minHeight: 'calc(100vh - 65px)' }}>
        <aside style={{ backgroundColor: '#FFF', padding: '30px', borderRight: `1px solid ${colors.border}` }}>
          <h2 style={{ fontSize: '18px', marginBottom: '20px' }}>{currentCo.companyName}</h2>
          {Object.keys(labelMapCo).map(k => (
            <div key={k} style={{ marginBottom: '14px', fontSize: '11px' }}>
              <span style={{ color: colors.gray, display: 'block' }}>{labelMapCo[k]}</span>
              <span style={{ fontWeight: '600' }}>{currentCo[k] || '-'}</span>
            </div>
          ))}
        </aside>

        <section style={{ padding: '40px' }}>
          {!selectedTrId ? (
            <div>
              {categoryOptions.map(cat => {
                const list = (currentCo.trainees || []).filter((t: any) => t.category === cat);
                if (list.length === 0) return null;
                return (
                  <div key={cat} style={{ marginBottom: '25px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 'bold', color: colors.accent, marginBottom: '10px' }}>{cat}</div>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                      {list.map((t: any) => (
                        <button key={t.id} onClick={() => { setSelectedTrId(t.id); setActiveTab('current'); }} style={{ padding: '12px 24px', backgroundColor: batchColorMap[t.batch] || "#FFF", border: `1px solid ${colors.border}`, borderRadius: sharpRadius, cursor: 'pointer', fontWeight: 'bold' }}>
                          {t.traineeName}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ backgroundColor: '#FFF', padding: '35px', borderRadius: sharpRadius, border: `1px solid ${colors.border}` }}>
              <h3 style={{ fontSize: '20px', marginBottom: '25px' }}>{currentTrainee.traineeName}</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 40px' }}>
                {Object.keys(labelMapTr).map(k => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `1px solid #F8F8F8`, padding: '10px 0' }}>
                    <span style={{ color: colors.gray, fontSize: '13px' }}>{labelMapTr[k]}</span>
                    <span style={{ fontWeight: 'bold' }}>{currentTrainee[k] || '-'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
      {showTrForm && <TrFormModal trFormData={trFormData} setTrFormData={setTrFormData} handleSaveTrainee={handleSaveTrainee} setShowTrForm={setShowTrForm} colors={colors} btnBase={btnBase} isEditingTr={isEditingTr} companies={companies} editingPhaseIdx={editingPhaseIdx} currentCoId={currentCo?.id} />}
    </main>
  );
}