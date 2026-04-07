import React from 'react';
import { labelMapCo, labelMapTr, statusOptions, categoryOptions, batchOptions, keysToClearOnNewPhase } from '../constants/constants';
import { calculateAge, calculateDates } from '../utils/utils';

export function CoFormModal({ coFormData, setCoFormData, handleSaveCompany, setShowCoForm, colors, btnBase, copy, grayCBtn }: any) {
  const handleChange = (k: string, v: string) => setCoFormData({ ...coFormData, [k]: v });
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 3000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ backgroundColor: '#FFF', padding: '40px', borderRadius: '12px', width: '90%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
        <h2 style={{ marginBottom: '20px' }}>実施者情報入力</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          {Object.keys(labelMapCo).map(k => (
            <div key={k} style={{ gridColumn: k === 'memo' ? 'span 2' : 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
                <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#95A5A6' }}>{labelMapCo[k]}</label>
                {k !== 'memo' && <button onClick={() => copy(coFormData[k])} style={grayCBtn}>C</button>}
              </div>
              {k === 'memo' ? 
                <textarea value={coFormData[k] || ''} style={{ width: '100%', padding: '10px', border: `1px solid ${colors.border}`, borderRadius: '6px', height: '100px' }} onChange={e => handleChange(k, e.target.value)} /> 
                : <input type="text" value={coFormData[k] || ''} style={{ width: '100%', padding: '10px', border: `1px solid ${colors.border}`, borderRadius: '6px' }} onChange={e => handleChange(k, e.target.value)} />
              }
            </div>
          ))}
        </div>
        <div style={{ marginTop: '30px', textAlign: 'right' }}>
          <button onClick={() => setShowCoForm(false)} style={{ ...btnBase, backgroundColor: colors.lightGray, marginRight: '10px' }}>中止</button>
          <button onClick={handleSaveCompany} style={{ ...btnBase, backgroundColor: colors.accent, color: '#FFF' }}>保存する</button>
        </div>
      </div>
    </div>
  );
}

export function TrFormModal({ trFormData, setTrFormData, handleSaveTrainee, setShowTrForm, colors, btnBase, isEditingTr, companies, editingPhaseIdx }: any) {
  const handleChange = (k: string, v: string) => {
    let newData = { ...trFormData, [k]: v };
    if (k === 'birthday') newData.age = calculateAge(v);
    if (k === 'entryDate') { const { end, renew } = calculateDates(v); newData.endDate = end; newData.renewStartDate = renew; }
    if (k === 'category' && isEditingTr && editingPhaseIdx === null) { 
      if (confirm("区分を変更しますか？前のデータは履歴に保存されます。")) { 
        const arc = { ...trFormData }; delete arc.phaseHistory; 
        newData.phaseHistory = [...(trFormData.phaseHistory || []), arc]; 
        keysToClearOnNewPhase.forEach(key => { newData[key] = (key === "status") ? "選択する" : ""; }); 
      } 
    }
    setTrFormData(newData);
  };
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 3000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ backgroundColor: '#FFF', padding: '40px', borderRadius: '12px', width: '90%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
        <h2 style={{ marginBottom: '20px' }}>実習生情報入力</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          {!isEditingTr && (<div style={{ gridColumn: 'span 2' }}><label style={{ fontSize: '11px', fontWeight: 'bold', color: '#95A5A6' }}>配属会社</label><select style={{ width: '100%', padding: '10px', border: `1px solid ${colors.border}`, borderRadius: '6px' }} value={trFormData.targetCompanyId} onChange={e => handleChange('targetCompanyId', e.target.value)}><option value="">会社を選択してください</option>{companies.map((c: any) => <option key={c.id} value={c.id}>{c.companyName}</option>)}</select></div>)}
          {Object.keys(labelMapTr).map(k => (
            <div key={k} style={{ gridColumn: k === 'memo' ? 'span 2' : 'auto' }}>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#95A5A6' }}>{labelMapTr[k]}</label>
              {['status', 'category', 'batch', 'gender'].includes(k) ? (
                <select style={{ width: '100%', padding: '10px', border: `1px solid ${colors.border}`, borderRadius: '6px' }} value={trFormData[k]} onChange={e => handleChange(k, e.target.value)}>
                  {(k === 'status' ? statusOptions : k === 'category' ? categoryOptions : k === 'batch' ? batchOptions : ["男", "女"]).map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : k === 'memo' ? 
                <textarea value={trFormData[k] || ''} style={{ width: '100%', padding: '10px', border: `1px solid ${colors.border}`, borderRadius: '6px', height: '100px' }} onChange={e => handleChange(k, e.target.value)} /> 
                : <input type="text" value={trFormData[k] || ''} style={{ width: '100%', padding: '10px', border: `1px solid ${colors.border}`, borderRadius: '6px' }} onChange={e => handleChange(k, e.target.value)} />
              }
            </div>
          ))}
        </div>
        <div style={{ marginTop: '30px', textAlign: 'right' }}>
          <button onClick={() => setShowTrForm(false)} style={{ ...btnBase, backgroundColor: colors.lightGray, marginRight: '10px' }}>中止</button>
          <button onClick={handleSaveTrainee} style={{ ...btnBase, backgroundColor: colors.accent, color: '#FFF' }}>保存する</button>
        </div>
      </div>
    </div>
  );
}