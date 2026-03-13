export default function Home() {
  return (
    <main style={{ padding: '50px', fontFamily: 'sans-serif' }}>
      <h1 style={{ fontSize: '24px', marginBottom: '20px' }}>実習生管理名簿</h1>
      
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #000', backgroundColor: '#f4f4f4' }}>
            <th style={{ textAlign: 'left', padding: '12px' }}>名前</th>
            <th style={{ textAlign: 'left', padding: '12px' }}>国籍</th>
            <th style={{ textAlign: 'left', padding: '12px' }}>入国日</th>
            <th style={{ textAlign: 'left', padding: '12px' }}>配属先企業</th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ borderBottom: '1px solid #eee' }}>
            <td style={{ padding: '12px' }}>サンプル 太郎</td>
            <td style={{ padding: '12px' }}>ベトナム</td>
            <td style={{ padding: '12px' }}>2026/03/13</td>
            <td style={{ padding: '12px' }}>〇〇建設株式会社</td>
          </tr>
        </tbody>
      </table>
    </main>
  );
}