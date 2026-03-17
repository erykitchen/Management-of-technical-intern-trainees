"use client";
import React from 'react';
import Papa from 'papaparse';
import { categoryOptions, initialTraineeForm } from '../lib/constants';

const modalOverlay: React.CSSProperties = { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 };
const modalContent: React.CSSProperties = { backgroundColor: '#fff', padding: '35px', borderRadius: '4px', width: '450px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' };
const inputStyle: React.CSSProperties = { width: '100%', padding: '12px', marginBottom: '15px', borderRadius: '4px', border: '1px solid #ddd' };
const btnBase = { padding: '12px 24px', borderRadius: '4px', border: 'none', cursor: 'pointer', fontWeight: 'bold' as const };

export const CoFormModal = ({ isOpen, onClose, coFormData, setCoFormData, handleSaveCompany }: any) => {
  if (!isOpen) return null;
  return (
    <div style={modalOverlay}>
      <div style={modalContent}>
        <h3 style={{ marginBottom: '20px', borderLeft: '4px solid #F57C00', paddingLeft: '10px' }}>実施者情報の入力</h3>
        <input style={inputStyle} placeholder="会社名" value={coFormData.companyName || ""} onChange={e => setCoFormData({...coFormData, companyName: e.target.value})} />
        <input style={inputStyle} placeholder="郵便番号" value={coFormData.zip || ""} onChange={e => setCoFormData({...coFormData, zip: e.target.value})} />
        <input style={inputStyle} placeholder="住所" value={coFormData.address || ""} onChange={e => setCoFormData({...coFormData, address: e.target.value})} />
        <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
          <button style={{ ...btnBase, backgroundColor: '#F57C00', color: '#fff', flex: 1 }} onClick={handleSaveCompany}>保存する</button>
          <button style={{ ...btnBase, backgroundColor: '#eee', flex: 1 }} onClick={onClose}>キャンセル</button>
        </div>
      </div>
    </div>
  );
};

export const TrFormModal = ({ isOpen, onClose, trFormData, setTrFormData, handleSaveTrainee }: any) => {
  if (!isOpen) return null;
  return (
    <div style={modalOverlay}>
      <div style={modalContent}>
        <h3 style={{ marginBottom: '20px' }}>実習生情報の編集</h3>
        <input style={inputStyle} placeholder="氏名" value={trFormData.traineeName || ""} onChange={e => setTrFormData({...trFormData, traineeName: e.target.value})} />
        <select style={inputStyle} value={trFormData.category || ""} onChange={e => setTrFormData({...trFormData, category: e.target.value})}>
          {categoryOptions.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button style={{ ...btnBase, backgroundColor: '#F57C00', color: '#fff', flex: 1 }} onClick={handleSaveTrainee}>更新</button>
          <button style={{ ...btnBase, backgroundColor: '#eee', flex: 1 }} onClick={onClose}>閉じる</button>
        </div>
      </div>
    </div>
  );
};

export const AddTraineeModal = ({ isOpen, onClose, onConfirm, companyName }: any) => {
  if (!isOpen) return null;
  const handleFile = (e: any) => {
    const file = e.target.files[0];
    if (file) {
      Papa.parse(file, { header: true, skipEmptyLines: true, complete: (res) => onConfirm({ type: 'csv', data: res.data }) });
      onClose();
    }
  };
  return (
    <div style={modalOverlay}>
      <div style={modalContent}>
        <h3>{companyName}</h3>
        <div style={{ padding: '25px', border: '2px dashed #F57C00', borderRadius: '4px', textAlign: 'center', margin: '20px 0' }}>
          <label style={{ cursor: 'pointer', color: '#F57C00', fontWeight: 'bold' }}> CSVアップロード <input type="file" accept=".csv" style={{ display: 'none' }} onChange={handleFile} /> </label>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button style={{ ...btnBase, backgroundColor: '#fff', border: '1px solid #ddd', flex: 1 }} onClick={() => onConfirm({ type: 'manual', data: initialTraineeForm })}>手動追加</button>
          <button style={{ ...btnBase, backgroundColor: '#eee', flex: 1 }} onClick={onClose}>キャンセル</button>
        </div>
      </div>
    </div>
  );
};