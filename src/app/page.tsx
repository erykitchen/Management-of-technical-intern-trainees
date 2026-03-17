// app/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { 
  collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, orderBy 
} from 'firebase/firestore';
import { db } from './firebase'; // ここはご自身のパスに合わせてください

// --- 先ほど作った部品たちをインポートする ---
import { 
  labelMapCo, labelMapTr, batchColorMap, categoryOptions 
} from './lib/constants';
import { 
  convertToAD, checkAlert, calculateAge 
} from './lib/utils';
import { 
  CoFormModal, TrFormModal 
} from './components/Modals';

export default function Home() {
  // --- 1. ステート管理（データや表示の切り替え） ---
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentCoId, setCurrentCoId] = useState<string | null>(null);
  const [showCoForm, setShowCoForm] = useState(false);
  const [showTrForm, setShowTrForm] = useState(false);
  const [coFormData, setCoFormData] = useState<any>({});
  const [trFormData, setTrFormData] = useState<any>({});
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingTr, setIsEditingTr] = useState(false);
  const [editingTrId, setEditingTrId] = useState<string | null>(null);
  const [editingPhaseIdx, setEditingPhaseIdx] = useState<number | null>(null);
  const [isPreview, setIsPreview] = useState(false);

  // デザイン設定
  const colors = { primary: '#2563eb', secondary: '#059669', bg: '#f8fafc', text: '#1e293b' };
  const btnBase = { padding: '10px 20px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', border: 'none', transition: '0.2s' };

  // --- 2. データ取得 (Firestore) ---
  const fetchData = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "companies"), orderBy("companyName"));
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setCompanies(list);
    } catch (e) {
      console.error(e);
      alert("データ取得に失敗しました");
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // --- 3. 保存・削除のロジック ---
  const handleSaveCompany = async () => {
    if (!coFormData.companyName) return alert("会社名は必須です");
    try {
      if (isEditing && currentCoId) {
        await updateDoc(doc(db, "companies", currentCoId), coFormData);
      } else {
        await addDoc(collection(db, "companies"), { ...coFormData, trainees: [] });
      }
      setShowCoForm(false);
      fetchData();
    } catch (e) { console.error(e); }
  };

  const handleSaveTrainee = async () => {
    if (!currentCoId || !trFormData.traineeName) return alert("氏名は必須です");
    const co = companies.find(c => c.id === currentCoId);
    let newTrainees = [...(co.trainees || [])];

    if (isEditingTr && editingTrId) {
      // 編集：該当の実習生を探して更新
      newTrainees = newTrainees.map(t => {
        if (t.id === editingTrId) {
          const newPhases = [...t.phaseHistory];
          newPhases[editingPhaseIdx!] = trFormData;
          return { ...t, traineeName: trFormData.traineeName, phaseHistory: newPhases };
        }
        return t;
      });
    } else {
      // 新規追加
      newTrainees.push({
        id: Date.now().toString(),
        traineeName: trFormData.traineeName,
        phaseHistory: [trFormData]
      });
    }

    await updateDoc(doc(db, "companies", currentCoId), { trainees: newTrainees });
    setShowTrForm(false);
    fetchData();
  };

  // --- 4. メイン画面のJSX ---
  if (loading) return <div style={{ padding: '40px' }}>読み込み中...</div>;

  // 印刷プレビューモード
  if (isPreview) {
    return (
      <div style={{ padding: '20px', backgroundColor: 'white' }}>
        <button onClick={() => setIsPreview(false)} className="no-print" style={{ marginBottom: '20px', padding: '10px' }}>戻る</button>
        {/* 印刷用のテーブル表示をここに書く（今は省略） */}
        <h2>印刷プレビュー画面（開発中）</h2>
      </div>
    );
  }

  return (
    <main style={{ minHeight: '100vh', backgroundColor: colors.bg, color: colors.text, padding: '20px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: '800' }}>技能実習生管理システム</h1>
          <button 
            onClick={() => { setCoFormData({}); setIsEditing(false); setShowCoForm(true); }}
            style={{ ...btnBase, backgroundColor: colors.primary, color: 'white' }}
          >
            + 新規会社登録
          </button>
        </header>

        {/* 会社一覧表示部分 */}
        <div style={{ display: 'grid', gap: '20px' }}>
          {companies.map(co => (
            <div key={co.id} style={{ backgroundColor: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '20px' }}>{co.companyName}</h2>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => { setCoFormData(co); setCurrentCoId(co.id); setIsEditing(true); setShowCoForm(true); }}>編集</button>
                  <button onClick={() => { setCurrentCoId(co.id); setTrFormData({}); setIsEditingTr(false); setShowTrForm(true); }}>+ 実習生追加</button>
                </div>
              </div>
              
              {/* 実習生リストの簡易表示 */}
              <div style={{ marginTop: '15px' }}>
                {co.trainees?.map((tr: any) => (
                  <div key={tr.id} style={{ padding: '8px', borderBottom: '1px solid #eee' }}>
                    {tr.traineeName} ({tr.phaseHistory[tr.phaseHistory.length - 1].category})
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* --- 分離したモーダルを呼び出す --- */}
        {showCoForm && (
          <CoFormModal 
            coFormData={coFormData} setCoFormData={setCoFormData}
            handleSaveCompany={handleSaveCompany} setShowCoForm={setShowCoForm}
            colors={colors} btnBase={btnBase} isEditing={isEditing}
          />
        )}

        {showTrForm && (
          <TrFormModal 
            trFormData={trFormData} setTrFormData={setTrFormData}
            handleSaveTrainee={handleSaveTrainee} setShowTrForm={setShowTrForm}
            colors={colors} btnBase={btnBase} isEditingTr={isEditingTr}
            companies={companies} editingPhaseIdx={editingPhaseIdx} currentCoId={currentCoId}
          />
        )}
      </div>
    </main>
  );
}