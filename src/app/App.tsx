"use client";
import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, addDoc, getDocs, query, orderBy, doc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";

import { 
  labelMapCo, labelMapTr, categoryOptions, batchOptions, statusOptions, 
  assigneeOptions, todoCategoryOptions, batchColorMap, initialCompanyForm, 
  initialTraineeForm, initialTodoForm, colors, keysToClearOnNewPhase 
} from './constants/constants';
import { convertToAD, getRemainingDays, calculateAge, calculateDates } from './utils/utils';
import { CoFormModal, TrFormModal } from './components/components';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [view, setView] = useState<'list' | 'detail' | 'print_tr' | 'print_co'>('list');
  const [showTrForm, setShowTrForm] = useState(false);
  const [showTrMethodModal, setShowTrMethodModal] = useState(false);
  const [showCoMethodModal, setShowCoMethodModal] = useState(false);
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [showCoForm, setShowCoForm] = useState(false);
  const [isEditingTr, setIsEditingTr] = useState(false);
  const [isEditingCo, setIsEditingCo] = useState(false);
  const [editingPhaseIdx, setEditingPhaseIdx] = useState<number | null>(null);
  const [currentCo, setCurrentCo] = useState<any>(null);
  const [selectedTrId, setSelectedTrId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'current' | number>('current');
  const [companies, setCompanies] = useState<any[]>([]);
  const [trFormData, setTrFormData] = useState<any>(initialTraineeForm);
  const [coFormData, setCoFormData] = useState<any>(initialCompanyForm);
  const [filterBatch, setFilterBatch] = useState<string>('すべて');

  const [todos, setTodos] = useState<any[]>([]);
  const [showTodoForm, setShowTodoForm] = useState(false);
  const [todoFormData, setTodoFormData] = useState<any>(initialTodoForm);
  const [isEditingTodo, setIsEditingTodo] = useState(false);
  const [selectedTodo, setSelectedTodo] = useState<any>(null);
  const [showAssigneeModal, setShowAssigneeModal] = useState(false);
  const [selectedAssigneeFilter, setSelectedAssigneeFilter] = useState<string>("");

  const [selectedAlert, setSelectedAlert] = useState<any>(null);
  const [pendingMemo, setPendingMemo] = useState("");

  const [printCoId, setPrintCoId] = useState("");
  const [printTrIds, setPrintTrIds] = useState<number[]>([]);
  const [printFields, setPrintFields] = useState<string[]>([]);
  const [printMode, setPrintMode] = useState<'individual' | 'table'>('individual');
  const [isPreview, setIsPreview] = useState(false);

  const shadow = '0 4px 15px rgba(0,0,0,0.05)';
  const sharpRadius = '12px';
  const btnBase = { padding: '10px 18px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: '800' as const, fontSize: '13px', transition: '0.2s' };
  const grayCBtn = { width: '24px', height: '24px', fontSize: '10px', cursor: 'pointer', backgroundColor: 'transparent', border: `1px solid ${colors.border}`, borderRadius: '4px', color: colors.gray, marginLeft: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' };

  const trBasicFields = ["traineeName", "kana", "traineeZip", "traineeAddress", "category", "nationality", "birthday", "age", "gender", "stayLimit", "cardNumber", "passportLimit", "passportNumber", "certificateNumber", "certDate", "endDate"];
  const coBasicFields = ["companyName", "representative", "zipCode", "address", "tel", "corporateNumber", "laborInsurance", "employmentInsurance", "implementationNumber"];

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

  const fetchTodos = async () => {
    const q = query(collection(db, "todos"), orderBy("deadline", "asc"));
    const querySnapshot = await getDocs(q);
    setTodos(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  useEffect(() => { fetchCompanies(); fetchTodos(); }, []);

  const copy = (text: string) => { if (text) navigator.clipboard.writeText(text); };
  const formatDays = (days: number | null) => {
    if (days === null) return "-";
    if (days < 0) return `${Math.abs(days)}日超過`;
    return `あと${days}日`;
  };

  const getAlertStyle = (dateStr: string, fieldKey: string, category: string): any => {
    if (!dateStr || category === "実習終了") return { color: '#2C3E50' };
    const alertFields = ["stayLimit", "examDate", "deadline"];
    if (!alertFields.includes(fieldKey)) return {};
    const diffDays = getRemainingDays(dateStr);
    if (diffDays === null) return { color: '#2C3E50' };
    if (diffDays <= 30) return { border: '4px double #FFD700', outline: '2px solid #E74C3C', outlineOffset: '-4px', backgroundColor: '#FFF5F5', borderRadius: '4px' };
    else if (diffDays <= 60) return { border: '2px solid #E74C3C', backgroundColor: '#FFF5F5', borderRadius: '4px' };
    else if (diffDays <= 90) return { border: '2px solid #FFD700', backgroundColor: '#FFFFF0', borderRadius: '4px' };
    return {};
  };

  const hasAlert = (t: any) => {
    const alertFields = ["stayLimit", "examDate"];
    return alertFields.some(key => {
      const style = getAlertStyle(t[key], key, t.category);
      return style.border && style.border !== 'none';
    });
  };

  const activeCompanyCount = companies.filter(c => (c.trainees || []).some((t: any) => t.category !== "実習終了")).length;
  const totalActiveTrainees = companies.reduce((sum, c) => sum + (c.trainees || []).filter((t: any) => t.category !== "実習終了").length, 0);

  // ログイン画面
  if (!isLoggedIn) {
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: '#F9F9F9', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
        <div style={{ padding: '40px', background: '#fff', borderRadius: sharpRadius, boxShadow: shadow, textAlign: 'center' }}>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: colors.text, marginBottom: '5px' }}>アシストねっと協同組合</h1>
          <p style={{ fontSize: '14px', color: colors.gray, marginBottom: '30px' }}>技能実習生管理システム</p>
          <p style={{ fontSize: '13px', marginBottom: '10px' }}>パスワードを入力して下さい</p>
          <input type="password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} style={{ padding: '12px', width: '220px', borderRadius: '8px', border: '1px solid #ddd', marginBottom: '20px', textAlign: 'center', fontSize: '18px' }} onKeyDown={(e) => { if (e.key === 'Enter' && passwordInput === '4647') setIsLoggedIn(true); }} />
          <br /><button onClick={() => { if (passwordInput === '4647') setIsLoggedIn(true); else alert("違います"); }} style={{ ...btnBase, backgroundColor: colors.accent, color: '#fff', width: '100%' }}>ログイン</button>
        </div>
      </div>
    );
  }

  // 印刷プレビュー (全ロジック完全復元)
  if ((view === 'print_tr' || view === 'print_co') && isPreview) {
    const selectedCompanyForPrint = companies.find(c => c.id === printCoId);
    const selectedTrainees = selectedCompanyForPrint?.trainees.filter((t: any) => printTrIds.includes(t.id)) || [];
    return (
      <div className="print-area" style={{ padding: '0', backgroundColor: '#fff', minHeight: '100vh' }}>
        <style>{`
          @media print { .no-print { display: none !important; } body { background: #fff; margin: 0; } .page-break { page-break-after: always; } @page { size: ${printMode === 'table' ? 'A4 landscape' : 'A4 portrait'}; margin: 10mm; } }
          .individual-table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
          .individual-table th, .individual-table td { border: 1px solid #000; padding: 8px 12px; font-size: 13px; text-align: left; }
          .individual-table th { background-color: #f2f2f2; width: 30%; }
          .list-table { border-collapse: collapse; width: 100%; table-layout: auto; }
          .list-table th, .list-table td { border: 1px solid #000; padding: 4px 6px; font-size: 10px; text-align: left; word-break: break-all; }
          .list-table th { background-color: #f2f2f2; }
        `}</style>
        <div className="no-print" style={{ padding: '20px', display: 'flex', gap: '10px', background: '#eee', borderBottom: '1px solid #ccc', alignItems: 'center' }}>
          <button onClick={() => setIsPreview(false)} style={{ ...btnBase, backgroundColor: colors.gray, color: '#fff' }}>設定に戻る</button>
          <button onClick={() => window.print()} style={{ ...btnBase, backgroundColor: colors.accent, color: '#fff' }}>印刷を実行</button>
        </div>
        <div style={{ padding: '40px' }}>
          <h2 style={{ fontSize: '18px', marginBottom: '15px', textAlign: 'center', borderBottom: '2px solid #000' }}>{view === 'print_tr' ? (printMode === 'individual' ? '技能実習生管理簿' : '実習生一覧表') : '実習実施者情報詳細'}</h2>
          {view === 'print_tr' && printMode === 'individual' ? (
            selectedTrainees.map((t: any) => (
              <div key={t.id} className="page-break" style={{ marginBottom: '50px' }}>
                <div style={{ textAlign: 'right', fontSize: '12px', marginBottom: '5px' }}>所属: {selectedCompanyForPrint?.companyName}</div>
                <table className="individual-table"><tbody>{printFields.map(key => (<tr key={key}><th>{labelMapTr[key]}</th><td>{t[key] || '-'}</td></tr>))}</tbody></table>
              </div>
            ))
          ) : view === 'print_tr' && printMode === 'table' ? (
            <table className="list-table"><thead><tr>{printFields.map(key => <th key={key}>{labelMapTr[key]}</th>)}</tr></thead><tbody>{selectedTrainees.map((t: any) => (<tr key={t.id}>{printFields.map(key => <td key={key}>{t[key] || '-'}</td>)}</tr>))}</tbody></table>
          ) : (
            <table className="individual-table"><tbody>{printFields.map(key => (<tr key={key}><th>{labelMapCo[key]}</th><td>{selectedCompanyForPrint?.[key] || '-'}</td></tr>))}</tbody></table>
          )}
        </div>
      </div>
    );
  }

  // 印刷設定画面 (全ロジック完全復元)
  if ((view === 'print_tr' || view === 'print_co') && !isPreview) {
    const labels = view === 'print_tr' ? labelMapTr : labelMapCo;
    const selectedCompanyForPrint = companies.find(c => c.id === printCoId);
    return (
      <main style={{ padding: '40px', backgroundColor: '#F9F9F9', minHeight: '100vh' }}>
        <header style={{ marginBottom: '30px' }}><button onClick={() => setView('list')} style={{ background: 'none', border: 'none', color: colors.gray, cursor: 'pointer', fontWeight: '800' }}>← 戻る</button><h1 style={{ fontSize: '24px', marginTop: '10px', fontWeight:'800' }}>印刷設定</h1></header>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
          <div style={{ backgroundColor: '#fff', padding: '25px', borderRadius: sharpRadius, border: `1px solid ${colors.border}`, boxShadow: shadow }}>
            <h3 style={{ marginBottom: '15px', fontWeight:'800' }}>1. 対象を選択</h3>
            <select style={{ width: '100%', padding: '10px', marginBottom: '20px', borderRadius: '8px' }} value={printCoId} onChange={(e) => { setPrintCoId(e.target.value); setPrintTrIds([]); }}>
              <option value="">会社を選択</option>{companies.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
            </select>
            {view === 'print_tr' && (
              <div style={{ marginBottom: '20px' }}>
                <p style={{ fontSize: '12px', color: colors.gray, marginBottom: '5px', fontWeight:'800' }}>印刷形式を選択</p>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => setPrintMode('individual')} style={{ ...btnBase, flex: 1, backgroundColor: printMode === 'individual' ? colors.accent : colors.lightGray, color: printMode === 'individual' ? '#fff' : '#000' }}>個別</button>
                  <button onClick={() => setPrintMode('table')} style={{ ...btnBase, flex: 1, backgroundColor: printMode === 'table' ? colors.accent : colors.lightGray, color: printMode === 'table' ? '#fff' : '#000' }}>一覧表</button>
                </div>
              </div>
            )}
            {view === 'print_tr' && selectedCompanyForPrint && (
              <div style={{ maxHeight: '300px', overflowY: 'auto', border: `1px solid ${colors.border}`, padding: '10px', borderRadius: '8px' }}>
                {selectedCompanyForPrint.trainees?.map((t: any) => (
                  <label key={t.id} style={{ display: 'block', padding: '8px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={printTrIds.includes(t.id)} onChange={(e) => { if (e.target.checked) setPrintTrIds([...printTrIds, t.id]); else setPrintTrIds(printTrIds.filter(id => id !== t.id)); }} style={{ marginRight: '10px' }} />{t.traineeName}
                  </label>
                ))}
              </div>
            )}
          </div>
          <div style={{ backgroundColor: '#fff', padding: '25px', borderRadius: sharpRadius, border: `1px solid ${colors.border}`, boxShadow: shadow }}>
            <h3 style={{ marginBottom: '15px', fontWeight:'800' }}>2. 印刷項目を選択</h3>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', flexWrap: 'wrap' }}>
              <button onClick={() => setPrintFields(Object.keys(labels))} style={{ ...btnBase, backgroundColor: colors.lightGray, fontSize: '11px', padding: '5px 12px' }}>全選択</button>
              <button onClick={() => setPrintFields(view === 'print_tr' ? trBasicFields : coBasicFields)} style={{ ...btnBase, backgroundColor: colors.info, color: '#fff', fontSize: '11px', padding: '5px 12px' }}>基本情報</button>
              <button onClick={() => setPrintFields([])} style={{ ...btnBase, backgroundColor: colors.lightGray, fontSize: '11px', padding: '5px 12px' }}>解除</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', maxHeight: '400px', overflowY: 'auto' }}>
              {Object.keys(labels).map(key => (
                <label key={key} style={{ fontSize: '13px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={printFields.includes(key)} onChange={(e) => { if (e.target.checked) setPrintFields([...printFields, key]); else setPrintFields(printFields.filter(f => f !== key)); }} style={{ marginRight: '8px' }} />{labels[key]}
                </label>
              ))}
            </div>
          </div>
        </div>
        <div style={{ marginTop: '30px', textAlign: 'center' }}><button disabled={!printCoId || (view === 'print_tr' && printTrIds.length === 0) || printFields.length === 0} onClick={() => setIsPreview(true)} style={{ ...btnBase, backgroundColor: colors.accent, color: '#fff', padding: '15px 60px', fontSize: '16px' }}>表示</button></div>
      </main>
    );
  }

  // メインリスト表示
  if (view === 'list') {
    const alertList: any[] = [];
    const pendingList: any[] = [];
    companies.forEach(c => {
      (c.pendingAlerts || []).forEach((p: any) => {
        const trainee = (c.trainees || []).find((t: any) => t.id === p.traineeId);
        if (trainee) pendingList.push({ co: c, trainee, field: labelMapTr[p.field], deadline: p.deadline, memo: p.memo, movedAt: p.movedAt });
      });
      (c.trainees || []).forEach(t => {
        ["stayLimit", "examDate"].forEach(key => {
          if (!(c.pendingAlerts || []).some((p: any) => p.traineeId === t.id && p.field === key)) {
            const style = getAlertStyle(t[key], key, t.category);
            if (style.border) alertList.push({ co: c, trainee: t, fieldKey: key, companyName: c.companyName, traineeName: t.traineeName, field: labelMapTr[key], deadline: t[key], days: getRemainingDays(t[key]), style });
          }
        });
      });
    });

    return (
      <main style={{ padding: '40px', backgroundColor: '#F9F9F9', minHeight: '100vh', color: colors.text }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '25px', alignItems: 'flex-end' }}>
          <div><h1 style={{ fontSize: '28px', fontWeight: '800', color: colors.text }}>アシストねっと協同組合</h1><p style={{ fontSize: '12px', color: colors.gray }}>技能実習生管理システム</p></div>
          <div style={{ display: 'flex', gap: '30px', alignItems: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '12px', color: colors.gray, marginBottom: '4px' }}>受入中事業主数</div>
              <div style={{ fontSize: '28px', fontWeight: '800' }}>
                <span style={{ color: colors.accent }}>{activeCompanyCount}</span> <span style={{ color: '#000', fontSize: '16px' }}>社</span>
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '12px', color: colors.gray, marginBottom: '4px' }}>組合全体受入人数</div>
              <div style={{ fontSize: '28px', fontWeight: '800' }}>
                <span style={{ color: colors.accent }}>{totalActiveTrainees}</span> <span style={{ color: '#000', fontSize: '16px' }}>名</span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => { setView('print_tr'); setIsPreview(false); }} style={{ ...btnBase, backgroundColor: '#fff', border: `1px solid ${colors.border}`, color: colors.text }}>実習生情報印刷</button>
            <button onClick={() => { setView('print_co'); setIsPreview(false); }} style={{ ...btnBase, backgroundColor: '#fff', border: `1px solid ${colors.border}`, color: colors.text }}>会社情報印刷</button>
            <button onClick={() => setShowTrMethodModal(true)} style={{ ...btnBase, backgroundColor: colors.accent, color: '#fff' }}>＋ 新規実習生</button>
            <button onClick={() => setShowCoMethodModal(true)} style={{ ...btnBase, backgroundColor: colors.accent, color: '#fff' }}>＋ 新規実習実施者</button>
          </div>
        </header>

        {/* TODO 3列横並び ＆ リスト幅拡大レイアウト */}
        <div style={{ display: 'flex', gap: '20px', marginBottom: '30px' }}>
          <div style={{ flex: 1.5, backgroundColor: '#fff', borderRadius: '8px', padding: '15px', border: `1px solid ${colors.border}`, boxShadow: shadow, display: 'flex', flexDirection: 'column', maxHeight: '420px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '800' }}>📝 TODOリスト <span style={{ fontSize: '11px', color: colors.gray, fontWeight: '400' }}>(完了したらチェック)</span></h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => setShowAssigneeModal(true)} style={{ ...btnBase, padding: '3px 8px', fontSize: '10px', backgroundColor: colors.info, color: '#fff' }}>担当別</button>
                <button onClick={() => { setTodoFormData(initialTodoForm); setIsEditingTodo(false); setShowTodoForm(true); }} style={{ ...btnBase, padding: '3px 8px', fontSize: '10px', backgroundColor: colors.accent, color: '#fff' }}>追加</button>
              </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              {todoCategoryOptions.map(cat => (
                <div key={cat} style={{ border: `1px solid ${colors.lightGray}`, borderRadius: '4px', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ backgroundColor: colors.lightGray, padding: '2px 10px', fontSize: '12px', fontWeight: '800' }}>【{cat}】</div>
                  <div style={{ flex: 1, overflowY: 'auto' }}>
                    {todos.filter(t => (t.todoCategory || "TODO") === cat).map(todo => {
                      const company = companies.find(c => c.id === todo.companyId);
                      return (
                        <div key={todo.id} style={{ padding: '6px 10px', borderBottom: `1px solid ${colors.lightGray}`, cursor: 'pointer', fontSize: '12px', ...getAlertStyle(todo.deadline, 'deadline', '') }} onClick={() => setSelectedTodo(todo)}>
                          <div style={{ fontWeight: '800', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{company?.companyName}</div>
                          <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{todo.task}</div>
                          {/* 担当者表示復活 */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: colors.info, marginTop: '2px' }}>
                            <span>[{todo.assignee || '未定'}]</span>
                            <span style={{ color: colors.danger }}>{todo.deadline?.replace('2026/', '')}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 右側リストを幅広に調整 */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={{ backgroundColor: '#fff', borderRadius: '8px', padding: '15px', border: `1px solid ${colors.border}`, boxShadow: shadow, maxHeight: '200px', overflowY: 'auto' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '800', marginBottom: '8px', color: colors.danger }}>⚠️ 期限注意</h3>
              {alertList.sort((a,b) => (a.days ?? 0) - (b.days ?? 0)).map((a, i) => (
                <div key={i} onClick={() => setSelectedAlert(a)} style={{ padding: '5px 8px', borderBottom: '1px solid #f0f0f0', cursor: 'pointer', fontSize: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', ...a.style }}>
                  <b style={{ marginRight: '10px', fontWeight: '800' }}>{a.companyName}</b> {a.traineeName} <span style={{ color: colors.gray, marginLeft: 'auto' }}>| {a.field} ({formatDays(a.days)})</span>
                </div>
              ))}
            </div>
            <div style={{ backgroundColor: '#fff', borderRadius: '8px', padding: '15px', border: `1px solid ${colors.border}`, boxShadow: shadow, maxHeight: '195px', overflowY: 'auto' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '800', marginBottom: '8px', color: colors.gray }}>⏸ 保留リスト</h3>
              {pendingList.map((p, i) => (
                <div key={i} onClick={() => { setCurrentCo(p.co); setView('detail'); setSelectedTrId(p.trainee.id); }} style={{ padding: '5px 8px', borderBottom: '1px solid #f0f0f0', cursor: 'pointer', fontSize: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  <b style={{ marginRight: '10px', fontWeight: '800' }}>{p.co.companyName}</b> {p.trainee.traineeName} <span style={{ color: colors.info, marginLeft: '10px', fontWeight: '800' }}>{p.memo}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <h3 style={{ fontSize: '17px', fontWeight: '800', marginBottom: '15px' }}>🏢 実施者一覧</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px' }}>
          {companies.map(c => (
            <div key={c.id} onClick={() => { setCurrentCo(c); setView('detail'); setFilterBatch('すべて'); }} style={{ backgroundColor: '#fff', padding: '18px', borderRadius: '8px', boxShadow: shadow, border: (c.trainees || []).some((t:any) => hasAlert(t)) ? `2px solid ${colors.danger}` : `1px solid ${colors.border}`, cursor: 'pointer' }}>
              <div style={{ fontWeight: '800', fontSize: '14px', marginBottom: '5px' }}>{c.companyName}</div>
              <div style={{ fontSize: '12px', color: colors.gray }}>受入中: <span style={{ color: colors.accent, fontWeight: '800' }}>{(c.trainees || []).filter((t: any) => t.category !== "実習終了").length}</span> 名</div>
            </div>
          ))}
        </div>

        {/* ポップアップ類 */}
        {showTodoForm && (
          <div style={{ position: 'fixed', top:0, left:0, width:'100%', height:'100%', background:'rgba(0,0,0,0.5)', display:'flex', justifyContent:'center', alignItems:'center', zIndex:3000 }}>
            <div style={{ background:'#fff', padding:'30px', borderRadius:'8px', width:'500px' }}>
              <h3 style={{fontWeight:'800'}}>TODO登録</h3>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginTop:'15px' }}>
                <select value={todoFormData.todoCategory} onChange={e => setTodoFormData({...todoFormData, todoCategory: e.target.value})}>
                  {todoCategoryOptions.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
                <select value={todoFormData.assignee} onChange={e => setTodoFormData({...todoFormData, assignee: e.target.value})}>
                  {assigneeOptions.map(o => <option key={o} value={o}>{o || "(担当者を選択)"}</option>)}
                </select>
              </div>
              <select style={{ width:'100%', padding:'10px', marginTop:'10px' }} value={todoFormData.companyId} onChange={e => setTodoFormData({...todoFormData, companyId: e.target.value, traineeId: ""})}>
                <option value="">会社を選択</option>{companies.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
              </select>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginTop:'10px' }}>
                <select value={todoFormData.batch} onChange={e => setTodoFormData({...todoFormData, batch: e.target.value})}>
                  {batchOptions.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
                <select value={todoFormData.traineeId} onChange={e => setTodoFormData({...todoFormData, traineeId: e.target.value})}>
                  <option value="">(実習生を選択)</option>
                  {companies.find(c => c.id === todoFormData.companyId)?.trainees?.map((t:any) => <option key={t.id} value={t.id}>{t.traineeName}</option>)}
                </select>
              </div>
              <input type="text" placeholder="やること" style={{ width:'100%', padding:'10px', marginTop:'10px' }} value={todoFormData.task} onChange={e => setTodoFormData({...todoFormData, task: e.target.value})} />
              <textarea placeholder="詳細メモ" style={{ width:'100%', padding:'10px', marginTop:'10px', height:'80px' }} value={todoFormData.detail} onChange={e => setTodoFormData({...todoFormData, detail: e.target.value})} />
              <input type="text" placeholder="期限 (2026/04/30)" style={{ width:'100%', padding:'10px', marginTop:'10px' }} value={todoFormData.deadline} onChange={e => setTodoFormData({...todoFormData, deadline: e.target.value})} />
              <div style={{ display:'flex', gap:'10px', marginTop:'20px' }}><button onClick={() => setShowTodoForm(false)} style={btnBase}>中止</button><button onClick={handleSaveTodo} style={{ ...btnBase, backgroundColor:colors.accent, color:'#fff' }}>保存</button></div>
            </div>
          </div>
        )}

        {selectedTodo && !showTodoForm && (
          <div onClick={() => setSelectedTodo(null)} style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.3)', zIndex: 2500, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div onClick={e => e.stopPropagation()} style={{ backgroundColor: '#FFF', padding: '30px', borderRadius: '8px', width: '400px' }}>
              <div onClick={() => { setCurrentCo(companies.find(c => c.id === selectedTodo.companyId)); setView('detail'); setSelectedTodo(null); }} style={{ fontSize: '15px', color: colors.accent, cursor: 'pointer', fontWeight: '800', textDecoration: 'underline' }}>{companies.find(c => c.id === selectedTodo.companyId)?.companyName}</div>
              <h3 style={{fontWeight:'800', marginTop:'10px'}}>{selectedTodo.task}</h3>
              <div style={{ fontSize: '14px', background: '#f9f9f9', padding: '15px', borderRadius: '4px', margin: '15px 0' }}>{selectedTodo.detail || '詳細なし'}</div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => { setTodoFormData(selectedTodo); setIsEditingTodo(true); setShowTodoForm(true); setSelectedTodo(null); }} style={{ ...btnBase, flex: 1, backgroundColor: colors.info, color: '#fff' }}>編集</button>
                <button onClick={() => setSelectedTodo(null)} style={{ ...btnBase, flex: 1, backgroundColor: colors.lightGray }}>閉じる</button>
              </div>
            </div>
          </div>
        )}

        {showTrMethodModal && (<div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}><div style={{ backgroundColor: '#FFF', padding: '30px', borderRadius: '8px', textAlign: 'center' }}><h3 style={{fontWeight:'800'}}>登録方法選択</h3><div style={{ display: 'flex', gap: '15px', marginTop: '20px' }}><button onClick={() => { setShowTrMethodModal(false); setShowTrForm(true); setTrFormData(initialTraineeForm); setIsEditingTr(false); }} style={{ ...btnBase, backgroundColor: colors.accent, color: '#fff' }}>手入力</button></div><button onClick={() => setShowTrMethodModal(false)} style={{ background:'none', border:'none', marginTop:'15px', cursor:'pointer' }}>中止</button></div></div>)}
        {showCoMethodModal && (<div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}><div style={{ backgroundColor: '#FFF', padding: '30px', borderRadius: '8px', textAlign: 'center' }}><h3 style={{fontWeight:'800'}}>実施者の登録方法</h3><div style={{ display: 'flex', gap: '15px', marginTop: '20px' }}><button onClick={() => { setShowCoMethodModal(false); setShowCoForm(true); setCoFormData(initialCompanyForm); setIsEditingCo(false); }} style={{ ...btnBase, backgroundColor: colors.accent, color: '#fff' }}>手入力</button></div><button onClick={() => setShowCoMethodModal(false)} style={{ background:'none', border:'none', marginTop:'15px', cursor:'pointer' }}>中止</button></div></div>)}
        {showCoForm && <CoFormModal coFormData={coFormData} setCoFormData={setCoFormData} handleSaveCompany={handleSaveCompany} setShowCoForm={setShowCoForm} colors={colors} btnBase={btnBase} copy={copy} grayCBtn={grayCBtn} />}
        {showTrForm && <TrFormModal trFormData={trFormData} setTrFormData={setTrFormData} handleSaveTrainee={handleSaveTrainee} setShowTrForm={setShowTrForm} colors={colors} btnBase={btnBase} isEditingTr={isEditingTr} companies={companies} editingPhaseIdx={editingPhaseIdx} />}
      </main>
    );
  }

  // 詳細画面
  if (view === 'detail' && currentCo) {
    const currentTrainee = currentCo.trainees?.find((t: any) => t.id === selectedTrId);
    return (
      <main style={{ backgroundColor: '#FBFBFB', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <nav style={{ padding: '20px 30px', backgroundColor: '#FFF', borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            <button onClick={() => { setView('list'); setSelectedTrId(null); }} style={{ background: 'none', border: 'none', color: colors.gray, cursor: 'pointer', fontWeight: '800' }}>← 戻る</button>
            <div onClick={() => setSelectedTrId(null)} style={{ fontSize: '20px', fontWeight: '800', cursor: 'pointer' }}>{currentCo.companyName}</div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            {!selectedTrId ? (
              <><button onClick={() => { setIsEditingCo(true); setCoFormData(currentCo); setShowCoForm(true); }} style={{ ...btnBase, backgroundColor: colors.accent, color: '#fff' }}>編集</button><button onClick={handleDeleteCompany} style={{ ...btnBase, border: `1px solid ${colors.danger}`, color: colors.danger }}>削除</button></>
            ) : (
              <><button onClick={() => { setTrFormData(activeTab === 'current' ? currentTrainee : currentTrainee.phaseHistory[activeTab as number]); setIsEditingTr(true); setEditingPhaseIdx(activeTab === 'current' ? null : (activeTab as number)); setShowTrForm(true); }} style={{ ...btnBase, backgroundColor: colors.accent, color: '#fff' }}>区分変更・編集</button><button onClick={handleDeleteTrainee} style={{ ...btnBase, border: `1px solid ${colors.danger}`, color: colors.danger }}>削除</button><button onClick={() => setSelectedTrId(null)} style={btnBase}>閉じる</button></>
            )}
          </div>
        </nav>
        <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', flex: 1, backgroundColor: colors.border, gap: '1px' }}>
          <aside style={{ backgroundColor: '#FFF', padding: '30px', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '13px', color: colors.gray, marginBottom: '20px', fontWeight:'800' }}>会社情報</h3>
            {Object.keys(labelMapCo).map(k => k !== 'memo' && (
              <div key={k} style={{ marginBottom: '15px' }}>
                <span style={{ fontSize: '11px', color: colors.gray, display: 'block' }}>{labelMapCo[k]}</span>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <div style={{ fontWeight: '800', fontSize: '14px' }}>{currentCo[k] || '-'}</div>
                  {/* コピーボタン復元 */}
                  <button onClick={() => copy(currentCo[k])} style={grayCBtn}>C</button>
                </div>
              </div>
            ))}
            <div style={{ marginTop: '20px', borderTop: `1px solid #f0f0f0`, paddingTop: '20px' }}>
              <label style={{ fontSize:'11px', color:colors.gray, fontWeight:'800' }}>会社メモ</label>
              <textarea value={currentCo.memo || ''} onChange={async (e) => { const m = e.target.value; setCurrentCo({...currentCo, memo: m}); await updateDoc(doc(db, "companies", currentCo.id), {memo: m}); }} style={{ width:'100%', height:'150px', padding:'10px', fontSize:'12px', border:`1px solid ${colors.border}`, borderRadius:'6px' }} />
            </div>
            <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: `1px solid #f0f0f0` }}>
              <h4 style={{ fontSize: '13px', marginBottom: '10px', fontWeight:'800' }}>✅ 完了したTODO</h4>
              {(currentCo.completedTodos || []).map((t:any, i:number) => (
                <div key={i} style={{ fontSize:'11px', padding:'8px', background:'#fcfcfc', border:`1px solid ${colors.border}`, borderRadius:'4px', marginBottom:'5px', position:'relative' }}>
                  <div><b style={{fontWeight:'800'}}>{t.task}</b><br />完了: {t.completedAt}</div>
                  <div style={{ position:'absolute', top:'5px', right:'5px', display:'flex', gap:'5px' }}>
                    <button onClick={() => handleUndoTodo(t)} style={{ background:'#E3F2FD', border:'1px solid #2196F3', color:'#2196F3', fontSize:'9px', padding:'2px 4px', borderRadius:'2px', cursor:'pointer' }}>戻す</button>
                    {/* 完了TODO削除ボタン復元 */}
                    <button onClick={() => handleDeleteCompletedTodo(t.completedId)} style={{ background:'none', border:'none', color:colors.danger, fontSize:'10px', cursor:'pointer' }}>×</button>
                  </div>
                </div>
              ))}
            </div>
          </aside>
          <section style={{ padding: '40px', overflowY: 'auto' }}>
            {!selectedTrId ? (
              <div style={{ background: '#fff', padding: '30px', borderRadius: sharpRadius, boxShadow: shadow }}>
                <h3 style={{ fontSize:'14px', color:colors.gray, fontWeight:'800', marginBottom: '20px' }}>実習生一覧</h3>
                {categoryOptions.map(cat => {
                  const list = (currentCo.trainees || []).filter((t: any) => t.category === cat);
                  if (list.length === 0) return null;
                  return (
                    <div key={cat} style={{ marginBottom: '30px' }}>
                      <div style={{ fontSize: '12px', fontWeight: '800', color: colors.accent, marginBottom: '12px' }}>{cat}</div>
                      <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                        {list.map((t: any) => (
                          <button key={t.id} onClick={() => { setSelectedTrId(t.id); setActiveTab('current'); }} style={{ padding: '15px 25px', borderRadius: '8px', border: hasAlert(t) ? `2px solid ${colors.danger}` : `1px solid ${colors.border}`, background: batchColorMap[t.batch] || '#fff', fontWeight: '800' }}>{t.traineeName} {hasAlert(t) && "⚠️"}</button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ background: '#fff', padding: '35px', borderRadius: sharpRadius, boxShadow: shadow }}>
                <h3 style={{ fontSize: '24px', marginBottom: '25px', fontWeight:'800' }}>{currentTrainee.traineeName}</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 40px' }}>
                  {Object.keys(labelMapTr).map(k => k !== 'memo' && (
                    <div key={k} style={{ borderBottom: '1px solid #f0f0f0', padding: '12px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: colors.gray, fontSize: '13px' }}>{labelMapTr[k]}</span>
                      <div style={{ display:'flex', alignItems:'center' }}>
                        <span style={{ fontWeight: '800' }}>{currentTrainee[k] || '-'}</span>
                        {/* コピーボタン復元 */}
                        <button onClick={() => copy(currentTrainee[k])} style={grayCBtn}>C</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    );
  }
  return null;
}