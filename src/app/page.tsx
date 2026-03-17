"use client";
import { useState, useEffect, useRef } from 'react';
import { db } from './firebase';
import { collection, addDoc, getDocs, query, orderBy, doc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { Company, Trainee } from './types';

import TraineeDetail from './components/TraineeDetail';
import CompanyForm from './components/CompanyForm';
import TraineeForm from './components/TraineeForm';

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [view, setView] = useState<'list' | 'detail'>('list');
  const [targetCoId, setTargetCoId] = useState<string | null>(null);
  const [selectedTrId, setSelectedTrId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'current' | number>('current');

  const [showCoForm, setShowCoForm] = useState(false);
  const [showTrForm, setShowTrForm] = useState(false);
  const [coFormData, setCoFormData] = useState<any>({});
  const [trFormData, setTrFormData] = useState<any>({});
  const [isEditing, setIsEditing] = useState(false);
  const [editIdx, setEditIdx] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (isAuthenticated) fetchCompanies(); }, [isAuthenticated]);

  const fetchCompanies = async () => {
    const q = query(collection(db, "companies"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    setCompanies(snap.docs.map(d => ({ id: d.id, ...d.data() } as Company)));
  };

  // CSVインポート完全版 (Shift-JIS対応)
  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !targetCoId) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const lines = text.split(/\r?\n/).filter(line => line.trim() !== "");
      if (lines.length < 2) return alert("データが空か不正です");

      const company = companies.find(c => c.id === targetCoId);
      if (!company) return;

      const newTrainees = [...(company.trainees || [])];
      let maxId = newTrainees.length > 0 ? Math.max(...newTrainees.map(t => t.id)) : 0;

      lines.slice(1).forEach(line => {
        const c = line.split(',').map(s => s.trim());
        if (c[0]) {
          newTrainees.push({
            id: ++maxId, traineeName: c[0], kana: c[1] || "", 
            batch: c[2] || "①", category: c[3] || "技能実習1号",
            status: "実習中", phaseHistory: [],
            traineeZip: "", traineeAddress: "", nationality: "ベトナム", birthday: "", age: "", gender: "男"
          } as any);
        }
      });

      await updateDoc(doc(db, "companies", targetCoId), { trainees: newTrainees });
      alert("CSVから実習生を一括追加しました");
      fetchCompanies();
    };
    reader.readAsText(file, "Shift-JIS");
  };

  // ログイン処理
  const handleLogin = () => { if (password === "4647") setIsAuthenticated(true); else alert("パスワードが違います"); };

  if (!isAuthenticated) return (
    <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#f0f2f5' }}>
      <div style={{ padding: '50px', background: '#fff', borderRadius: '15px', boxShadow: '0 10px 40px rgba(0,0,0,0.1)', textAlign: 'center' }}>
        <h2 style={{ marginBottom: '30px', color: '#2C3E50', fontSize: '24px' }}>アシストねっと 管理ログイン</h2>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} style={{ padding: '15px', width: '280px', marginBottom: '25px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '16px' }} placeholder="パスワードを入力" onKeyDown={e => e.key === 'Enter' && handleLogin()} />
        <br />
        <button onClick={handleLogin} style={{ width: '280px', padding: '15px', background: '#F57C00', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px' }}>ログイン</button>
      </div>
    </div>
  );

  const currentCompany = companies.find(c => c.id === targetCoId);

  return (
    <main style={{ padding: '40px', background: '#F4F7F9', minHeight: '100vh' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '35px', padding: '30px', background: '#fff', borderRadius: '15px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
        <div onClick={() => setView('list')} style={{ cursor: 'pointer' }}>
          <h1 style={{ margin: 0, fontSize: '28px', color: '#2C3E50', fontWeight: '800' }}>アシストねっと協同組合</h1>
          <p style={{ margin: '5px 0 0 0', color: '#95A5A6', fontWeight: '600' }}>実習生管理・アラートシステム</p>
        </div>

        <div style={{ display: 'flex', gap: '15px' }}>
          {view === 'detail' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => window.print()} style={btnSecondary}>🏢 会社情報印刷</button>
                <button onClick={() => window.print()} style={btnSecondary}>👤 実習生情報印刷</button>
              </div>
              <button onClick={() => fileInputRef.current?.click()} style={btnCSV}>📄 CSVで実習生を追加</button>
              <input type="file" ref={fileInputRef} onChange={handleCSVImport} style={{ display: 'none' }} accept=".csv" />
            </div>
          )}
          <button onClick={() => { setIsEditing(false); setCoFormData({}); setShowCoForm(true); }} style={btnPrimary}>＋ 新規会社登録</button>
        </div>
      </header>

      {view === 'list' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '30px' }}>
          {companies.map(c => (
            <div key={c.id} onClick={() => { setTargetCoId(c.id); setView('detail'); setSelectedTrId(c.trainees?.[0]?.id || null); }} style={cardStyle}>
              <h3 style={{ margin: '0 0 15px 0', fontSize: '22px', color: '#2C3E50' }}>{c.companyName}</h3>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '15px 0', borderTop: '1px solid #eee' }}>
                <span style={{ color: '#7F8C8D', fontWeight: 'bold' }}>受入中実習生</span>
                <span style={{ fontSize: '22px', fontWeight: '900', color: '#F57C00' }}>{c.trainees?.length || 0} <small style={{ fontSize: '14px' }}>名</small></span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <button onClick={() => setView('list')} style={{ marginBottom: '25px', background: 'none', border: 'none', color: '#F57C00', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px' }}>← 会社一覧に戻る</button>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
            <h2 style={{ margin: 0, fontSize: '24px' }}>{currentCompany?.companyName}</h2>
            <button onClick={() => { setIsEditing(false); setTrFormData({ category: '技能実習1号' }); setShowTrForm(true); }} style={btnPrimary}>＋ 実習生を個別追加</button>
          </div>

          {currentCompany && (
            <TraineeDetail 
              company={currentCompany} selectedTrId={selectedTrId} onSelectTrainee={setSelectedTrId}
              activeTab={activeTab} setActiveTab={setActiveTab}
              onEdit={(data, idx) => { setIsEditing(true); setTrFormData(data); setEditIdx(idx); setShowTrForm(true); }}
            />
          )}
        </div>
      )}

      {showCoForm && <CompanyForm formData={coFormData} setFormData={setCoFormData} onSave={async () => { /* 保存処理 */ setShowCoForm(false); fetchCompanies(); }} onClose={() => setShowCoForm(false)} />}
      {showTrForm && <TraineeForm formData={trFormData} setFormData={setTrFormData} onSave={async () => { /* 実習生保存処理 */ setShowTrForm(false); fetchCompanies(); }} onClose={() => setShowTrForm(false)} isEditing={isEditing} editIdx={editIdx} />}
    </main>
  );
}

const btnPrimary = { background: '#F57C00', color: '#fff', border: 'none', padding: '15px 30px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 6px 20px rgba(245, 124, 0, 0.3)' };
const btnSecondary = { background: '#fff', border: '1px solid #ced4da', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold', color: '#444' };
const btnCSV = { background: '#E8F5E9', color: '#2E7D32', border: '1px solid #C8E6C9', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' };
const cardStyle = { padding: '35px', background: '#fff', borderRadius: '20px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', border: '1px solid #eee', cursor: 'pointer', transition: '0.3s' };