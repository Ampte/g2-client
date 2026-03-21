import { useEffect, useMemo, useRef, useState } from "react";
import AdminPage from "./AdminPage";

const ENV_API_BASE = String(import.meta.env.VITE_API_BASE_URL || "").trim();
const DEFAULT_DEV_API_BASE = `http://${window.location.hostname || "localhost"}:8000/api`;
const DEFAULT_PROD_API_BASE = `${window.location.origin.replace(/\/$/, "")}/api`;
const API_BASE = ENV_API_BASE || (import.meta.env.PROD ? DEFAULT_PROD_API_BASE : DEFAULT_DEV_API_BASE);
const PRODUCTION_CONFIG_WARNING = import.meta.env.PROD && !ENV_API_BASE
  ? `VITE_API_BASE_URL is not set. Falling back to ${DEFAULT_PROD_API_BASE}.`
  : "";

const DEFAULT_HOME_ADS = [
  {
    image_url: "/nokpante.jpg",
    description: "Nokpante, a traditional house of Garo Boys."
  }
];

const DEFAULT_LEARNING_TOPICS = [
  {
    title: "Basic Greetings",
    page: "basic-greetings",
    description: "Learn everyday greetings and polite expressions for common situations."
  },
  {
    title: "Simple Vocabulary",
    page: "simple-vocabulary",
    description: "Build essential Garo word knowledge for daily use."
  },
  {
    title: "Daily Conversation",
    page: "daily-conversation",
    description: "Practice practical sentence patterns used in normal communication."
  },
  {
    title: "Garo Traditions and Practices",
    page: "garo-tradition-practices",
    description: "Explore cultural customs, values, and traditional ways of life."
  }
];

const VALID_PAGES = new Set([
  "home",
  "translator",
  "learning",
  "g2",
  "admin",
  ...DEFAULT_LEARNING_TOPICS.map((topic) => topic.page)
]);

const getPageFromHash = () => {
  const hash = window.location.hash.replace("#", "").trim().toLowerCase();
  return VALID_PAGES.has(hash) ? hash : "home";
};

function App() {
  const [authChecking, setAuthChecking] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [authMode, setAuthMode] = useState("login");
  const [authForm, setAuthForm] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: ""
  });
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(getPageFromHash);
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [sidebarAccountMenuOpen, setSidebarAccountMenuOpen] = useState(false);
  const [configWarning] = useState(PRODUCTION_CONFIG_WARNING);
  const [text, setText] = useState("");
  const [source, setSource] = useState("en");
  const [target, setTarget] = useState("garo");
  const [translatedText, setTranslatedText] = useState("");
  const [status, setStatus] = useState({ type: "", message: "" });
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [learningTopics, setLearningTopics] = useState(DEFAULT_LEARNING_TOPICS);
  const [homeAds, setHomeAds] = useState(DEFAULT_HOME_ADS);
  const [activeHomeAdIndex, setActiveHomeAdIndex] = useState(0);
  const chatStreamRef = useRef(null);
  const accountMenuRef = useRef(null);
  const sidebarAccountMenuRef = useRef(null);
  const canTranslate = useMemo(() => text.trim().length > 0, [text]);
  const currentLearningPage = learningTopics.find((topic) => topic.page === currentPage) || null;
  const isLearningSection = currentPage === "learning" || Boolean(currentLearningPage);
  const currentHomeAd = homeAds[activeHomeAdIndex] || DEFAULT_HOME_ADS[0];

  useEffect(() => {
    let cancelled = false;
    const checkAuth = async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/me/`, {
          credentials: "include"
        });
        const data = await res.json();
        if (!cancelled) setCurrentUser(data.user || null);
      } catch {
        if (!cancelled) setCurrentUser(null);
      } finally {
        if (!cancelled) setAuthChecking(false);
      }
    };
    checkAuth();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onHashChange = () => setCurrentPage(getPageFromHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    const closeOnOutsideClick = (event) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target)) {
        setAccountMenuOpen(false);
      }
      if (sidebarAccountMenuRef.current && !sidebarAccountMenuRef.current.contains(event.target)) {
        setSidebarAccountMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  useEffect(() => {
    if (currentPage !== "g2" || !chatStreamRef.current) return;
    chatStreamRef.current.scrollTop = chatStreamRef.current.scrollHeight;
  }, [chatMessages, currentPage]);

  useEffect(() => {
    if (!currentUser) return;
    let cancelled = false;

    const loadLearningTopics = async () => {
      try {
        const res = await fetch(`${API_BASE}/lessons/`, { credentials: "include" });
        const data = await res.json();
        if (!res.ok || cancelled) return;

        const topics = (data.lessons || []).map((lesson) => ({
          title: String(lesson.title || "").trim(),
          page: String(lesson.title || "")
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, ""),
          description:
            String(lesson.content?.[0]?.english || lesson.explanation || "").trim() ||
            "Start learning this topic."
        }));

        if (!cancelled && topics.length > 0) {
          setLearningTopics(topics);
        }
      } catch {
        // Keep local fallback topics.
      }
    };

    const loadHomeAds = async () => {
      try {
        const res = await fetch(`${API_BASE}/home-ads/`, { credentials: "include" });
        const data = await res.json();
        if (!res.ok || cancelled) return;

        const ads = (data.ads || [])
          .map((ad) => ({
            image_url: String(ad.image_url || "").trim() || "/nokpante.jpg",
            description: String(ad.description || "").trim()
          }))
          .filter((ad) => ad.image_url);

        if (!cancelled && ads.length > 0) {
          setHomeAds(ads);
          setActiveHomeAdIndex(0);
        }
      } catch {
        // Keep fallback image.
      }
    };

    loadLearningTopics();
    loadHomeAds();
    return () => {
      cancelled = true;
    };
  }, [currentUser]);

  useEffect(() => {
    if (homeAds.length <= 1) return undefined;
    const timer = window.setInterval(() => {
      setActiveHomeAdIndex((prev) => (prev + 1) % homeAds.length);
    }, 10000);
    return () => window.clearInterval(timer);
  }, [homeAds]);

  const navigateTo = (page) => {
    window.location.hash = page;
    setCurrentPage(page);
    setMenuOpen(false);
    setAccountMenuOpen(false);
    setSidebarAccountMenuOpen(false);
  };

  const handleTranslate = async () => {
    if (!canTranslate) return;
    setTranslatedText("");
    setStatus({ type: "", message: "" });

    try {
      const res = await fetch(`${API_BASE}/translate/`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, source, target })
      });
      const data = await res.json();
      if (!res.ok) {
        setTranslatedText("");
        setStatus({ type: "error", message: data.error || "Translation failed." });
        return;
      }
      setTranslatedText(data.translated_text || "");
      setStatus({ type: "", message: "" });
    } catch {
      setTranslatedText("");
      setStatus({ type: "error", message: "Backend unreachable. Start the backend server." });
    }
  };

  const sendChatMessage = async () => {
    const trimmed = chatInput.trim();
    if (!trimmed) return;

    const nextMessages = [...chatMessages, { id: Date.now(), role: "user", text: trimmed }];
    setChatMessages(nextMessages);
    setChatInput("");

    let assistantText = "Start with greetings, everyday words, and short practice phrases.";
    try {
      const res = await fetch(`${API_BASE}/g2/ask/`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed })
      });
      const data = await res.json();
      if (res.ok) assistantText = data.answer || assistantText;
    } catch {
      if (/greeting/i.test(trimmed)) assistantText = "Try: 'Na'a simang?' for a friendly hello.";
      if (/translate/i.test(trimmed)) assistantText = "Use the Translator page for word-by-word output.";
    }

    setChatMessages((prev) => [...prev, { id: Date.now() + 1, role: "assistant", text: assistantText }]);
  };

  const handleChatKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendChatMessage();
    }
  };

  const logout = () => {
    fetch(`${API_BASE}/auth/logout/`, {
      method: "POST",
      credentials: "include"
    }).catch(() => undefined);
    setCurrentUser(null);
    setAccountMenuOpen(false);
    setSidebarAccountMenuOpen(false);
    setChatMessages([]);
  };

  const onAuthFieldChange = (field, value) => {
    setAuthForm((prev) => ({ ...prev, [field]: value }));
  };

  const switchAuthMode = (mode) => {
    setAuthMode(mode);
    setAuthError("");
    setShowPassword(false);
    setAuthForm({
      username: "",
      email: "",
      password: "",
      confirmPassword: ""
    });
  };

  const handleAuthSubmit = async (event) => {
    event.preventDefault();
    if (authLoading) return;

    const username = authForm.username.trim();
    const email = authForm.email.trim();
    const password = authForm.password;
    const confirmPassword = authForm.confirmPassword;

    if (!username || !password || (authMode === "register" && !email)) {
      setAuthError("Please fill all required fields.");
      return;
    }
    if (authMode === "register" && password !== confirmPassword) {
      setAuthError("Password and confirm password must match.");
      return;
    }

    setAuthError("");
    setAuthLoading(true);
    try {
      const endpoint = authMode === "login" ? "login" : "register";
      const payload = authMode === "login" ? { username, password } : { username, email, password };
      const res = await fetch(`${API_BASE}/auth/${endpoint}/`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || "Authentication failed.");
        return;
      }
      setCurrentUser(data.user || null);
      setStatus({ type: "", message: "" });
      setChatMessages([]);
    } catch {
      setAuthError("Could not connect to server.");
    } finally {
      setAuthLoading(false);
    }
  };

  if (authChecking) {
    return (
      <main className="app-shell auth-shell">
        <section className="panel auth-panel">
          <h2>Checking your session...</h2>
          <p className="auth-subtitle">Please wait.</p>
        </section>
      </main>
    );
  }

  if (!currentUser) {
    return (
      <main className="app-shell auth-shell">
        <section className="panel auth-panel">
          <h2>{authMode === "login" ? "Log in to Garo2" : "Create your account"}</h2>
          <p className="auth-subtitle">
            {authMode === "login"
              ? "Use your account to access Translator, Learning, and G2."
              : "Sign up with a username, email, and password."}
          </p>

          <form className="auth-form" onSubmit={handleAuthSubmit}>
            <div className="auth-field">
              <label htmlFor="auth-username">Username</label>
              <input
                id="auth-username"
                type="text"
                value={authForm.username}
                onChange={(e) => onAuthFieldChange("username", e.target.value)}
                required
              />
            </div>

            {authMode === "register" ? (
              <div className="auth-field">
                <label htmlFor="auth-email">Email</label>
                <input
                  id="auth-email"
                  type="email"
                  value={authForm.email}
                  onChange={(e) => onAuthFieldChange("email", e.target.value)}
                  required
                />
              </div>
            ) : null}

            <div className="auth-field">
              <label htmlFor="auth-password">Password</label>
              <input
                id="auth-password"
                type={showPassword ? "text" : "password"}
                value={authForm.password}
                onChange={(e) => onAuthFieldChange("password", e.target.value)}
                required
              />
            </div>

            {authMode === "register" ? (
              <div className="auth-field">
                <label htmlFor="auth-confirm-password">Confirm Password</label>
                <input
                  id="auth-confirm-password"
                  type="password"
                  value={authForm.confirmPassword}
                  onChange={(e) => onAuthFieldChange("confirmPassword", e.target.value)}
                  required
                />
              </div>
            ) : null}

            <button type="button" className="card-link auth-switch-btn" onClick={() => setShowPassword((prev) => !prev)}>
              {showPassword ? "Hide Password" : "Show Password"}
            </button>

            {authError ? <div className="status error">{authError}</div> : null}

            <button className="translate-btn" type="submit" disabled={authLoading}>
              {authLoading
                ? authMode === "login"
                  ? "Logging in..."
                  : "Creating account..."
                : authMode === "login"
                  ? "Log In"
                  : "Create Account"}
            </button>
          </form>

          <p className="auth-switch">
            {authMode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
            <button type="button" className="card-link auth-switch-btn" onClick={() => switchAuthMode(authMode === "login" ? "register" : "login")}>
              {authMode === "login" ? "Create Account" : "Log In"}
            </button>
          </p>
        </section>
      </main>
    );
  }

  return (
    <div>
      <header className="site-nav">
        <div className="app-shell nav-inner">
          <div className="brand-row">
            <button className="brand-link" onClick={() => navigateTo("home")}>
              <img src="/logo.jpeg" alt="Garo2 logo" className="logo" />
              <span>Garo2</span>
            </button>
          </div>

          <button className="menu-toggle" onClick={() => setMenuOpen((prev) => !prev)} aria-label="Open menu">
            <span />
            <span />
            <span />
          </button>

          <nav className="nav-links">
            <button className={currentPage === "home" ? "active" : ""} onClick={() => navigateTo("home")}>Home</button>
            <button className={currentPage === "translator" ? "active" : ""} onClick={() => navigateTo("translator")}>Translator</button>
            <button className={isLearningSection ? "active" : ""} onClick={() => navigateTo("learning")}>Learning</button>
            <button className={currentPage === "g2" ? "active" : ""} onClick={() => navigateTo("g2")}>G2</button>
            {currentUser.isAdmin ? (
              <button className={currentPage === "admin" ? "active" : ""} onClick={() => navigateTo("admin")}>Admin</button>
            ) : null}
            <div className="account-menu-wrap" ref={accountMenuRef}>
              <button className="nav-username-btn" onClick={() => setAccountMenuOpen((prev) => !prev)}>
                {currentUser.username}
              </button>
              {accountMenuOpen ? (
                <div className="account-popup">
                  <p>Signed in as {currentUser.username}</p>
                  <button onClick={logout}>Logout</button>
                </div>
              ) : null}
            </div>
          </nav>
        </div>
      </header>

      <div className={`sidebar-backdrop ${menuOpen ? "open" : ""}`} onClick={() => setMenuOpen(false)} />

      <aside className={`mobile-sidebar ${menuOpen ? "open" : ""}`}>
        <div className="mobile-sidebar-header">
          <div ref={sidebarAccountMenuRef}>
            <h2>Garo2</h2>
            <button className="nav-username-btn" onClick={() => setSidebarAccountMenuOpen((prev) => !prev)}>
              {currentUser.username}
            </button>
            {sidebarAccountMenuOpen ? (
              <div className="account-popup sidebar-account-popup">
                <p>Signed in as {currentUser.username}</p>
                <button onClick={logout}>Logout</button>
              </div>
            ) : null}
          </div>
          <button className="admin-secondary-btn" onClick={() => setMenuOpen(false)}>Close</button>
        </div>

        <nav className="mobile-sidebar-links">
          <button className={currentPage === "home" ? "active" : ""} onClick={() => navigateTo("home")}>Home</button>
          <button className={currentPage === "translator" ? "active" : ""} onClick={() => navigateTo("translator")}>Translator</button>
          <button className={isLearningSection ? "active" : ""} onClick={() => navigateTo("learning")}>Learning</button>
          <button className={currentPage === "g2" ? "active" : ""} onClick={() => navigateTo("g2")}>G2</button>
          {currentUser.isAdmin ? (
            <button className={currentPage === "admin" ? "active" : ""} onClick={() => navigateTo("admin")}>Admin</button>
          ) : null}
        </nav>
      </aside>

      <main className={`app-shell page-wrap ${currentPage === "home" ? "home-page-wrap" : ""} ${currentPage === "admin" ? "admin-page-wrap" : ""}`}>
        {configWarning ? <div className="status warning">{configWarning}</div> : null}
        {currentPage === "home" ? (
          <section className="panel hero home-hero-fullscreen">
            <div className="home-hero-grid">
              <div className="home-hero-copy">
                <h1>Translate and Learn Garo Language</h1>
                <p>Translate and learn Garo with simple tools designed for everyday practice on mobile and desktop.</p>
                <section className="home-ad-section" aria-label="Home image">
                  <div className="home-ad-image-frame">
                    <img src={currentHomeAd.image_url} alt={currentHomeAd.description || "Garo2 home ad"} className="home-ad-image" />
                    {currentHomeAd.description ? (
                      <div className="home-ad-caption">
                        <p>{currentHomeAd.description}</p>
                      </div>
                    ) : null}
                  </div>
                </section>
                <div className="home-cards">
                  <article className="home-card">
                    <h2>Translator</h2>
                    <p>Convert everyday words and phrases between English and Garo in a few taps.</p>
                    <button className="card-link" onClick={() => navigateTo("translator")}>Go to Translator</button>
                  </article>
                  <article className="home-card">
                    <h2>Learning</h2>
                    <p>Browse lessons to build your Garo vocabulary step by step.</p>
                    <button className="card-link" onClick={() => navigateTo("learning")}>Go to Learning</button>
                  </article>
                  <article className="home-card spotlight-card">
                    <h2>G2</h2>
                    <p>Chat with a guided assistant for greetings, beginner prompts, and practice.</p>
                    <button className="card-link" onClick={() => navigateTo("g2")}>Open G2</button>
                  </article>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {currentPage === "translator" ? (
          <section className="panel">
            <h2>Translator</h2>
            <p>Translate between English and Garo.</p>
            <div className="row">
              <label htmlFor="source">From</label>
              <select id="source" value={source} onChange={(e) => setSource(e.target.value)}>
                <option value="en">English</option>
                <option value="garo">Garo</option>
              </select>
              <button className="swap" onClick={() => { setSource(target); setTarget(source); setTranslatedText(""); }}>Swap</button>
              <label htmlFor="target">To</label>
              <select id="target" value={target} onChange={(e) => setTarget(e.target.value)}>
                <option value="garo">Garo</option>
                <option value="en">English</option>
              </select>
            </div>
            <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a word like 'house' or 'nok'" />
            <button className="translate-btn" onClick={handleTranslate} disabled={!canTranslate}>Translate</button>
            {translatedText || status.message ? (
              <div className="result">
                <h3>Translation</h3>
                <p className={status.message ? `status ${status.type}` : ""}>
                  {translatedText || status.message}
                </p>
              </div>
            ) : null}
          </section>
        ) : null}

        {currentPage === "learning" ? (
          <section className="panel">
            <h2>Learning</h2>
            <p>Choose a topic to start your Garo learning journey.</p>
            <div className="learning-topic-grid">
              {learningTopics.map((topic) => (
                <article key={topic.page} className="learning-topic-card">
                  <h3>{topic.title}</h3>
                  <button className="card-link" onClick={() => navigateTo(topic.page)}>Start Learning</button>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {currentLearningPage ? (
          <section className="panel">
            <h2>{currentLearningPage.title}</h2>
            <div className="learning-topic-grid">
              <article className="learning-topic-card">
                <h3>{currentLearningPage.title}</h3>
                <p>{currentLearningPage.description}</p>
              </article>
            </div>
            <button className="card-link" onClick={() => navigateTo("learning")}>Back to Learning</button>
          </section>
        ) : null}

        {currentPage === "g2" ? (
          <section className="chatgpt-shell">
            <div className="chatgpt-main">
              <div className="chatgpt-topbar">
                <div>
                  <h2>G2</h2>
                  <p>Ask anything about basic Garo practice and translation help.</p>
                </div>
                <button className="new-chat-btn" onClick={() => setChatMessages([])}>New chat</button>
              </div>
              <div className="chat-console">
                <div ref={chatStreamRef} className="chat-stream">
                  {chatMessages.length === 0 ? (
                    <div className="chat-empty-state">
                      <h3>How can I help?</h3>
                      <div className="prompt-grid">
                        {[
                          "Teach me a Garo greeting",
                          "Give me a practice quiz",
                          "How do I start learning Garo?",
                          "Translate a simple phrase"
                        ].map((suggestion) => (
                          <button key={suggestion} className="prompt-card" onClick={() => setChatInput(suggestion)}>
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {chatMessages.map((message) => (
                    <div key={message.id} className={`chat-row ${message.role === "user" ? "user" : "assistant"}`}>
                      <div className="chat-message">
                        <span className="chat-role">{message.role === "user" ? "You" : "G2"}</span>
                        <p>{message.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="chat-composer-wrap">
                  <div className="chat-composer">
                    <textarea
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={handleChatKeyDown}
                      placeholder="Message G2"
                    />
                    <div className="composer-actions">
                      <button className="send-btn" onClick={sendChatMessage} disabled={!chatInput.trim()}>Send</button>
                    </div>
                  </div>
                  <p className="composer-note">G2 can make mistakes. Use Translator for direct word-by-word output.</p>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {currentPage === "admin" ? <AdminPage currentUser={currentUser} /> : null}
      </main>

      <footer className="site-footer">
        <div className="app-shell footer-inner">
          <div>
            <p className="footer-brand">Garo2</p>
            <p className="footer-copy">Learn, practice, and explore Garo with simple digital tools.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
