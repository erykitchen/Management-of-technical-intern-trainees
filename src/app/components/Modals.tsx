// app/components/Modals.tsx
"use client";

import React from 'react';
import { 
  labelMapCo, 
  labelMapTr, 
  categoryOptions, 
  batchOptions, 
  nationalityOptions, 
  genderOptions, 
  statusOptions, 
  acceptanceOptions,
  keysToClearOnNewPhase
} from '../lib/constants';
import { calculateAge, calculateDates } from '../lib/utils';

// --- 会社登録・編集用モーダル ---
export function CoFormModal({ coFormData, setCoFormData, handleSaveCompany, setShowCoForm, colors, btnBase, isEditing }: any) {
  const handleChange = (k: string, v: string) => setCoFormData({ ...coFormData, [k]: v });

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
      <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '12px', width: '90%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
        <h2 style={{ marginBottom: '20px', borderBottom: `2px solid ${colors.primary}`, paddingBottom: '10px' }}>{isEditing ? "会社情報を編集" : "新規会社登録"}</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '15px' }}>
          {Object.keys(labelMapCo).map(key => (
            <div key={key} style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>{labelMapCo[key]}</label>
              {key === 'acceptance' ? (
                <select value={coFormData[key] || "選択する"} onChange={(e) => handleChange(key, e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}>
                  {acceptanceOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              ) : key === 'memo' ? (
                <textarea value={coFormData[key] || ""} onChange={(e) => handleChange(key, e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ddd', minHeight: '80px' }} />
              ) : (
                <input type="text" value={coFormData[key] || ""} onChange={(e) => handleChange(key, e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }} />
              )}
            </div>
          ))}
        </div>
        <div style={{ marginTop: '30px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button onClick={() => setShowCoForm(false)} style={{ padding: '10px 20px', borderRadius: '6px', border: '1px solid #ddd', backgroundColor: '#f5f5f5', cursor: 'pointer' }}>キャンセル</button>
          <button onClick={handleSaveCompany} style={{ ...btnBase, backgroundColor: colors.primary, color: 'white' }}>保存する</button>
        </div>
      </div>
    </div>
  );
}

// --- 実習生登録・編集用モーダル ---
export function TrFormModal({ trFormData, setTrFormData, handleSaveTrainee, setShowTrForm, colors, btnBase, isEditingTr, companies, editingPhaseIdx, currentCoId }: any) {
  
  const handleChange = (k: string, v: string) => {
    let newData = { ...trFormData, [k]: v };
    
    // 生年月日が入ったら年齢を自動計算
    if (k === 'birthday') newData.age = calculateAge(v);
    
    // 入国日が入ったら終了日と更新開始日を自動計算
    if (k === 'entryDate') {
      const dates = calculateDates(v);
      newData.endDate = dates.end;
      newData.renewStartDate = dates.renew;
    }

    // 区分が変わった時の処理
    if (k === 'category' && isEditingTr && editingPhaseIdx !== null) {
      if (confirm("区分を変更しますか？（一部の項目がリセットされます）")) {
        keysToClearOnNewPhase.forEach(key => newData[key] = "");
      } else {
        return;
      }
    }
    setTrFormData(newData);
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
      <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '12px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
        <h2 style={{ marginBottom: '20px', borderBottom: `2px solid ${colors.secondary}`, paddingBottom: '10px' }}>
          {isEditingTr ? "実習生情報を編集" : "新規実習生登録"}
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '15px' }}>
          {Object.keys(labelMapTr).map(key => (
            <div key={key} style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>{labelMapTr[key]}</label>
              {key === 'category' ? (
                <select value={trFormData[key] || "技能実習1号"} onChange={(e) => handleChange(key, e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}>
                  {categoryOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              ) : key === 'status' ? (
                <select value={trFormData[key] || "選択する"} onChange={(e) => handleChange(key, e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}>
                  {statusOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              ) : key === 'batch' ? (
                <select value={trFormData[key] || "なし"} onChange={(e) => handleChange(key, e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}>
                  {batchOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              ) : key === 'nationality' ? (
                <select value={trFormData[key] || "ベトナム"} onChange={(e) => handleChange(key, e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}>
                  {nationalityOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              ) : key === 'gender' ? (
                <select value={trFormData[key] || "男"} onChange={(e) => handleChange(key, e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}>
                  {genderOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              ) : (
                <input type="text" value={trFormData[key] || ""} onChange={(e) => handleChange(key, e.target.value)} placeholder={key === 'birthday' ? "例: 2000/01/01 または 令和2年..." : ""} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }} />
              )}
            </div>
          ))}
        </div>
        <div style={{ marginTop: '30px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button onClick={() => setShowTrForm(false)} style={{ padding: '10px 20px', borderRadius: '6px', border: '1px solid #ddd', backgroundColor: '#f5f5f5', cursor: 'pointer' }}>キャンセル</button>
          <button onClick={handleSaveTrainee} style={{ ...btnBase, backgroundColor: colors.secondary, color: 'white' }}>保存する</button>
        </div>
      </div>
    </div>
  );
}