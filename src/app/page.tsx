"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, orderBy 
} from 'firebase/firestore';
import { db } from './firebase';

// 分割した部品たちを読み込む
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
  // --- ステート ---
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
  const [searchTerm, setSearchTerm] = useState("");

  const printRef = useRef<HTMLDivElement>(null);

  // デザイン設定
  const colors = { primary: '#2563eb', secondary: '#059669', bg: '#f1f5f9', text: '#1e293b', white: '#ffffff' };
  const btnBase = { padding: '10px 20px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', border: 'none', transition: '0.2s', display: 'flex', alignItems: 'center', gap: '8px' };

  // --- データ取得 ---
  const fetchData = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "companies"), orderBy("companyName"));
      const snap = await getDocs(q);
      setCompanies(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // --- 保存・削除ロジック ---
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
      newTrainees = newTrainees.map(t => {
        if (t.id === editingTrId) {
          const newPhases = [...t.phaseHistory];
          newPhases[editingPhaseIdx!] = trFormData;
          return { ...t, traineeName: trFormData.traineeName, phaseHistory: newPhases };
        }
        return t;
      });
    } else {
      newTrainees.push({ id: Date.now().toString(), traineeName: trFormData.traineeName, phaseHistory: [trFormData] });
    }
    await updateDoc(doc(db, "companies", currentCoId), { trainees: newTrainees });
    setShowTrForm(false);
    fetchData();
  };

  const handleDeleteTrainee = async (coId: string, trId: string) => {
    if (!confirm("この実習生を削除しますか？")) return;
    const co = companies.find(c => c.id === coId);
    const newTrainees = co.trainees.filter((t: any) => t.id !== trId);
    await updateDoc(doc(db, "companies", coId), { trainees: newTrainees });
    fetchData();
  };

  // --- メイン表示 ---
  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>読み込み中...</div>;

  return (
    <main style={{ minHeight: '100vh', backgroundColor: colors.bg, color: colors.text, padding: '20px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* ヘッダー */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', backgroundColor: colors.white, padding: '20px', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: colors.primary }}>技能実習生管理システム</h1>
          <div style={{ display: 'flex', gap: '10px' }}>
             <button onClick={() => { setCoFormData({}); setIsEditing(false); setShowCoForm(true); }} style={{ ...btnBase, backgroundColor: colors.primary, color: 'white' }}>+ 会社追加</button>
          </div>
        </header>

        {/* 会社一覧カード */}
        <div style={{ display: 'grid', gap: '25px' }}>
          {companies.map(co => (
            <section key={co.id} style={{ backgroundColor: colors.white, borderRadius: '15px', padding: '25px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', borderBottom: '2px solid #f1f5f9', paddingBottom: '15px' }}>
                <div>
                  <h2 style={{ fontSize: '22px', fontWeight: '700' }}>{co.companyName}</h2>
                  <p style={{ color: '#64748b', fontSize: '14px' }}>担当: {co.representative} | TEL: {co.tel}</p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => { setCoFormData(co); setCurrentCoId(co.id); setIsEditing(true); setShowCoForm(true); }} style={{ fontSize: '13px', padding: '5px 12px', borderRadius: '5px', border: '1px solid #cbd5e1' }}>会社編集</button>
                  <button onClick={() => { setCurrentCoId(co.id); setTrFormData({ category: '技能実習1号' }); setIsEditingTr(false); setShowTrForm(true); }} style={{ fontSize: '13px', padding: '5px 12px', borderRadius: '5px', backgroundColor: colors.secondary, color: 'white', border: 'none' }}>+ 実習生追加</button>
                </div>
              </div>

              {/* 実習生テーブル（ここが元のデザインの肝です） */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', textAlign: 'left' }}>
                      <th style={{ padding: '12px', borderBottom: '2px solid #e2e8f0' }}>氏名 / フリガナ</th>
                      <th style={{ padding: '12px', borderBottom: '2px solid #e2e8f0' }}>区分 / バッチ</th>
                      <th style={{ padding: '12px', borderBottom: '2px solid #e2e8f0' }}>在留期限 / 状態</th>
                      <th style={{ padding: '12px', borderBottom: '2px solid #e2e8f0' }}>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {co.trainees?.map((tr: any) => {
                      const lastPhase = tr.phaseHistory[tr.phaseHistory.length - 1];
                      const isAlert = checkAlert(lastPhase.stayLimit, lastPhase.category);
                      return (
                        <tr key={tr.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '12px' }}>
                            <div style={{ fontWeight: '600' }}>{tr.traineeName}</div>
                            <div style={{ fontSize: '11px', color: '#94a3b8' }}>{lastPhase.kana}</div>
                          </td>
                          <td style={{ padding: '12px' }}>
                            <span style={{ backgroundColor: batchColorMap[lastPhase.batch] || '#eee', padding: '2px 8px', borderRadius: '4px', fontSize: '12px' }}>{lastPhase.category} / {lastPhase.batch}</span>
                          </td>
                          <td style={{ padding: '12px', color: isAlert ? 'red' : 'inherit', fontWeight: isAlert ? 'bold' : 'normal' }}>
                            {lastPhase.stayLimit || "未設定"}
                            <div style={{ fontSize: '11px' }}>{lastPhase.status}</div>
                          </td>
                          <td style={{ padding: '12px' }}>
                             <button onClick={() => { setCurrentCoId(co.id); setTrFormData(lastPhase); setEditingTrId(tr.id); setEditingPhaseIdx(tr.phaseHistory.length - 1); setIsEditingTr(true); setShowTrForm(true); }}>編集</button>
                             <button onClick={() => handleDeleteTrainee(co.id, tr.id)} style={{ color: '#ef4444', marginLeft: '10px' }}>削除</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>

        {/* --- 分離したモーダルを表示 --- */}
        {showCoForm && (
          <CoFormModal coFormData={coFormData} setCoFormData={setCoFormData} handleSaveCompany={handleSaveCompany} setShowCoForm={setShowCoForm} colors={colors} btnBase={btnBase} isEditing={isEditing} />
        )}
        {showTrForm && (
          <TrFormModal trFormData={trFormData} setTrFormData={setTrFormData} handleSaveTrainee={handleSaveTrainee} setShowTrForm={setShowTrForm} colors={colors} btnBase={btnBase} isEditingTr={isEditingTr} companies={companies} editingPhaseIdx={editingPhaseIdx} currentCoId={currentCoId} />
        )}
      </div>
    </main>
  );
}