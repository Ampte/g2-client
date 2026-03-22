import { useEffect, useRef, useState } from "react";

const PAGE_SIZE = 20;

const SECTION_CONFIG = {
  users: {
    title: "Users",
    shortTitle: "Users",
    description: "Review accounts, update usernames or emails, and control active access.",
    importExportNote: "Import users with username, email, password, is_active, and is_admin columns.",
    columns: ["ID", "Username", "Email", "Status", "Admin Access", "Actions"],
    allowCreate: false,
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
    importExportNote: "Import uses english_word and garo_word columns, with optional notes and is_active. Duplicate word pairs are allowed.",
    columns: ["ID", "English", "Garo", "Notes", "Status", "Actions"],
    allowCreate: true,
    empty: { english_word: "", garo_word: "", notes: "", is_active: true },
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
    importExportNote: "Import and export learning data with only title, topic, and explanation columns.",
    columns: ["ID", "Title", "Topic", "Explanation", "Order", "Status", "Actions"],
    allowCreate: true,
    empty: { title: "", topic: "", explanation: "", sort_order: 0, is_active: true },
    fields: [
      { key: "title", label: "Title", type: "text" },
      { key: "topic", label: "Topic", type: "text" },
      { key: "explanation", label: "Explanation", type: "textarea" },
      { key: "sort_order", label: "Order", type: "number" },
      { key: "is_active", label: "Status", type: "checkbox", trueLabel: "Active", falseLabel: "Inactive" }
    ]
  },
  g2: {
    title: "G2 Knowledge",
    shortTitle: "Chatbot",
    description: "Update the question and answer pairs used by G2.",
    importExportNote: "Import G2 data with question, answer, and optional is_active columns.",
    columns: ["ID", "Question", "Answer", "Status", "Actions"],
    allowCreate: true,
    empty: { question: "", answer: "", is_active: true },
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
  const [transferBusySection, setTransferBusySection] = useState("");
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
  const [sectionPages, setSectionPages] = useState({
    users: 1,
    dictionary: 1,
    lessons: 1,
    g2: 1
  });
  const [createForms, setCreateForms] = useState({
    dictionary: clone(SECTION_CONFIG.dictionary.empty),
    lessons: clone(SECTION_CONFIG.lessons.empty),
    g2: clone(SECTION_CONFIG.g2.empty)
  });
  const dictionaryFileInputRef = useRef(null);

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

  const syncSectionDashboard = (section, items) => {
    setDashboard((prev) => ({
      ...prev,
      [section]: items,
      stats: {
        ...prev.stats,
        total_users: section === "users" ? items.length : prev.stats.total_users,
        total_dictionary_words: section === "dictionary" ? items.length : prev.stats.total_dictionary_words,
        total_learning_topics: section === "lessons" ? items.length : prev.stats.total_learning_topics,
        total_chatbot_questions: section === "g2" ? items.length : prev.stats.total_chatbot_questions
      }
    }));
    setSectionPages((prev) => ({ ...prev, [section]: 1 }));
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
    g2: dashboard.g2
  };

  const sectionCounts = {
    users: dashboard.stats.total_users,
    dictionary: dashboard.stats.total_dictionary_words,
    lessons: dashboard.stats.total_learning_topics,
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

      setDashboard((prev) => ({
        ...prev,
        [section]: prev[section].map((item) => (item.id === id ? data.item : item))
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

      setDashboard((prev) => {
        const nextItems = prev[section].filter((item) => item.id !== id);
        return {
          ...prev,
          [section]: nextItems,
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
        };
      });
      setSectionPages((prev) => {
        const nextTotalPages = Math.max(1, Math.ceil((sectionDataMap[section].length - 1) / PAGE_SIZE));
        return {
          ...prev,
          [section]: Math.min(prev[section] || 1, nextTotalPages)
        };
      });
      cancelEditing(section, id);
      setFeedback({ type: "success", message: `${SECTION_CONFIG[section].title} item deleted.` });
    } catch {
      setFeedback({ type: "error", message: "Could not delete item." });
    } finally {
      setBusySection("");
    }
  };

  const updateCreateField = (section, key, value) => {
    setCreateForms((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }));
  };

  const createRecord = async (section) => {
    const form = createForms[section];
    if (!form) return;

    setBusySection(section);
    setFeedback({ type: "", message: "" });
    try {
      const { response, data } = await fetchJson(`${apiBase}/admin/${section}/`, {
        method: "POST",
        body: JSON.stringify(form)
      });
      if (!response.ok) {
        setFeedback({ type: "error", message: data.error || "Could not create item." });
        return;
      }

      setDashboard((prev) => ({
        ...prev,
        [section]: [data.item, ...prev[section]],
        stats: {
          ...prev.stats,
          total_dictionary_words:
            section === "dictionary" ? prev.stats.total_dictionary_words + 1 : prev.stats.total_dictionary_words,
          total_learning_topics:
            section === "lessons" ? prev.stats.total_learning_topics + 1 : prev.stats.total_learning_topics,
          total_chatbot_questions:
            section === "g2" ? prev.stats.total_chatbot_questions + 1 : prev.stats.total_chatbot_questions
        }
      }));
      setSectionPages((prev) => ({ ...prev, [section]: 1 }));
      setCreateForms((prev) => ({
        ...prev,
        [section]: clone(SECTION_CONFIG[section].empty)
      }));
      setFeedback({ type: "success", message: `${SECTION_CONFIG[section].title} item created.` });
    } catch {
      setFeedback({ type: "error", message: "Could not create item." });
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

  const changeSectionPage = (section, nextPage) => {
    setSectionPages((prev) => ({ ...prev, [section]: nextPage }));
  };

  const handleImportClick = () => {
    dictionaryFileInputRef.current?.click();
  };

  const handleSectionFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !activeSection) return;

    setTransferBusySection(activeSection);
    setFeedback({ type: "", message: "" });
    try {
      const csv = await file.text();
      const { response, data } = await fetchJson(`${apiBase}/admin/${activeSection}/import/`, {
        method: "POST",
        body: JSON.stringify({ csv })
      });

      if (!response.ok) {
        setFeedback({ type: "error", message: data.error || "Could not import dictionary CSV." });
        return;
      }

      syncSectionDashboard(activeSection, data.items || []);
      setFeedback({
        type: "success",
        message: `${SECTION_CONFIG[activeSection].title} import finished. Added ${data.inserted} rows and skipped ${data.skipped}.`
      });
    } catch {
      setFeedback({ type: "error", message: "Could not import CSV." });
    } finally {
      event.target.value = "";
      setTransferBusySection("");
    }
  };

  const handleSectionExport = async () => {
    if (!activeSection) return;
    setTransferBusySection(activeSection);
    setFeedback({ type: "", message: "" });
    try {
      const response = await fetch(`${apiBase}/admin/${activeSection}/export/`, {
        credentials: "include"
      });

      if (!response.ok) {
        let message = "Could not export dictionary CSV.";
        try {
          const data = await response.json();
          message = data.error || message;
        } catch {
          // Keep fallback message for non-JSON responses.
        }
        setFeedback({ type: "error", message });
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const contentDisposition = response.headers.get("Content-Disposition") || "";
      const matchedName = contentDisposition.match(/filename="?([^"]+)"?/i);
      const fileName = matchedName?.[1] || "dictionary-export.csv";
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setFeedback({ type: "success", message: `${SECTION_CONFIG[activeSection].title} CSV exported.` });
    } catch {
      setFeedback({ type: "error", message: "Could not export CSV." });
    } finally {
      setTransferBusySection("");
    }
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
          {(() => {
            const allItems = [...sectionDataMap[activeSection]].sort(
              (first, second) => Number(second.id || 0) - Number(first.id || 0)
            );
            const totalPages = Math.max(1, Math.ceil(allItems.length / PAGE_SIZE));
            const currentPage = Math.min(sectionPages[activeSection] || 1, totalPages);
            const pageStart = (currentPage - 1) * PAGE_SIZE;
            const pageItems = allItems.slice(pageStart, pageStart + PAGE_SIZE);

            return (
              <>
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
            <span className="admin-count">
              {allItems.length} items · Page {currentPage} of {totalPages}
            </span>
          </div>

          {SECTION_CONFIG[activeSection].importExportNote ? (
            <div className="admin-tools-bar">
              <input
                ref={dictionaryFileInputRef}
                className="admin-file-input"
                type="file"
                accept=".csv,text/csv"
                onChange={handleSectionFileChange}
              />
              <button
                className="card-link"
                type="button"
                disabled={transferBusySection === activeSection}
                onClick={handleImportClick}
              >
                {transferBusySection === activeSection ? "Working..." : "Import CSV"}
              </button>
              <button
                className="admin-secondary-btn"
                type="button"
                disabled={transferBusySection === activeSection}
                onClick={handleSectionExport}
              >
                {transferBusySection === activeSection ? "Working..." : "Export CSV"}
              </button>
              <p className="admin-tools-note">
                {SECTION_CONFIG[activeSection].importExportNote}
              </p>
            </div>
          ) : null}

          {SECTION_CONFIG[activeSection].allowCreate ? (
            <div className="admin-create-form">
              {SECTION_CONFIG[activeSection].fields.map((field) => {
                const value = createForms[activeSection][field.key];

                if (field.type === "checkbox") {
                  return (
                    <label key={field.key} className="admin-checkbox">
                      <input
                        type="checkbox"
                        checked={Boolean(value)}
                        onChange={(event) => updateCreateField(activeSection, field.key, event.target.checked)}
                      />
                      <span>{field.label}</span>
                    </label>
                  );
                }

                if (field.type === "textarea") {
                  return (
                    <label key={field.key} className="admin-field admin-field-wide">
                      <span>{field.label}</span>
                      <textarea
                        value={String(value ?? "")}
                        onChange={(event) => updateCreateField(activeSection, field.key, event.target.value)}
                      />
                    </label>
                  );
                }

                return (
                  <label key={field.key} className="admin-field">
                    <span>{field.label}</span>
                    <input
                      type={field.type}
                      value={String(value ?? "")}
                      onChange={(event) =>
                        updateCreateField(
                          activeSection,
                          field.key,
                          field.type === "number"
                            ? Number.parseInt(event.target.value || "0", 10) || 0
                            : event.target.value
                        )
                      }
                    />
                  </label>
                );
              })}

              <button
                className="card-link"
                type="button"
                disabled={busySection === activeSection}
                onClick={() => createRecord(activeSection)}
              >
                Add New
              </button>
            </div>
          ) : (
            <p className="admin-empty">Create new users from the app sign-up flow.</p>
          )}

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
                {pageItems.map((record) => {
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

          <div className="admin-pagination">
            <button
              className="admin-secondary-btn"
              type="button"
              disabled={currentPage <= 1}
              onClick={() => changeSectionPage(activeSection, currentPage - 1)}
            >
              Previous
            </button>
            <span className="admin-pagination-info">
              Showing {pageItems.length === 0 ? 0 : pageStart + 1}-
              {pageStart + pageItems.length} of {allItems.length}
            </span>
            <button
              className="card-link admin-table-btn"
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => changeSectionPage(activeSection, currentPage + 1)}
            >
              Next
            </button>
          </div>
              </>
            );
          })()}
        </section>
      ) : null}
    </section>
  );
}

export default AdminPage;
