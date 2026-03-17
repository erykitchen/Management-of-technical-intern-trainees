"use client";

import { useState, useEffect, useRef } from 'react';
// Firebaseの読み込み（重複を削除し、パスを修正）
import { db } from './firebase'; 
import { collection, getDocs, query, orderBy, doc, updateDoc } from "firebase/firestore";

// 型定義のインポート
import { Company, Trainee } from './types';

// 作成したフォルダからコンポーネントを読み込み
import TraineeDetail from './components/TraineeDetail';
import CompanyForm from './components/CompanyForm';
import TraineeForm from './components/TraineeForm';
import PrintPreview from './components/PrintPreview';

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [view, setView] = useState<'list' | 'detail' | 'print'>('list');
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
              id: ++maxId, traineeName: c[0], kana: c[1] || "", batch: c[2] || "①",
              category: c[3] || "技能実習1号", status: "実習中", nationality: "ベトナム",
              phaseHistory: []
            } as any);
          }
        });

        await updateDoc(doc(db, "companies", targetCoId), { trainees: newTrainees });
        alert(`${lines.length - 1}名追加しました`);
        fetchCompanies();
      } catch (err) { alert("CSVエラー"); }
    };
    reader.readAsText(file, "Shift-JIS");
  };

  const handleLogin = () => { if (password === "4647") setIsAuthenticated(true); else alert("NG"); };

  if (!isAuthenticated) return (
    <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#f0f2f5' }}>
      <div style={{ padding: '50px', background: '#fff', borderRadius: '15px', boxShadow: '0 10px 40px rgba(0,0,0,0.1)', textAlign: 'center' }}>
        <h2 style={{ marginBottom: '30px', color: '#2C3E50' }}>アシストねっと 管理ログイン</h2>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} style={{ padding: '15px', width: '280px', marginBottom: '25px' }} onKeyDown={e => e.key === 'Enter' && handleLogin()} />
        <br /><button onClick={handleLogin} style={btnPrimary}>ログイン</button>
      </div>
    </div>
  );

  const currentCompany = companies.find(c => c.id === targetCoId);
  const selectedTrainee = currentCompany?.trainees?.find(t => t.id === selectedTrId);

  // 印刷画面モードの場合
  if (view === 'print' && currentCompany) {
    return (
      <div>
        <div className="no-print" style={{ padding: '20px', background: '#333', color: '#fff' }}>
          <button onClick={() => setView('detail')} style={{ marginRight: '20px' }}>← 戻る</button>
          <button onClick={() => window.print()}>この内容で印刷する（PDF保存）</button>
        </div>
        <PrintPreview company={currentCompany} trainee={selectedTrainee} />
      </div>
    );
  }

  return (
    <main style={{ padding: '40px', background: '#F4F7F9', minHeight: '100vh' }}>
      <header style={headerStyle}>
        <div onClick={() => setView('list')} style={{ cursor: 'pointer' }}>
          <h1 style={{ margin: 0, fontSize: '28px', color: '#2C3E50', fontWeight: '800' }}>アシストねっと協同組合</h1>
          <p style={{ margin: 0, color: '#95A5A6', fontSize: '14px' }}>技能実習生 総合管理システム</p>
        </div>

        <div style={{ display: 'flex', gap: '15px' }}>
          {view === 'detail' && (
            <>
              <button onClick={() => setView('print')} style={btnSecondary}>🖨️ 印刷プレビュー</button>
              <button onClick={() => fileInputRef.current?.click()} style={btnCSV}>📄 CSVインポート</button>
              <input type="file" ref={fileInputRef} onChange={handleCSVImport} style={{ display: 'none' }} accept=".csv" />
            </>
          )}
          <button onClick={() => { setIsEditing(false); setCoFormData({}); setShowCoForm(true); }} style={btnPrimary}>＋ 新規会社登録</button>
        </div>
      </header>

      {view === 'list' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '30px' }}>
          {companies.map(c => (
            <div key={c.id} onClick={() => { setTargetCoId(c.id); setView('detail'); setSelectedTrId(c.trainees?.[0]?.id || null); }} style={cardStyle}>
              <h3 style={{ margin: '0 0 15px 0', fontSize: '22px' }}>{c.companyName}</h3>
              <div style={{ borderTop: '1px solid #f1f1f1', paddingTop: '15px', textAlign: 'right' }}>
                <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#F57C00' }}>{c.trainees?.length || 0}</span> 名受入中
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <button onClick={() => setView('list')} style={{ marginBottom: '20px', color: '#F57C00', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 'bold' }}>← 一覧に戻る</button>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h2 style={{ margin: 0 }}>{currentCompany?.companyName}</h2>
            <button onClick={() => { setIsEditing(false); setTrFormData({ category: '技能実習1号', status: '実習中' }); setShowTrForm(true); }} style={btnPrimary}>＋ 実習生追加</button>
          </div>

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

// スタイル
const headerStyle = { display: 'flex', justifyContent: 'space-between', marginBottom: '35px', padding: '25px', background: '#fff', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' };
const btnPrimary = { background: '#F57C00', color: '#fff', border: 'none', padding: '12px 25px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' };
const btnSecondary = { background: '#fff', border: '1px solid #ddd', padding: '12px 20px', borderRadius: '8px', cursor: 'pointer' };
const btnCSV = { background: '#E8F5E9', color: '#2E7D32', border: 'none', padding: '12px 20px', borderRadius: '8px', cursor: 'pointer' };
const cardStyle = { padding: '30px', background: '#fff', borderRadius: '15px', boxShadow: '0 5px 15px rgba(0,0,0,0.05)', cursor: 'pointer' };