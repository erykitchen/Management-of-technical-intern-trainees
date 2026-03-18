"use client";
import { useState } from 'react';
import { labelMapCo, labelMapTr } from '../constants/labels';

export default function CompanyDetail({ 
  currentCo, selectedTrId, setSelectedTrId, onBack, copy, hasAlert,
  setShowTrMethodModal, setIsEditingCo, setCoFormData, setShowCoForm, handleDeleteCompany,
  setTrFormData, setIsEditingTr, setEditingPhaseIdx, setShowTrForm, handleDeleteTrainee
}: any) {
  const [activeTab, setActiveTab] = useState<'current' | number>('current');
  const [filterBatch, setFilterBatch] = useState<string>('すべて');

  const colors = { accent: '#F57C00', gray: '#95A5A6', danger: '#E74C3C', border: '#E0E0E0' };
  const btnBase = { padding: '10px 18px', borderRadius: '4px', border: 'none', cursor: 'pointer', fontWeight: '600' as any };

  const currentTrainee = currentCo.trainees?.find((t: any) => t.id === selectedTrId);
  const activeData = activeTab === 'current' ? currentTrainee : currentTrainee?.phaseHistory[activeTab as number];

  return (
    <div style={{ backgroundColor: '#FBFBFB', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <nav style={{ padding: '15px 30px', backgroundColor: '#FFF', borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>← 一覧に戻る</button>
        <div style={{ display: 'flex', gap: '10px' }}>
          {!selectedTrId ? (
            <><button onClick={() => setShowTrMethodModal(true)} style={{ ...btnBase, backgroundColor: colors.accent, color: '#fff' }}>＋ 実習生追加</button>
              <button onClick={() => { setIsEditingCo(true); setCoFormData(currentCo); setShowCoForm(true); }} style={{ ...btnBase, backgroundColor: colors.accent, color: '#fff' }}>会社編集</button>
              <button onClick={handleDeleteCompany} style={{ ...btnBase, border: `1px solid ${colors.danger}`, color: colors.danger }}>会社削除</button></>
          ) : (
            <><button onClick={() => { setTrFormData(activeData); setIsEditingTr(true); setEditingPhaseIdx(activeTab === 'current' ? null : (activeTab as number)); setShowTrForm(true); }} style={{ ...btnBase, backgroundColor: colors.accent, color: '#fff' }}>編集・区分更新</button>
              <button onClick={handleDeleteTrainee} style={{ ...btnBase, border: `1px solid ${colors.danger}`, color: colors.danger }}>削除</button>
              <button onClick={() => setSelectedTrId(null)} style={{ ...btnBase, backgroundColor: '#eee' }}>閉じる</button></>
          )}
        </div>
      </nav>
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', flex: 1, backgroundColor: '#eee', gap: '1px' }}>
        <aside style={{ backgroundColor: '#FFF', padding: '30px', overflowY: 'auto' }}>
          <h2 style={{ borderBottom: '2px solid #F57C00', paddingBottom: '10px' }}>{currentCo.companyName}</h2>
          {Object.keys(labelMapCo).map(k => (
            <div key={k} style={{ marginBottom: '15px', fontSize: '13px' }}>
              <span style={{ color: colors.gray, display: 'block' }}>{labelMapCo[k]}</span>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ fontWeight: 'bold' }}>{currentCo[k] || '-'}</span>
                <button onClick={() => copy(currentCo[k])} style={{ marginLeft: '10px', fontSize: '10px', cursor: 'pointer' }}>C</button>
              </div>
            </div>
          ))}
        </aside>
        <section style={{ backgroundColor: '#FBFBFB', padding: '40px', overflowY: 'auto' }}>
          {!selectedTrId ? (
            <div>
              <h3 style={{ color: colors.gray }}>実習生一覧</h3>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {currentCo.trainees?.map((t: any) => (
                  <button key={t.id} onClick={() => { setSelectedTrId(t.id); setActiveTab('current'); }} style={{ padding: '15px 25px', background: '#fff', border: hasAlert(t) ? '2px solid red' : '1px solid #ddd', borderRadius: '4px', fontWeight: 'bold' }}>
                    {t.traineeName} {hasAlert(t) && "⚠️"}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '8px', border: '1px solid #ddd' }}>
              <h3>{activeData.traineeName}</h3>
              <div style={{ display: 'flex', gap: '10px', borderBottom: '1px solid #ddd', marginBottom: '20px' }}>
                <button onClick={() => setActiveTab('current')} style={{ padding: '10px', background: activeTab === 'current' ? '#FFF9F0' : 'none', border: 'none' }}>最新</button>
                {currentTrainee.phaseHistory?.map((h: any, idx: number) => <button key={idx} onClick={() => setActiveTab(idx)} style={{ padding: '10px', border: 'none' }}>{h.category}時</button>)}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                {Object.keys(labelMapTr).map(k => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f9f9f9', padding: '5px' }}>
                    <span style={{ color: colors.gray }}>{labelMapTr[k]}</span>
                    <span style={{ fontWeight: 'bold' }}>{activeData[k] || '-'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}