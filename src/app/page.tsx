export default function Home() {
  // 企業（実習実施者）のデータ項目（25項目）
  const companyColumns = [
    "会社名", "ステータス", "決算時期", "代表者職氏名", "職種（小分類）", "郵便番号", "住所", "TEL", 
    "組合加入年月日", "常勤職員数", "技能実習生受け入れの有無", "出資口数", "出資金額", 
    "出資金払込年月日", "法人番号", "労働保険番号（14桁）", "雇用保険適応事業所番号（11桁）", 
    "実習実施者番号", "実習実施者届出受理日", "技能実習産業分類", "事業所住所", 
    "技能実習責任者名", "技能実習指導員名", "生活指導員名", "技能実習計画指導員名"
  ];

  // 実習生のデータ項目（27項目）
  const traineeColumns = [
    "実習生氏名", "ステータス", "フリガナ", "住所", "区分", "国籍", "生年月日", "年齢", "性別", 
    "期間", "在留期限", "在留カード番号", "パスポート期限", "パスポート番号",
    "認定番号", "申請日", "認定年月日", "実習開始日(入国日)", "更新手続開始日",
    "配属日", "実習終了日", "配属移動日", "帰国日", "外国人雇用条件届出日",
    "講習開始日", "講習終了日"
  ];

  return (
    <main style={{ padding: '30px', fontFamily: 'sans-serif', backgroundColor: '#f0f2f5', minHeight: '100vh' }}>
      <h1 style={{ fontSize: '24px', marginBottom: '20px', color: '#1a73e8' }}>監理団体 統合管理システム</h1>

      {/* --- 実習実施者（企業）セクション --- */}
      <section style={{ marginBottom: '40px', backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <h2 style={{ fontSize: '18px', borderLeft: '4px solid #1a73e8', paddingLeft: '10px', marginBottom: '15px' }}>実習実施者（企業）一覧</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: 'max-content', borderCollapse: 'collapse', minWidth: '100%' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                {companyColumns.map((col) => (
                  <th key={col} style={{ padding: '12px', textAlign: 'left', fontSize: '13px', whiteSpace: 'nowrap', borderRight: '1px solid #eee' }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: '12px', fontSize: '14px', fontWeight: 'bold', color: '#1a73e8', cursor: 'pointer' }}>〇〇建設株式会社</td>
                <td style={{ padding: '12px', fontSize: '14px' }}>受け入れ中</td>
                {/* 残りの23項目分を空欄で埋める */}
                {Array(23).fill(0).map((_, i) => <td key={i} style={{ padding: '12px', fontSize: '14px', color: '#ccc' }}>-</td>)}
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* --- 実習生（振り分け表示）セクション --- */}
      <section style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <h2 style={{ fontSize: '18px', borderLeft: '4px solid #34a853', paddingLeft: '10px', marginBottom: '15px' }}>所属実習生一覧 (〇〇建設株式会社)</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: 'max-content', borderCollapse: 'collapse', minWidth: '100%' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                {traineeColumns.map((col) => (
                  <th key={col} style={{ padding: '12px', textAlign: 'left', fontSize: '13px', whiteSpace: 'nowrap', borderRight: '1px solid #eee' }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: '12px', fontSize: '14px' }}>サンプル 太郎</td>
                <td style={{ padding: '12px', fontSize: '14px' }}><span style={{ backgroundColor: '#e6f4ea', color: '#1e8e3e', padding: '2px 8px', borderRadius: '4px' }}>実習中</span></td>
                {/* 残りの25項目分を空欄で埋める */}
                {Array(25).fill(0).map((_, i) => <td key={i} style={{ padding: '12px', fontSize: '14px', color: '#ccc' }}>-</td>)}
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}