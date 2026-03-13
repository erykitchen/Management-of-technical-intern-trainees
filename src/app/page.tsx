"use client";
import { useState } from 'react';

export default function Home() {
  const [showForm, setShowForm] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [selectedTrainee, setSelectedTrainee] = useState<string | null>(null);

  // 企業と実習生の項目定義
  const companyColumns = ["会社名", "ステータス", "決算時期", "代表者職氏名", "職種", "郵便番号", "住所", "TEL", "組合加入日", "職員数", "受入有無", "出資口数", "出資金額", "出資年月日", "法人番号", "労働保険", "雇用保険", "実施者番号", "受理日", "産業分類", "事業所住所", "責任者", "指導員", "生活指導員", "計画指導員"];
  const traineeColumns = ["実習生氏名", "ステータス", "フリガナ", "住所", "区分", "国籍", "生年月日", "年齢", "性別", "期間", "在留期限", "カード番号", "パスポート期限", "番号", "認定番号", "申請日", "認定日", "入国日", "更新開始日", "配属日", "終了日", "移動日", "帰国日", "雇用届出日", "講習開始", "講習終了"];

  // スタイル定義（列固定用）
  const thStyle: React.CSSProperties = { padding: '12px', textAlign: 'left', fontSize: '12px', whiteSpace: 'nowrap', borderRight: '1px solid #eee', backgroundColor: '#f8f9fa', position: 'sticky', top: 0, zIndex: 10 };
  const fixedColumnStyle: React.CSSProperties = { ...thStyle, position: 'sticky', left: 0, zIndex: 20, borderRight: '2px solid #ddd' };
  const tdStyle: React.CSSProperties = { padding: '12px', fontSize: '13px', whiteSpace: 'nowrap', borderRight: '1px solid #eee' };
  const fixedTdStyle: React.CSSProperties = { ...tdStyle, position: 'sticky', left: 0, backgroundColor: '#fff', zIndex: 10, borderRight: '2px solid #ddd', fontWeight: 'bold', color: '#1a73e8', cursor: 'pointer' };

  return (
    <main style={{ padding: '20px', fontFamily: 'sans-serif', backgroundColor: '#f0f2f5', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '22px', color: '#1a73e8' }}>監理団体 業務管理システム</h1>
        <button 
          onClick={() => setShowForm(true)}
          style={{ padding: '10px 20px', backgroundColor: '#1a73e8', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          ＋ 新規企業登録
        </button>
      </div>

      {/* --- 企業一覧セクション --- */}
      <section style={{ marginBottom: '30px', backgroundColor: '#fff', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
        <div style={{ overflowX: 'auto', maxHeight: '400px', border: '1px solid #ddd' }}>
          <table style={{ borderCollapse: 'collapse', width: 'max-content' }}>
            <thead>
              <tr>
                {companyColumns.map((col, i) => (
                  <th key={col} style={i === 0 ? fixedColumnStyle : thStyle}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={fixedTdStyle} onClick={() => setSelectedCompany("〇〇建設株式会社")}>〇〇建設株式会社</td>
                <td style={tdStyle}>受入中</td>
                {Array(23).fill("-").map((v, i) => <td key={i} style={tdStyle}>{v}</td>)}
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* --- 新規登録フォーム（モーダル） --- */}
      {showForm && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 200 }}>
          <div style={{ backgroundColor: '#fff', width: '90%', maxWidth: '500px', padding: '30px', borderRadius: '10px' }}>
            <h3>実習実施者の新規登録</h3>
            <div style={{ marginTop: '20px', maxHeight: '60vh', overflowY: 'auto' }}>
              {/* 代表的な3項目だけ表示（Firebase接続後に全項目増やします） */}
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>会社名</label>
              <input type="text" style={{ width: '100%', padding: '8px', marginBottom: '15px', border: '1px solid #ddd', borderRadius: '4px' }} />
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>住所</label>
              <input type="text" style={{ width: '100%', padding: '8px', marginBottom: '15px', border: '1px solid #ddd', borderRadius: '4px' }} />
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button onClick={() => { alert("保存しました（仮）"); setShowForm(false); }} style={{ flex: 1, padding: '10px', backgroundColor: '#34a853', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>保存する</button>
              <button onClick={() => setShowForm(false)} style={{ flex: 1, padding: '10px', backgroundColor: '#999', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>キャンセル</button>
            </div>
          </div>
        </div>
      )}

      {/* --- 詳細表示モーダル（履歴書風） --- */}
      {(selectedCompany || selectedTrainee) && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 }}>
          <div style={{ backgroundColor: '#fff', width: '90%', maxWidth: '600px', maxHeight: '80vh', overflowY: 'auto', padding: '30px', borderRadius: '10px', position: 'relative' }}>
            <button onClick={() => { setSelectedCompany(null); setSelectedTrainee(null); }} style={{ position: 'absolute', top: '10px', right: '10px', border: 'none', background: 'none', fontSize: '20px', cursor: 'pointer' }}>✕</button>
            <h3 style={{ borderBottom: '2px solid #333', paddingBottom: '10px' }}>{selectedCompany ? "企業詳細情報" : "実習生個票"}</h3>
            <div style={{ marginTop: '20px' }}>
              {(selectedCompany ? companyColumns : traineeColumns).map(col => (
                <div key={col} style={{ display: 'flex', borderBottom: '1px solid #eee', padding: '8px 0' }}>
                  <div style={{ width: '150px', fontWeight: 'bold', color: '#666', fontSize: '13px' }}>{col}</div>
                  <div style={{ flex: 1, fontSize: '14px' }}>-</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}