import { 
  labelMapCo, labelMapTr, acceptanceOptions, statusOptions, 
  categoryOptions, batchOptions, nationalityOptions, genderOptions, keysToClearOnNewPhase 
} from '../lib/constants';
import { calculateAge, calculateDates } from '../lib/utils';

export function CoFormModal({ coFormData, setCoFormData, handleSaveCompany, setShowCoForm, colors, btnBase, isEditing }: any) {
  const handleChange = (k: string, v: string) => setCoFormData({ ...coFormData, [k]: v });
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ backgroundColor: '#FFF', padding: '40px', borderRadius: '8px', width: '90%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '20px', fontWeight: 'bold' }}>{isEditing ? '会社情報の編集' : '新規実施者の登録'}</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
          {Object.keys(labelMapCo).map(k => (
            <div key={k} style={{ gridColumn: k === 'memo' ? 'span 2' : 'auto' }}>
              <label style={{ fontSize: '11px', color: colors.gray, fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>{labelMapCo[k]}</label>
              {k === 'acceptance' ? (
                <select style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #CCC' }} value={coFormData[k]} onChange={e => handleChange(k, e.target.value)}>
                  {acceptanceOptions.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : k === 'memo' ? (
                <textarea style={{ width: '100%', padding: '8px', minHeight: '100px', border: '1px solid #CCC', borderRadius: '4px' }} value={coFormData[k] || ''} onChange={e => handleChange(k, e.target.value)} />
              ) : (
                <input type="text" value={coFormData[k] || ''} style={{ width: '100%', padding: '8px', border: '1px solid #CCC', borderRadius: '4px' }} onChange={e => handleChange(k, e.target.value)} />
              )}
            </div>
          ))}
        </div>
        <div style={{ marginTop: '30px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button onClick={() => setShowCoForm(false)} style={{ ...btnBase, backgroundColor: colors.lightGray }}>キャンセル</button>
          <button onClick={handleSaveCompany} style={{ ...btnBase, backgroundColor: colors.accent, color: '#FFF' }}>保存する</button>
        </div>
      </div>
    </div>
  );
}

export function TrFormModal({ trFormData, setTrFormData, handleSaveTrainee, setShowTrForm, colors, btnBase, isEditingTr, companies, editingPhaseIdx, currentCoId }: any) {
  const handleChange = (k: string, v: string) => {
    let newData = { ...trFormData, [k]: v };
    if (k === 'birthday') newData.age = calculateAge(v);
    if (k === 'entryDate') {
      const { end, renew } = calculateDates(v);
      newData.endDate = end; newData.renewStartDate = renew;
    }
    if (k === 'category' && isEditingTr && editingPhaseIdx === null) {
      if (confirm("区分を変更します。現在のデータは履歴に保存されます。")) {
        const archiveEntry = { ...trFormData };
        delete archiveEntry.phaseHistory;
        newData.phaseHistory = [...(trFormData.phaseHistory || []), archiveEntry];
        keysToClearOnNewPhase.forEach(key => { newData[key] = (key === "status") ? "選択する" : ""; });
        newData.period = "1年"; 
      }
    }
    setTrFormData(newData);
  };
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ backgroundColor: '#FFF', padding: '40px', borderRadius: '8px', width: '90%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '20px', fontWeight: 'bold' }}>実習生情報の登録・編集</h2>
        {!isEditingTr && (
          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '11px', fontWeight: 'bold' }}>配属先の会社を選択</label>
            <select style={{ width: '100%', padding: '10px', border: `1px solid #ccc`, borderRadius: '4px' }} value={trFormData.targetCompanyId || currentCoId || ""} onChange={e => handleChange('targetCompanyId', e.target.value)}>
              <option value="">会社を選んでください</option>
              {companies.map((c: any) => <option key={c.id} value={c.id}>{c.companyName}</option>)}
            </select>
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
          {Object.keys(labelMapTr).map(k => (
            <div key={k}>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: colors.gray }}>{labelMapTr[k]}</label>
              { k === 'status' ? (
                <select style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #CCC' }} value={trFormData[k]} onChange={e => handleChange(k, e.target.value)}>
                  {statusOptions.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : k === 'category' ? (
                <select style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #CCC' }} value={trFormData[k]} onChange={e => handleChange(k, e.target.value)} disabled={editingPhaseIdx !== null}>
                  {categoryOptions.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : k === 'batch' ? (
                <select style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #CCC' }} value={trFormData[k]} onChange={e => handleChange(k, e.target.value)}>
                  {batchOptions.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : k === 'nationality' ? (
                <select style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #CCC' }} value={trFormData[k]} onChange={e => handleChange(k, e.target.value)}>
                  {nationalityOptions.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : k === 'gender' ? (
                <select style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #CCC' }} value={trFormData[k]} onChange={e => handleChange(k, e.target.value)}>
                  {genderOptions.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <input type="text" value={trFormData[k] || ''} style={{ width: '100%', padding: '8px', border: '1px solid #CCC', borderRadius: '4px' }} onChange={e => handleChange(k, e.target.value)} />
              )}
            </div>
          ))}
        </div>
        <div style={{ marginTop: '30px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button onClick={() => setShowTrForm(false)} style={{ ...btnBase, backgroundColor: colors.lightGray }}>キャンセル</button>
          <button onClick={handleSaveTrainee} style={{ ...btnBase, backgroundColor: colors.accent, color: '#FFF' }}>保存する</button>
        </div>
      </div>
    </div>
  );
}