"use client";

import { useState, useEffect, useRef } from 'react';
import { db } from './firebase'; 
import { collection, getDocs, query, orderBy, doc, updateDoc } from "firebase/firestore";
import { Company, Trainee } from './types';

// コンポーネントの読み込み（パスが正しいことを確認済み）
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

  useEffect(() => {
    if (isAuthenticated) fetchCompanies();
  }, [isAuthenticated]);

  const fetchCompanies = async () => {
    try {
      const q = query(collection(db, "companies"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      setCompanies(snap.docs.map(d => ({ id: d.id, ...d.data() } as Company)));
    } catch (err) {
      console.error("データ取得エラー:", err);
    }
  };

  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !targetCoId) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split(/\r?\n/).filter(line => line.trim() !== "");
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
              status: "実習中", phaseHistory: []
            } as any);
          }
        });
        await updateDoc(doc(db, "companies", targetCoId), { trainees: newTrainees });
        fetchCompanies();
      } catch (err) { alert("CSVエラー"); }
    };
    reader.readAsText(file, "Shift-JIS");
  };

  const handleLogin = () => { if (password === "4647") setIsAuthenticated(true); else alert("NG"); };

  if (!isAuthenticated) return (
    <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#f0f2f5' }}>
      <div style={{ padding: '40px', background: '#fff', borderRadius: '15px', textAlign: 'center' }}>
        <h2>管理ログイン</h2>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} style={{ padding: '10px', marginBottom: '20px' }} />
        <br /><button onClick={handleLogin}>ログイン</button>
      </div>
    </div>
  );

  const currentCompany = companies.find(c => c.id === targetCoId);

  return (
    <main style={{ padding: '20px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', background: '#fff', padding: '20px' }}>
        <h1 onClick={() => setView('list')} style={{ cursor: 'pointer' }}>アシストねっと</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          {view === 'detail' && (
            <>
              <button onClick={() => window.print()}>印刷</button>
              <button onClick={() => fileInputRef.current?.click()}>CSV追加</button>
              <input type="file" ref={fileInputRef} onChange={handleCSVImport} style={{ display: 'none' }} />
            </>
          )}
          <button onClick={() => { setCoFormData({}); setShowCoForm(true); }}>会社登録</button>
        </div>
      </header>

      {view === 'list' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
          {companies.map(c => (
            <div key={c.id} onClick={() => { setTargetCoId(c.id); setView('detail'); setSelectedTrId(c.trainees?.[0]?.id || null); }} style={{ padding: '20px', background: '#fff', cursor: 'pointer' }}>
              <h3>{c.companyName}</h3>
              <p>実習生: {c.trainees?.length || 0}名</p>
            </div>
          ))}
        </div>
      ) : (
        <div>
          <button onClick={() => setView('list')}>← 戻る</button>
          {currentCompany && (
            <TraineeDetail 
              company={currentCompany} 
              selectedTrId={selectedTrId} 
              onSelectTrainee={setSelectedTrId}
              activeTab={activeTab} 
              setActiveTab={setActiveTab}
              onEdit={(data, idx) => { setIsEditing(true); setTrFormData(data); setEditIdx(idx); setShowTrForm(true); }}
            />
          )}
        </div>
      )}

      {showCoForm && <CompanyForm formData={coFormData} setFormData={setCoFormData} onSave={() => { setShowCoForm(false); fetchCompanies(); }} onClose={() => setShowCoForm(false)} />}
      {showTrForm && <TraineeForm formData={trFormData} setFormData={setTrFormData} onSave={() => { setShowTrForm(false); fetchCompanies(); }} onClose={() => setShowTrForm(false)} isEditing={isEditing} editIdx={editIdx} />}
    </main>
  );
}