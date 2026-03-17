"use client";
import { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, addDoc, getDocs, query, orderBy, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { 
  labelMapCo, labelMapTr, categoryOptions, batchOptions, 
  batchColorMap, initialCompanyForm, initialTraineeForm 
} from './lib/constants';
import { convertToAD, checkAlert, calculateAge } from './lib/utils';
import { CoFormModal, TrFormModal, AddTraineeModal } from './components/Modals';

export default function Home() {
  // --- 状態管理 (印刷ビューを追加) ---
  const [view, setView] = useState<'list' | 'detail' | 'print_tr' | 'print_co'>('list');
  const [showTrForm, setShowTrForm] = useState(false);
  const [showCoForm, setShowCoForm] = useState(false);
  const [isEditingTr, setIsEditingTr] = useState(false);
  const [isEditingCo, setIsEditingCo] = useState(false);
  const [currentCo, setCurrentCo] = useState<any>(null);
  const [selectedTrId, setSelectedTrId] = useState<number | null>(null);
  const [companies, setCompanies] = useState<any[]>([]);
  const [trFormData, setTrFormData] = useState<any>(initialTraineeForm);
  const [coFormData, setCoFormData] = useState<any>(initialCompanyForm);

  // --- デザイン設定 ---
  const colors = { accent: '#F57C00', text: '#2C3E50', gray: '#95A5A6', border: '#E0E0E0', danger: '#E74C3C', warn: '#F1C40F' };
  const sharpRadius = '4px';
  const btnBase = { padding: '10px 18px', borderRadius: sharpRadius, border: 'none', cursor: 'pointer', fontWeight: '600' as const, fontSize: '13px' };

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
  const copy = (t: string) => { if(t) navigator.clipboard.writeText(t); };

  // --- 3段階アラートロジック ---
  const getAlertStatus = (trainees: any[] = []) => {
    const alerts = trainees.map(t => checkAlert(t.stayLimit, t.category) || checkAlert(t.passportLimit, t.category));
    if (alerts.includes("critical")) return { border: `2px dashed ${colors.danger}`, background: '#FFF0F0', label: '！至急(30日)！', color: colors.danger };
    if (alerts.includes("warning-red")) return { border: `2px solid ${colors.danger}`, background: '#fff', label: '期限間近(60日)', color: colors.danger };
    if (alerts.includes("warning-yellow")) return { border: `2px solid ${colors.warn}`, background: '#fff', label: '期限注意(90日)', color: colors.warn };
    return { border: `1px solid ${colors.border}`, background: '#fff', label: null, color: colors.gray };
  };

  const handleSaveCompany = async () => {
    if (!coFormData.companyName) return;
    if (isEditingCo && currentCo?.id) {
      await updateDoc(doc(db, "companies", currentCo.id), coFormData);
    } else {
      await addDoc(collection(db, "companies"), { ...coFormData, trainees: [], createdAt: serverTimestamp() });
    }
    setShowCoForm(false);
    fetchCompanies();
  };

  const handleSaveTrainee = async () => {
    if (!currentCo?.id) return;
    const updated = currentCo.trainees.map((t: any) => t.id === trFormData.id ? trFormData : t);
    await updateDoc(doc(db, "companies", currentCo.id), { trainees: updated });
    setShowTrForm(false);
    fetchCompanies();
  };

  const handleAddTraineeConfirm = async (payload: any) => {
    if (!currentCo?.id) return;
    let newItems = [];
    if (payload.type === 'csv') {
      newItems = payload.data.map((row: any) => ({
        ...initialTraineeForm,
        id: Date.now() + Math.random(),
        traineeName: row["実習生氏名"] || "名称不明",
        kana: row["フリガナ"] || "",
        stayLimit: convertToAD(row["在留期限"] || ""),
        passportLimit: convertToAD(row["パスポート期限"] || ""),
        category: "第1号"
      }));
    } else {
      newItems = [{ ...payload.data, id: Date.now() }];
    }
    await updateDoc(doc(db, "companies", currentCo.id), { trainees: [...(currentCo.trainees || []), ...newItems] });
    fetchCompanies();
  };

  // --- 表示切り替えロジック ---
  if (view === 'list') {
    return (
      <main style={{ padding: '40px', backgroundColor: '#F9F9F9', minHeight: '100vh' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '40px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: '800' }}>実習生管理</h1>
          <button onClick={() => { setIsEditingCo(false); setCoFormData(initialCompanyForm); setShowCoForm(true); }} style={{ ...btnBase, backgroundColor: colors.accent, color: '#fff' }}>＋ 新規会社登録</button>
        </header>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '25px' }}>
          {companies.map(c => {
            const status = getAlertStatus(c.trainees);
            return (
              <div key={c.id} onClick={() => { setCurrentCo(c); setView('detail'); }} style={{ backgroundColor: status.background, padding: '24px', borderRadius: sharpRadius, border: status.border, cursor: 'pointer', position: 'relative' }}>
                {status.label && <div style={{ position: 'absolute', top: '-10px', right: '10px', backgroundColor: status.color, color: '#fff', fontSize: '10px', padding: '2px 10px', borderRadius: '10px', fontWeight: 'bold' }}>{status.label}</div>}
                <div style={{ fontWeight: 'bold', fontSize: '18px' }}>{c.companyName}</div>
                <div style={{ marginTop: '10px', color: colors.gray, fontSize: '14px' }}>人数: {c.trainees?.length || 0}名</div>
              </div>
            );
          })}
        </div>
        <CoFormModal isOpen={showCoForm} onClose={() => setShowCoForm(false)} coFormData={coFormData} setCoFormData={setCoFormData} handleSaveCompany={handleSaveCompany} />
      </main>
    );
  }

  const currentTrainee = currentCo.trainees?.find((t: any) => t.id === selectedTrId);

  return (
    <main style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <nav style={{ padding: '15px 30px', backgroundColor: '#fff', borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={() => { setView('list'); setSelectedTrId(null); }} style={{ background: 'none', border: 'none', color: colors.accent, fontWeight: 'bold', cursor: 'pointer' }}>← 戻る</button>
        <div style={{ display: 'flex', gap: '10px' }}>
          {!selectedTrId ? (
            <>
              {/* 会社情報の印刷ボタン */}
              <button onClick={() => window.print()} style={{ ...btnBase, backgroundColor: colors.text, color: '#fff' }}>会社情報を印刷</button>
              <button onClick={() => { setIsEditingTr(false); setShowTrForm(true); }} style={{ ...btnBase, backgroundColor: colors.accent, color: '#fff' }}>＋ 実習生追加</button>
            </>
          ) : (
            <>
              {/* 実習生個別の印刷ボタン */}
              <button onClick={() => window.print()} style={{ ...btnBase, backgroundColor: colors.text, color: '#fff' }}>個別票を印刷</button>
              <button onClick={() => { setTrFormData(currentTrainee); setIsEditingTr(true); setShowTrForm(true); }} style={{ ...btnBase, backgroundColor: colors.accent, color: '#fff' }}>編集</button>
              <button onClick={() => setSelectedTrId(null)} style={{ ...btnBase, backgroundColor: '#eee' }}>閉じる</button>
            </>
          )}
        </div>
      </nav>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', flex: 1, overflow: 'hidden' }}>
        <aside style={{ padding: '30px', borderRight: `1px solid ${colors.border}`, overflowY: 'auto', backgroundColor: '#fff' }}>
          <h2 style={{ fontSize: '20px', marginBottom: '20px', borderBottom: `2px solid ${colors.accent}`, paddingBottom: '10px' }}>{currentCo.companyName}</h2>
          {Object.keys(labelMapCo).map(k => (
            <div key={k} style={{ marginBottom: '15px' }}>
              <span style={{ color: colors.gray, fontSize: '11px', display: 'block', marginBottom: '2px' }}>{labelMapCo[k]}</span>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 'bold', fontSize: '14px' }}>{currentCo[k] || '-'}</span>
                <button onClick={() => copy(currentCo[k])} style={{ padding: '2px 6px', fontSize: '9px', cursor: 'pointer', border: '1px solid #ddd', borderRadius: '3px', background: '#f9f9f9' }}>Copy</button>
              </div>
            </div>
          ))}
        </aside>

        <section style={{ padding: '40px', backgroundColor: '#FBFBFB', overflowY: 'auto' }}>
          {!selectedTrId ? (
            <div style={{ display: 'grid', gap: '30px' }}>
              {categoryOptions.map(cat => (
                <div key={cat}>
                  <div style={{ color: colors.accent, fontWeight: 'bold', marginBottom: '15px', borderLeft: `4px solid ${colors.accent}`, paddingLeft: '10px', fontSize: '14px' }}>{cat}</div>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    {(currentCo.trainees || []).filter((t: any) => t.category === cat).map((t: any) => (
                      <button key={t.id} onClick={() => setSelectedTrId(t.id)} style={{ padding: '15px 25px', backgroundColor: batchColorMap[t.batch] || '#fff', border: `1px solid ${colors.border}`, borderRadius: sharpRadius, fontWeight: 'bold', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                        {t.traineeName}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ backgroundColor: '#fff', padding: '40px', borderRadius: sharpRadius, border: `1px solid ${colors.border}`, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
              <h3 style={{ fontSize: '22px', marginBottom: '30px' }}>{currentTrainee.traineeName}</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px 40px' }}>
                {Object.keys(labelMapTr).map(k => {
                  const alertType = checkAlert(currentTrainee[k], currentTrainee.category);
                  return (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f0f0f0', padding: '12px 0' }}>
                      <span style={{ color: colors.gray, fontSize: '14px' }}>{labelMapTr[k]}</span>
                      <span style={{ fontWeight: 'bold', color: alertType ? colors.danger : colors.text }}>
                        {currentTrainee[k] || '-'}
                        {alertType === 'critical' && ' ⚠️'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* モーダル類 */}
      <TrFormModal isOpen={showTrForm && isEditingTr} onClose={() => setShowTrForm(false)} trFormData={trFormData} setTrFormData={setTrFormData} handleSaveTrainee={handleSaveTrainee} />
      <AddTraineeModal isOpen={showTrForm && !isEditingTr} onClose={() => setShowTrForm(false)} onConfirm={handleAddTraineeConfirm} companyName={currentCo.companyName} />
      <CoFormModal isOpen={showCoForm} onClose={() => setShowCoForm(false)} coFormData={coFormData} setCoFormData={setCoFormData} handleSaveCompany={handleSaveCompany} />
    </main>
  );
}