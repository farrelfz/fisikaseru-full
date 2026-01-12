import React, { useEffect, useState } from 'react';

const pages = [
  { id: 'home', label: 'Home' },
  { id: 'hub', label: 'Lab Hub' },
  { id: 'detail', label: 'Experiment Detail' },
  { id: 'dashboard', label: 'Dashboard' },
];

const Button = ({ active, ...props }) => (
  <button
    type="button"
    className={`nav-button ${active ? 'active' : ''}`}
    {...props}
  />
);

export default function App() {
  const [page, setPage] = useState('home');
  const [user, setUser] = useState(null);
  const [history, setHistory] = useState([]);
  const labsUrl = import.meta.env.VITE_LABS_URL || 'http://localhost:5174';

  const refreshUser = async () => {
    const response = await fetch('/api/me', { credentials: 'include' });
    const data = await response.json();
    setUser(data.user);
  };

  const loadHistory = async () => {
    const response = await fetch('/api/history', { credentials: 'include' });
    if (!response.ok) {
      setHistory([]);
      return;
    }
    const data = await response.json();
    setHistory(data.items);
  };

  useEffect(() => {
    refreshUser();
  }, []);

  useEffect(() => {
    if (page === 'dashboard') {
      loadHistory();
    }
  }, [page]);

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1>FisikaSeru Platform</h1>
          <p>Ruang eksperimen berbasis data & refleksi ilmiah.</p>
        </div>
        <div className="auth-buttons">
          {user ? (
            <span className="badge">Halo, {user.name}</span>
          ) : (
            <>
              <a className="button" href="/auth/google">Login Google</a>
              <a className="button secondary" href="/auth/github">Login GitHub</a>
            </>
          )}
        </div>
      </header>
      <nav className="nav">
        {pages.map((item) => (
          <Button key={item.id} active={page === item.id} onClick={() => setPage(item.id)}>
            {item.label}
          </Button>
        ))}
      </nav>
      <main className="content">
        {page === 'home' && (
          <section className="card">
            <h2>Visi</h2>
            <p>FisikaSeru membangun keterampilan ilmiah: model, data, dan refleksi.</p>
            <ul>
              <li>Latih cara berpikir ilmiah.</li>
              <li>Gunakan data untuk memvalidasi model.</li>
              <li>Bahas keterbatasan dan error eksperimen.</li>
            </ul>
          </section>
        )}
        {page === 'hub' && (
          <section className="card">
            <h2>Lab Hub</h2>
            <p>Modul tersedia:</p>
            <ul>
              <li>Milikan Oil Drop (Modern)</li>
              <li>Projectile (Classical) — Segera Hadir</li>
              <li>SHM (Classical) — Segera Hadir</li>
            </ul>
          </section>
        )}
        {page === 'detail' && (
          <section className="card">
            <h2>Milikan Oil Drop</h2>
            <p>Jalankan simulasi melalui iframe mandiri.</p>
            <iframe title="milikan" src={`${labsUrl}/labs/simulations/modern/milikan/index.html`} className="lab-frame" />
          </section>
        )}
        {page === 'dashboard' && (
          <section className="card">
            <h2>History</h2>
            {history.length === 0 ? (
              <p>Belum ada data tersimpan atau Anda belum login.</p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Simulasi</th>
                    <th>Ringkasan</th>
                    <th>Tanggal</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((item) => (
                    <tr key={item.createdAt}>
                      <td>{item.simKey}</td>
                      <td>{item.summary}</td>
                      <td>{new Date(item.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
