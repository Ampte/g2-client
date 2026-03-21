import { useEffect, useState } from "react";

const SECTION_CONFIG = {
  users: {
    title: "Users",
    shortTitle: "Users",
    description: "Review accounts, update usernames or emails, and control active access.",
    columns: ["ID", "Username", "Email", "Status", "Admin Access", "Actions"],
    countKey: "total_users",
    fields: [
      { key: "username", label: "Username", type: "text" },
      { key: "email", label: "Email", type: "text" },
      { key: "is_active", label: "Status", type: "checkbox", trueLabel: "Active", falseLabel: "Inactive" },
      { key: "is_admin", label: "Admin Access", type: "checkbox", trueLabel: "Admin", falseLabel: "Standard" }
    ]
  },
  dictionary: {
    title: "Dictionary",
    shortTitle: "Dictionary",
    description: "Manage English to Garo word pairs used by the translator.",
    columns: ["ID", "English", "Garo", "Notes", "Status", "Actions"],
    countKey: "total_dictionary_words",
    fields: [
      { key: "english_word", label: "English", type: "text" },
      { key: "garo_word", label: "Garo", type: "text" },
      { key: "notes", label: "Notes", type: "textarea" },
      { key: "is_active", label: "Status", type: "checkbox", trueLabel: "Active", falseLabel: "Inactive" }
    ]
  },
  lessons: {
    title: "Learning",
    shortTitle: "Learning",
    description: "Edit the topics and summaries shown in the learning section.",
    columns: ["ID", "Title", "Topic", "Explanation", "Order", "Status", "Actions"],
    countKey: "total_learning_topics",
    fields: [
      { key: "title", label: "Title", type: "text" },
      { key: "topic", label: "Topic", type: "text" },
      { key: "explanation", label: "Explanation", type: "textarea" },
      { key: "sort_order", label: "Order", type: "number" },
      { key: "is_active", label: "Status", type: "checkbox", trueLabel: "Active", falseLabel: "Inactive" }
    ]
  },
  "home-ads": {
    title: "Home Ads",
    shortTitle: "Home Ads",
    description: "Manage rotating homepage images and captions.",
    columns: ["ID", "Image URL", "Description", "Order", "Status", "Actions"],
    countKey: "ads",
    fields: [
      { key: "image_url", label: "Image URL", type: "text" },
      { key: "description", label: "Description", type: "textarea" },
      { key: "sort_order", label: "Order", type: "number" },
      { key: "is_active", label: "Status", type: "checkbox", trueLabel: "Active", falseLabel: "Inactive" }
    ]
  },
  g2: {
    title: "G2 Knowledge",
    shortTitle: "Chatbot",
    description: "Update the question and answer pairs used by G2.",
    columns: ["ID", "Question", "Answer", "Status", "Actions"],
    countKey: "total_chatbot_questions",
    fields: [
      { key: "question", label: "Question", type: "textarea" },
      { key: "answer", label: "Answer", type: "textarea" },
      { key: "is_active", label: "Status", type: "checkbox", trueLabel: "Active", falseLabel: "Inactive" }
    ]
  }
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function AdminPage({ currentUser }) {
  const envApiBase = String(import.meta.env.VITE_API_BASE_URL || "").trim();
  const defaultDevApiBase = `http://${window.location.hostname || "localhost"}:8000/api`;
  const defaultProdApiBase = `${window.location.origin.replace(/\/$/, "")}/api`;
  const apiBase = envApiBase || (import.meta.env.PROD ? defaultProdApiBase : defaultDevApiBase);
  const [loading, setLoading] = useState(true);
  const [busySection, setBusySection] = useState("");
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [activeSection, setActiveSection] = useState("");
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
  const [editingRows, setEditingRows] = useState({});

  const fetchJson = async (url, options = {}) => {
    const response = await fetch(url, {
      ...options,
      credentials: "include",
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(options.headers || {})
      }
    });
    const data = await response.json();
    return { response, data };
  };

  useEffect(() => {
    let cancelled = false;

    const loadDashboard = async () => {
      try {
        const { response, data } = await fetchJson(`${apiBase}/admin/dashboard/`);
        if (!cancelled && response.ok) {
          setDashboard(data);
        }
      } catch {
        if (!cancelled) {
          setFeedback({ type: "error", message: "Could not load admin dashboard." });
        }
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

  const sectionDataMap = {
    users: dashboard.users,
    dictionary: dashboard.dictionary,
    lessons: dashboard.lessons,
    "home-ads": dashboard.ads,
    g2: dashboard.g2
  };

  const sectionCounts = {
    users: dashboard.stats.total_users,
    dictionary: dashboard.stats.total_dictionary_words,
    lessons: dashboard.stats.total_learning_topics,
    "home-ads": dashboard.ads.length,
    g2: dashboard.stats.total_chatbot_questions
  };

  const startEditing = (section, record) => {
    setEditingRows((prev) => ({
      ...prev,
      [section]: {
        ...(prev[section] || {}),
        [record.id]: clone(record)
      }
    }));
  };

  const cancelEditing = (section, id) => {
    setEditingRows((prev) => {
      const nextSection = { ...(prev[section] || {}) };
      delete nextSection[id];
      return { ...prev, [section]: nextSection };
    });
  };

  const updateField = (section, id, key, value) => {
    setEditingRows((prev) => ({
      ...prev,
      [section]: {
        ...(prev[section] || {}),
        [id]: {
          ...(prev[section]?.[id] || {}),
          [key]: value
        }
      }
    }));
  };

  const saveRecord = async (section, id) => {
    const row = editingRows[section]?.[id];
    if (!row) return;

    setBusySection(section);
    setFeedback({ type: "", message: "" });
    try {
      const { response, data } = await fetchJson(`${apiBase}/admin/${section}/${id}/`, {
        method: "PUT",
        body: JSON.stringify(row)
      });
      if (!response.ok) {
        setFeedback({ type: "error", message: data.error || "Could not update item." });
        return;
      }

      const dashboardKey = section === "home-ads" ? "ads" : section;
      setDashboard((prev) => ({
        ...prev,
        [dashboardKey]: prev[dashboardKey].map((item) => (item.id === id ? data.item : item))
      }));
      cancelEditing(section, id);
      setFeedback({ type: "success", message: `${SECTION_CONFIG[section].title} item updated.` });
    } catch {
      setFeedback({ type: "error", message: "Could not update item." });
    } finally {
      setBusySection("");
    }
  };

  const deleteRecord = async (section, id) => {
    setBusySection(section);
    setFeedback({ type: "", message: "" });
    try {
      const { response, data } = await fetchJson(`${apiBase}/admin/${section}/${id}/`, {
        method: "DELETE"
      });
      if (!response.ok) {
        setFeedback({ type: "error", message: data.error || "Could not delete item." });
        return;
      }

      const dashboardKey = section === "home-ads" ? "ads" : section;
      setDashboard((prev) => ({
        ...prev,
        [dashboardKey]: prev[dashboardKey].filter((item) => item.id !== id),
        stats: {
          ...prev.stats,
          total_users: section === "users" ? prev.stats.total_users - 1 : prev.stats.total_users,
          total_dictionary_words:
            section === "dictionary" ? prev.stats.total_dictionary_words - 1 : prev.stats.total_dictionary_words,
          total_learning_topics:
            section === "lessons" ? prev.stats.total_learning_topics - 1 : prev.stats.total_learning_topics,
          total_chatbot_questions:
            section === "g2" ? prev.stats.total_chatbot_questions - 1 : prev.stats.total_chatbot_questions
        }
      }));
      cancelEditing(section, id);
      setFeedback({ type: "success", message: `${SECTION_CONFIG[section].title} item deleted.` });
    } catch {
      setFeedback({ type: "error", message: "Could not delete item." });
    } finally {
      setBusySection("");
    }
  };

  const renderValue = (field, value) => {
    if (field.type === "checkbox") {
      return value ? field.trueLabel : field.falseLabel;
    }
    const text = String(value ?? "").trim();
    return text || "-";
  };

  const renderEditor = (section, id, field, value) => {
    if (field.type === "checkbox") {
      return (
        <label className="admin-checkbox">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(event) => updateField(section, id, field.key, event.target.checked)}
          />
          <span>{value ? field.trueLabel : field.falseLabel}</span>
        </label>
      );
    }

    if (field.type === "textarea") {
      return (
        <textarea
          className="admin-table-input admin-table-textarea"
          value={String(value ?? "")}
          onChange={(event) => updateField(section, id, field.key, event.target.value)}
        />
      );
    }

    return (
      <input
        className="admin-table-input"
        type={field.type}
        value={String(value ?? "")}
        onChange={(event) =>
          updateField(
            section,
            id,
            field.key,
            field.type === "number"
              ? Number.parseInt(event.target.value || "0", 10) || 0
              : event.target.value
          )
        }
      />
    );
  };

  return (
    <section className="panel admin-panel">
      {feedback.message ? <div className={`status ${feedback.type}`}>{feedback.message}</div> : null}
      {loading ? <p>Loading admin data...</p> : null}

      {!loading && !activeSection ? (
        <>
          <div className="admin-card-header">
            <div>
              <h2>Admin Dashboard</h2>
              <p>Manage users, dictionary entries, lessons, home ads, and G2 prompts.</p>
            </div>
            <span className="admin-summary-pill">Total Users {dashboard.stats.total_users}</span>
          </div>

          <div className="admin-nav-grid">
            {Object.entries(SECTION_CONFIG).map(([section, config]) => (
              <article key={section} className="admin-nav-card">
                <p className="admin-nav-kicker">Manage data</p>
                <h3>{config.title}</h3>
                <p>{config.description}</p>
                <div className="admin-nav-stats">
                  <span>{sectionCounts[section]} records</span>
                </div>
                <button className="card-link" type="button" onClick={() => setActiveSection(section)}>
                  Open {config.shortTitle}
                </button>
              </article>
            ))}
          </div>
        </>
      ) : null}

      {!loading && activeSection ? (
        <section className="admin-manager-page">
          <div className="admin-manager-topbar">
            <button className="admin-secondary-btn" onClick={() => setActiveSection("")}>
              Back to Dashboard
            </button>
            <span className="admin-summary-pill">{SECTION_CONFIG[activeSection].title}</span>
          </div>

          <div className="admin-card-header">
            <div>
              <h3>{SECTION_CONFIG[activeSection].title}</h3>
              <p>{SECTION_CONFIG[activeSection].description}</p>
            </div>
            <span className="admin-count">{sectionDataMap[activeSection].length} items</span>
          </div>

          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  {SECTION_CONFIG[activeSection].columns.map((column) => (
                    <th key={column}>{column}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sectionDataMap[activeSection].map((record) => {
                  const editingRecord = editingRows[activeSection]?.[record.id];
                  const currentRecord = editingRecord || record;
                  return (
                    <tr key={record.id}>
                      <td>{record.id}</td>
                      {SECTION_CONFIG[activeSection].fields.map((field) => (
                        <td key={field.key}>
                          {editingRecord
                            ? renderEditor(activeSection, record.id, field, currentRecord[field.key])
                            : renderValue(field, currentRecord[field.key])}
                        </td>
                      ))}
                      <td>
                        <div className="admin-table-actions">
                          {!editingRecord ? (
                            <button
                              className="card-link admin-table-btn"
                              type="button"
                              onClick={() => startEditing(activeSection, record)}
                            >
                              Edit
                            </button>
                          ) : (
                            <>
                              <button
                                className="card-link admin-table-btn"
                                type="button"
                                disabled={busySection === activeSection}
                                onClick={() => saveRecord(activeSection, record.id)}
                              >
                                Save
                              </button>
                              <button
                                className="admin-secondary-btn admin-table-btn"
                                type="button"
                                onClick={() => cancelEditing(activeSection, record.id)}
                              >
                                Cancel
                              </button>
                            </>
                          )}
                          <button
                            className="admin-danger-btn admin-table-btn"
                            type="button"
                            disabled={busySection === activeSection}
                            onClick={() => deleteRecord(activeSection, record.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </section>
  );
}

export default AdminPage;
