"use client";
import { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, addDoc, getDocs, query, orderBy, doc, updateDoc } from "firebase/firestore";

// --- 1. 定義・ラベル ---
const labelMapCo: { [key: string]: string } = {
  companyName: "会社名", settlement: "決算時期", representative: "代表者氏名", jobType: "職種（小分類）",
  zipCode: "郵便番号", address: "住所", tel: "TEL", joinedDate: "組合加入年月日",
  employeeCount: "常勤職員数", investmentAmount: "出資金額", corporateNumber: "法人番号",
  implementationNumber: "実習実施者番号", officeAddress: "技能実習生住所",
  responsiblePerson: "技能実習責任者名", instructor: "技能実習指導員名", lifeInstructor: "生活指導員名"
};

const labelMapTr: { [key: string]: string } = {
  status: "ステータス", traineeName: "実習生氏名", kana: "フリガナ", 
  category: "区分", nationality: "国籍", birthday: "生年月日", age: "年齢", gender: "性別",
  stayLimit: "在留期限", cardNumber: "在留カード番号", passportNumber: "パスポート番号",
  entryDate: "実習開始日(入国日)", renewStartDate: "更新手続開始日", endDate: "実習終了日"
};

const categoryOptions = ["技能実習1号", "技能実習2号(1)", "技能実習2号(2)", "特定技能", "実習終了"];
const nationalityOptions = ["ベトナム", "中国", "インドネシア", "フィリピン", "ミャンマー", "カンボジア", "タイ", "その他（手入力）"];

const initialTraineeForm = {
  targetCompanyId: "", status: "認定申請準備中", traineeName: "", kana: "", 
  category: "技能実習1号", nationality: "ベトナム", birthday: "", age: "", gender: "男",
  stayLimit: "", cardNumber: "", passportNumber: "",
  entryDate: "", renewStartDate: "", endDate: "", phaseHistory: []
};

// --- 2. スタイル設定 ---
const colors = { 
  main: '#FFF9F0', accent: '#F57C00', text: '#2C3E50', 
  gray: '#95A5A6', lightGray: '#F2F2F2', border: '#E0E0E0', white: '#FFFFFF'
};

const sharpRadius = '4px';
const btnBase = { padding: '10px 18px', borderRadius: sharpRadius, border: 'none', cursor: 'pointer', fontWeight: '600' as const, fontSize: '13px', transition: 'all 0.2s' };
const grayCBtn = { width: '20px', height: '20px', fontSize: '9px', cursor: 'pointer', backgroundColor: 'transparent', border: `1px solid ${colors.border}`, borderRadius: '3px', color: colors.gray, marginLeft: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' };

// --- 3. 便利関数 ---
const calculateAge = (birthday: string) => {
  if (!birthday) return "";
  const birthDate = new Date(birthday.replace(/\//g, '-'));
  if (isNaN(birthDate.getTime())) return "";
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  if (today < new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate())) age--;
  return age.toString();
};

const calculateDates = (entryDateStr: string) => {
  const date = new Date(entryDateStr.replace(/\//g, '-'));
  if (isNaN(date.getTime())) return { end: "", renew: "" };
  const endDate = new Date(date);
  endDate.setFullYear(endDate.getFullYear() + 1);
  endDate.setDate(endDate.getDate() - 1);
  const renewDate = new Date(endDate);
  renewDate.setMonth(renewDate.getMonth() - 3);
  const fmt = (d: Date) => d.toISOString().split('T')[0].replace(/-/g, '/');
  return { end: fmt(endDate), renew: fmt(renewDate) };
};

// --- 4. メインコンポーネント ---
export default function Home() {
  const [view, setView] = useState<'list' | 'detail'>('list');
  const [showTrForm, setShowTrForm] = useState(false);
  const [isEditingTr, setIsEditingTr] = useState(false);
  const [currentCo, setCurrentCo] = useState<any>(null);
  const [selectedTrId, setSelectedTrId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'current' | number>('current');
  const [companies, setCompanies] = useState<any[]>([]);
  const [trFormData, setTrFormData] = useState<any>(initialTraineeForm);

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

  const alerts = companies.flatMap(c => (c.trainees || []).map((t: any) => ({ ...t, companyName: c.companyName, companyId: c.id })))
    .filter(t => {
      if (t.category === "実習終了" || !t.renewStartDate) return false;
      const diff = (new Date(t.renewStartDate.replace(/\//g, '-')).getTime() - new Date().getTime()) / (1000 * 86400);
      return diff <= 30;
    });

  const handleSaveTrainee = async () => {
    const targetId = isEditingTr ? currentCo.id : trFormData.targetCompanyId;
    if (!targetId) { alert("会社を選択してください"); return; }
    try {
      const docRef = doc(db, "companies", targetId);
      const targetCo = companies.find(c => c.id === targetId);
      let updatedTrainees = [...(targetCo.trainees || [])];
      if (isEditingTr) {
        updatedTrainees = updatedTrainees.map((t: any) => t.id === trFormData.id ? trFormData : t);
      } else {
        const { targetCompanyId, ...saveData } = trFormData;
        updatedTrainees = [...updatedTrainees, { ...saveData, id: Date.now(), phaseHistory: [] }];
      }
      await updateDoc(docRef, { trainees: updatedTrainees });
      setShowTrForm(false);
      fetchCompanies();
    } catch (e) { alert("保存エラーが発生しました"); }
  };

  if (view === 'list') {
    return (
      <main style={{ padding: '40px', backgroundColor: '#F9F9F9', minHeight: '100vh', color: colors.text }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '20px', letterSpacing: '0.05em' }}>アシストねっと協同組合</h1>
            <p style={{ margin: 0, fontSize: '12px', color: colors.gray }}>技能実習生管理システム</p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={() => { setTrFormData(initialTraineeForm); setIsEditingTr(false); setShowTrForm(true); }} style={{ ...btnBase, backgroundColor: colors.accent, color: '#fff' }}>＋ 新規実習生</button>
            <button style={{ ...btnBase, backgroundColor: colors.accent, color: '#fff' }}>＋ 新規実習実施者</button>
          </div>
        </header>

        {alerts.length > 0 && (
          <section style={{ marginBottom: '40px', padding: '24px', backgroundColor: '#FFF', border: `1px solid #FFEBEE`, borderLeft: `4px solid red` }}>
            <h2 style={{ fontSize: '14px', color: 'red', marginTop: 0, marginBottom: '15px' }}>⚠️ 確認必須リスト</h2>
            <div style={{ display: 'grid', gap: '10px' }}>
              {alerts.map(t => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '15px', fontSize: '13px' }}>
                  <span onClick={() => { setCurrentCo(companies.find(c => c.id === t.companyId)); setView('detail'); setSelectedTrId(t.id); }} style={{ color: colors.accent, cursor: 'pointer', fontWeight: 'bold', textDecoration: 'underline' }}>{t.traineeName} ({t.companyName})</span>
                  <span style={{ color: '#E53935' }}>理由：更新手続き期限が近い実習生（30日以内）</span>
                </div>
              ))}
            </div>
          </section>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {companies.map(c => (
            <div key={c.id} onClick={() => { setCurrentCo(c); setView('detail'); }} style={{ backgroundColor: '#fff', padding: '24px', borderRadius: sharpRadius, cursor: 'pointer', border: `1px solid ${colors.border}` }}>
              <div style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '12px', color: '#000' }}>{c.companyName}</div>
              <div style={{ fontSize: '12px', color: colors.gray }}>現在受入人数：<span style={{ color: colors.accent, fontWeight: 'bold' }}>{(c.trainees || []).filter((t: any) => t.category !== "実習終了").length} 名</span></div>
            </div>
          ))}
        </div>
        {showTrForm && <TrFormModal trFormData={trFormData} setTrFormData={setTrFormData} handleSaveTrainee={handleSaveTrainee} setShowTrForm={setShowTrForm} isEditingTr={isEditingTr} companies={companies} colors={colors} />}
      </main>
    );
  }

  const currentTrainee = currentCo.trainees?.find((t: any) => t.id === selectedTrId);

  return (
    <main style={{ backgroundColor: '#FBFBFB', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <nav style={{ padding: '15px 30px', backgroundColor: '#FFF', borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={() => { setView('list'); setSelectedTrId(null); }} style={{ background: 'none', border: 'none', color: colors.gray, cursor: 'pointer', fontSize: '13px' }}>← 会社一覧に戻る</button>
        <button onClick={() => { setTrFormData({ ...initialTraineeForm, targetCompanyId: currentCo.id }); setIsEditingTr(false); setShowTrForm(true); }} style={{ ...btnBase, backgroundColor: colors.accent, color: '#fff', padding: '6px 15px' }}>＋ 実習生追加</button>
      </nav>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '1px', backgroundColor: colors.border, flex: 1 }}>
        <aside style={{ backgroundColor: '#FFF', padding: '30px' }}>
          <div onClick={() => { setSelectedTrId(null); setActiveTab('current'); }} style={{ cursor: 'pointer', marginBottom: '30px' }}>
            <h2 style={{ fontSize: '18px', margin: 0, borderBottom: `3px solid ${colors.main}`, paddingBottom: '10px', color: '#000', transition: 'color 0.2s' }} onMouseOver={(e) => e.currentTarget.style.color = colors.accent} onMouseOut={(e) => e.currentTarget.style.color = '#000'}>{currentCo.companyName}</h2>
          </div>
          {Object.keys(labelMapCo).map(k => (
            <div key={k} style={{ marginBottom: '12px', fontSize: '11px' }}>
              <span style={{ color: colors.gray, display: 'block', marginBottom: '2px' }}>{labelMapCo[k]}</span>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ fontWeight: '600', color: '#333' }}>{currentCo[k] || '-'}</span>
                <button onClick={() => copy(currentCo[k])} style={grayCBtn}>C</button>
              </div>
            </div>
          ))}
        </aside>

        <section style={{ backgroundColor: '#FBFBFB', padding: '40px' }}>
          {!selectedTrId ? (
            <div>
              <h3 style={{ fontSize: '14px', marginBottom: '20px', color: colors.gray }}>所属実習生一覧</h3>
              {categoryOptions.map(cat => {
                const list = (currentCo.trainees || []).filter((t: any) => t.category === cat);
                if (list.length === 0) return null;
                const isEnd = cat === "実習終了";
                return (
                  <div key={cat} style={{ marginBottom: '25px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 'bold', color: isEnd ? '#CCC' : colors.accent, marginBottom: '10px' }}>{cat}</div>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      {list.map((t: any) => (
                        <button key={t.id} onClick={() => { setSelectedTrId(t.id); }} style={{ padding: '10px 20px', backgroundColor: '#FFF', border: `1px solid ${colors.border}`, borderRadius: sharpRadius, cursor: 'pointer', fontSize: '13px', color: isEnd ? '#CCC' : colors.text }}>{t.traineeName}</button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ backgroundColor: '#FFF', padding: '30px', border: `1px solid ${colors.border}`, borderRadius: sharpRadius }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '30px' }}>
                <h3 style={{ margin: 0, fontSize: '20px' }}>{currentTrainee.traineeName} <span style={{ fontSize: '13px', color: colors.gray, fontWeight: 'normal' }}>{currentTrainee.category}</span></h3>
                <button onClick={() => { setTrFormData(currentTrainee); setIsEditingTr(true); setShowTrForm(true); }} style={{ ...btnBase, backgroundColor: colors.accent, color: '#fff' }}>編集・区分変更</button>
              </div>

              <div style={{ display: 'flex', gap: '5px', marginBottom: '20px' }}>
                <button onClick={() => setActiveTab('current')} style={{ padding: '8px 20px', border: 'none', background: activeTab === 'current' ? colors.main : 'none', color: colors.accent, fontWeight: 'bold', cursor: 'pointer' }}>最新データ</button>
                {[...(currentTrainee.phaseHistory || [])].reverse().map((h, idx) => {
                  const originalIdx = currentTrainee.phaseHistory.length - 1 - idx;
                  return <button key={idx} onClick={() => setActiveTab(originalIdx)} style={{ padding: '8px 20px', border: 'none', background: activeTab === originalIdx ? '#EEE' : 'none', color: '#999', cursor: 'pointer' }}>{h.category}時</button>;
                })}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 40px' }}>
                {Object.keys(labelMapTr).map(k => {
                  const data = activeTab === 'current' ? currentTrainee : currentTrainee.phaseHistory[activeTab as number];
                  return (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `1px solid #F5F5F5`, padding: '10px 0', fontSize: '13px' }}>
                      <span style={{ color: colors.gray }}>{labelMapTr[k]}</span>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span style={{ fontWeight: 'bold' }}>{data[k] || '-'}</span>
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
      {showTrForm && <TrFormModal trFormData={trFormData} setTrFormData={setTrFormData} handleSaveTrainee={handleSaveTrainee} setShowTrForm={setShowTrForm} isEditingTr={isEditingTr} companies={companies} colors={colors} />}
    </main>
  );
}

// --- 5. サブコンポーネント (モーダル) ---
function TrFormModal({ trFormData, setTrFormData, handleSaveTrainee, setShowTrForm, isEditingTr, companies, colors }: any) {
  const handleChange = (k: string, v: string) => {
    let newData = { ...trFormData, [k]: v };
    if (k === 'birthday') newData.age = calculateAge(v);
    if (k === 'entryDate') {
      const { end, renew } = calculateDates(v);
      newData.endDate = end;
      newData.renewStartDate = renew;
    }
    if (k === 'category' && isEditingTr) {
      if (confirm("区分を変更します。現在のデータは履歴に保存されます。")) {
        const archiveEntry = { ...trFormData };
        delete archiveEntry.phaseHistory;
        newData.phaseHistory = [...(trFormData.phaseHistory || []), archiveEntry];
      }
    }
    setTrFormData(newData);
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(2px)' }}>
      <div style={{ backgroundColor: '#FFF', padding: '40px', borderRadius: sharpRadius, width: '90%', maxWidth: '1000px', maxHeight: '90vh', overflowY: 'auto' }}>
        <h2 style={{ fontSize: '18px', marginBottom: '30px', borderLeft: `4px solid ${colors.accent}`, paddingLeft: '15px' }}>実習生情報の登録・編集</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
          {!isEditingTr && (
            <div style={{ gridColumn: 'span 3', padding: '10px', backgroundColor: '#F0F7FF', borderRadius: sharpRadius, marginBottom: '10px' }}>
              <label style={{ fontSize: '11px', color: '#0070F3', fontWeight: 'bold', display: 'block' }}>受入企業を選択</label>
              <select style={{ width: '100%', padding: '8px', border: '1px solid #ddd' }} value={trFormData.targetCompanyId} onChange={e => handleChange('targetCompanyId', e.target.value)}>
                <option value="">選択してください</option>
                {companies.map((c: any) => <option key={c.id} value={c.id}>{c.companyName}</option>)}
              </select>
            </div>
          )}
          {Object.keys(labelMapTr).map(k => (
            <div key={k} style={{ padding: '10px', backgroundColor: '#FBFBFB', border: '1px solid #EEE', borderRadius: sharpRadius }}>
              <label style={{ fontSize: '11px', color: colors.gray, fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>{labelMapTr[k]}</label>
              { k === 'nationality' ? (
                <select style={{ width: '100%', padding: '8px', border: '1px solid #ddd' }} value={trFormData[k]} onChange={e => handleChange(k, e.target.value)}>
                  {nationalityOptions.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : k === 'category' ? (
                <select style={{ width: '100%', padding: '8px', border: '1px solid #ddd' }} value={trFormData[k]} onChange={e => handleChange(k, e.target.value)}>
                  {categoryOptions.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <input type="text" value={trFormData[k] || ''} style={{ width: '100%', padding: '8px', border: '1px solid #ddd' }} onChange={e => handleChange(k, e.target.value)} />
              )}
            </div>
          ))}
        </div>
        <div style={{ marginTop: '30px', display: 'flex', gap: '15px' }}>
          <button onClick={handleSaveTrainee} style={{ ...btnBase, backgroundColor: colors.accent, color: '#fff', flex: 2 }}>保存する</button>
          <button onClick={() => setShowTrForm(false)} style={{ ...btnBase, backgroundColor: colors.lightGray, color: colors.text, flex: 1 }}>キャンセル</button>
        </div>
      </div>
    </div>
  );
}