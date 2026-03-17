"use client";
import { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, addDoc, getDocs, query, orderBy, doc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import Papa from 'papaparse';

import { 
  labelMapCo, labelMapTr, categoryOptions, batchOptions, 
  batchColorMap, initialCompanyForm, initialTraineeForm 
} from './lib/constants';
import { convertToAD, checkAlert, calculateAge } from './lib/utils';
// モーダルをインポート
import { CoFormModal, TrFormModal, AddTraineeModal } from './components/Modals';

export default function Home() {
  // --- 状態管理 (State) ---
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

  // --- デザイン設定 ---
  const colors = { main: '#FFF9F0', accent: '#F57C00', text: '#2C3E50', gray: '#95A5A6', lightGray: '#F2F2F2', border: '#E0E0E0', white: '#FFFFFF', danger: '#E74C3C' };
  const sharpRadius = '4px';
  const btnBase = { padding: '10px 18px', borderRadius: sharpRadius, border: 'none', cursor: 'pointer', fontWeight: '600' as const, fontSize: '13px' };
  const grayCBtn = { width: '20px', height: '20px', fontSize: '9px', cursor: 'pointer', backgroundColor: 'transparent', border: `1px solid ${colors.border}`, borderRadius: '3px', color: colors.gray, marginLeft: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' };

  // --- データ取得 ---
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

  // --- 保存・削除ロジック ---
  const handleSaveCompany = async () => {
    if (!coFormData.companyName) { alert("会社名は必須です"); return; }
    try {
      if (isEditingCo && currentCo?.id) {
        await updateDoc(doc(db, "companies", currentCo.id), coFormData);
      } else {
        await addDoc(collection(db, "companies"), { ...coFormData, trainees: [], createdAt: serverTimestamp() });
      }
      setShowCoForm(false);
      fetchCompanies();
    } catch (e) { alert("保存エラー"); }
  };

  const handleSaveTrainee = async () => {
    if (!currentCo?.id) return;
    try {
      let updatedTrainees = [...(currentCo.trainees || [])];
      if (isEditingTr) {
        updatedTrainees = updatedTrainees.map((t: any) => {
          if (t.id === trFormData.id) {
            if (editingPhaseIdx !== null) {
              const newHistory = [...(t.phaseHistory || [])];
              newHistory[editingPhaseIdx] = trFormData;
              return { ...t, phaseHistory: newHistory };
            }
            return trFormData;
          }
          return t;
        });
      }
      await updateDoc(doc(db, "companies", currentCo.id), { trainees: updatedTrainees });
      setShowTrForm(false);
      fetchCompanies();
    } catch (e) { alert("保存エラー"); }
  };

  // CSV・新規追加の受け皿
  const handleAddTraineeConfirm = async (payload: any) => {
    const targetId = currentCo?.id;
    if (!targetId) return;
    try {
      let updatedTrainees = [...(currentCo.trainees || [])];
      if (payload.type === 'csv') {
        const newTrainees = payload.data.map((row: any) => {
          const birthday = convertToAD(row["生年月日"] || "");
          return {
            ...initialTraineeForm,
            id: Date.now() + Math.random(),
            traineeName: row["実習生氏名"] || "",
            kana: row["フリガナ"] || "",
            batch: row["バッチ(期生)"] || "",
            status: row["ステータス"] || "入国待機",
            zip: row["郵便番号"] || "",
            address: row["住所"] || "",
            nationality: row["国籍"] || "ベトナム",
            birthday,
            category: "第1号",
            age: calculateAge(birthday),
            phaseHistory: []
          };
        });
        updatedTrainees = [...updatedTrainees, ...newTrainees];
      } else {
        updatedTrainees = [...updatedTrainees, { ...payload.data, id: Date.now(), phaseHistory: [] }];
      }
      await updateDoc(doc(db, "companies", targetId), { trainees: updatedTrainees });
      fetchCompanies();
    } catch (e) { alert("追加エラー"); }
  };

  // --- UI部品 (省略なし) ---
  const totalActiveTrainees = companies.reduce((sum, c) => 
    sum + (c.trainees || []).filter((t: any) => t.category !== "実習終了").length, 0
  );

  // メイン画面 (一覧)
  if (view === 'list') {
    return (
      <main style={{ padding: '40px', backgroundColor: '#F9F9F9', minHeight: '100vh', color: colors.text }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '40px', alignItems: 'flex-end' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '800' }}>アシストねっと協同組合</h1>
            <p style={{ fontSize: '12px', color: colors.gray }}>技能実習生管理システム</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '12px', color: colors.gray }}>組合全体受入人数</div>
            <div style={{ fontSize: '24px', fontWeight: '800', color: colors.accent }}>{totalActiveTrainees} <span style={{ fontSize: '14px', color: colors.text }}>名</span></div>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={() => { setIsEditingCo(false); setCoFormData(initialCompanyForm); setShowCoForm(true); }} style={{ ...btnBase, backgroundColor: colors.accent, color: '#fff' }}>＋ 新規実施者</button>
          </div>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '25px' }}>
          {companies.map(c => {
            const hasAlert = (c.trainees || []).some((t: any) => checkAlert(t.stayLimit, t.category) || checkAlert(t.passportLimit, t.category));
            return (
              <div key={c.id} onClick={() => { setCurrentCo(c); setView('detail'); }} style={{ backgroundColor: '#fff', padding: '24px', borderRadius: sharpRadius, border: hasAlert ? `2px solid ${colors.danger}` : `1px solid ${colors.border}`, cursor: 'pointer', position: 'relative' }}>
                <div style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '10px' }}>{c.companyName}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '13px', color: colors.gray }}>受入人数</span>
                  <span style={{ fontSize: '18px', fontWeight: '800', color: colors.accent }}>{(c.trainees || []).length} 名</span>
                </div>
                {hasAlert && <div style={{ position: 'absolute', top: '-10px', right: '10px', backgroundColor: colors.danger, color: '#fff', fontSize: '10px', padding: '2px 8px', borderRadius: '10px' }}>期限注意</div>}
              </div>
            );
          })}
        </div>
        <CoFormModal isOpen={showCoForm} onClose={() => setShowCoForm(false)} coFormData={coFormData} setCoFormData={setCoFormData} handleSaveCo={handleSaveCompany} />
      </main>
    );
  }

  // 詳細画面
  const currentTrainee = currentCo.trainees?.find((t: any) => t.id === selectedTrId);

  return (
    <main style={{ backgroundColor: '#FBFBFB', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <nav style={{ padding: '15px 30px', backgroundColor: '#FFF', borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={() => { setView('list'); setSelectedTrId(null); }} style={{ background: 'none', border: 'none', color: colors.gray, cursor: 'pointer', fontWeight: 'bold' }}>← 一覧に戻る</button>
        <div style={{ display: 'flex', gap: '10px' }}>
          {!selectedTrId ? (
            <>
              <button onClick={() => { setIsEditingTr(false); setShowTrForm(true); }} style={{ ...btnBase, backgroundColor: colors.accent, color: '#fff' }}>＋ 実習生追加</button>
              <button onClick={() => { setIsEditingCo(true); setCoFormData(currentCo); setShowCoForm(true); }} style={{ ...btnBase, backgroundColor: colors.accent, color: '#fff' }}>会社編集</button>
            </>
          ) : (
            <>
              <button onClick={() => { setTrFormData(activeTab === 'current' ? currentTrainee : currentTrainee.phaseHistory[activeTab as number]); setIsEditingTr(true); setEditingPhaseIdx(activeTab === 'current' ? null : (activeTab as number)); setShowTrForm(true); }} style={{ ...btnBase, backgroundColor: colors.accent, color: '#fff' }}>編集</button>
              <button onClick={() => setSelectedTrId(null)} style={{ ...btnBase, backgroundColor: colors.lightGray }}>閉じる</button>
            </>
          )}
        </div>
      </nav>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', flex: 1, backgroundColor: colors.border, gap: '1px' }}>
        <aside style={{ backgroundColor: '#FFF', padding: '30px', overflowY: 'auto' }}>
          <h2 style={{ fontSize: '18px', marginBottom: '20px' }}>{currentCo.companyName}</h2>
          {Object.keys(labelMapCo).map(k => (
            <div key={k} style={{ marginBottom: '14px', fontSize: '11px' }}>
              <span style={{ color: colors.gray, display: 'block' }}>{labelMapCo[k]}</span>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ fontWeight: '600', fontSize: '13px' }}>{currentCo[k] || '-'}</span>
                <button onClick={() => copy(currentCo[k])} style={grayCBtn}>C</button>
              </div>
            </div>
          ))}
        </aside>

        <section style={{ padding: '40px', overflowY: 'auto', backgroundColor: '#FBFBFB' }}>
          {!selectedTrId ? (
            <div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {categoryOptions.map(cat => (
                  <div key={cat} style={{ width: '100%', marginBottom: '20px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 'bold', color: colors.accent, marginBottom: '10px' }}>{cat}</div>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      {(currentCo.trainees || []).filter((t: any) => t.category === cat).map((t: any) => (
                        <button key={t.id} onClick={() => { setSelectedTrId(t.id); setActiveTab('current'); }} style={{ padding: '12px 20px', backgroundColor: batchColorMap[t.batch] || '#fff', border: `1px solid ${colors.border}`, borderRadius: '4px', fontWeight: 'bold' }}>
                          {t.traineeName}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ backgroundColor: '#FFF', padding: '35px', borderRadius: sharpRadius, border: `1px solid ${colors.border}` }}>
              <h3 style={{ fontSize: '20px', marginBottom: '20px' }}>{currentTrainee.traineeName}</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 40px' }}>
                {Object.keys(labelMapTr).map(k => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F8F8F8', padding: '10px 0' }}>
                    <span style={{ color: colors.gray, fontSize: '14px' }}>{labelMapTr[k]}</span>
                    <span style={{ fontWeight: 'bold' }}>{currentTrainee[k] || '-'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      <CoFormModal isOpen={showCoForm} onClose={() => setShowCoForm(false)} coFormData={coFormData} setCoFormData={setCoFormData} handleSaveCo={handleSaveCompany} />
      <TrFormModal isOpen={showTrForm && isEditingTr} onClose={() => setShowTrForm(false)} trFormData={trFormData} setTrFormData={setTrFormData} handleSaveTrainee={handleSaveTrainee} />
      <AddTraineeModal isOpen={showTrForm && !isEditingTr} onClose={() => setShowTrForm(false)} onConfirm={handleAddTraineeConfirm} companyName={currentCo.companyName} />
    </main>
  );
}