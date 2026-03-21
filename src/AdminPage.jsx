import { useEffect, useState } from "react";

function AdminPage({ currentUser }) {
  const envApiBase = String(import.meta.env.VITE_API_BASE_URL || "").trim();
  const defaultDevApiBase = `http://${window.location.hostname || "localhost"}:8000/api`;
  const defaultProdApiBase = `${window.location.origin.replace(/\/$/, "")}/api`;
  const apiBase = envApiBase || (import.meta.env.PROD ? defaultProdApiBase : defaultDevApiBase);
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState({
    users: [],
    dictionary: [],
    lessons: [],
    ads: [],
    g2: [],
    stats: {
      total_users: 0,
      total_dictionary_words: 0,
      total_learning_topics: 0,
      total_chatbot_questions: 0
    }
  });

  useEffect(() => {
    let cancelled = false;

    const loadDashboard = async () => {
      try {
        const res = await fetch(`${apiBase}/admin/dashboard/`, {
          credentials: "include"
        });
        const data = await res.json();
        if (!cancelled && res.ok) {
          setDashboard(data);
        }
      } catch {
        // Keep empty fallback state.
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadDashboard();
    return () => {
      cancelled = true;
    };
  }, [apiBase]);

  if (!currentUser?.isAdmin && !currentUser?.is_admin) {
    return (
      <section className="panel">
        <h2>Admin</h2>
        <p>This account does not have admin access.</p>
      </section>
    );
  }

  return (
    <section className="panel admin-panel">
      {loading ? <p>Loading admin data...</p> : null}

      <div className="admin-card-header">
        <div>
          <h2>Admin Dashboard</h2>
          <p>Manage users, dictionary entries, lessons, home ads, and G2 prompts.</p>
        </div>
        <span className="admin-summary-pill">Total Users {dashboard.stats.total_users}</span>
      </div>

      <div className="admin-nav-grid">
        {[
          ["Users", "Review account access and admin privileges.", dashboard.stats.total_users],
          ["Dictionary", "Manage English and Garo word pairs.", dashboard.stats.total_dictionary_words],
          ["Learning", "Edit lesson topics and summaries.", dashboard.stats.total_learning_topics],
          ["Home Ads", "Control homepage visuals and captions.", dashboard.ads.length],
          ["G2 Knowledge", "Update practice prompts and answers.", dashboard.stats.total_chatbot_questions]
        ].map(([title, description, count]) => (
          <article key={title} className="admin-nav-card">
            <p className="admin-nav-kicker">Manage data</p>
            <h3>{title}</h3>
            <p>{description}</p>
            <div className="admin-nav-stats">
              <span>{count} records</span>
            </div>
            <button className="card-link" type="button">Open {title}</button>
          </article>
        ))}
      </div>

      <div className="admin-sections">
        <section className="admin-manager-page">
          <div className="admin-card-header">
            <div>
              <h3>Recent Dictionary Entries</h3>
              <p>A quick look at the translator vocabulary currently available.</p>
            </div>
            <span className="admin-count">{dashboard.dictionary.length} items</span>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>English</th>
                  <th>Garo</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.dictionary.slice(0, 5).map((entry) => (
                  <tr key={entry.id}>
                    <td>{entry.id}</td>
                    <td>{entry.english_word}</td>
                    <td>{entry.garo_word}</td>
                    <td>{entry.notes || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </section>
  );
}

export default AdminPage;
