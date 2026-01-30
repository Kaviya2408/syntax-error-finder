import { useState, useEffect } from "react";
import "./App.css";

export default function App() {
  const [code, setCode] = useState("");
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState("light");
  const [language, setLanguage] = useState("java");

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") || "light";
    setTheme(savedTheme);
    document.documentElement.setAttribute("data-theme", savedTheme);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
  };

  async function handleCheck() {
    if (code.trim() === "") {
      setErrors([{ line: 0, msg: "No code detected", desc: "Please paste your source code in the editor box before checking for errors." }]);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      });

      if (response.ok) {
        const data = await response.json();
        setErrors(data.errors);
      } else {
        processCodeLocally();
      }
    } catch (error) {
      console.error('API call failed, using local processing:', error);
      processCodeLocally();
    } finally {
      setLoading(false);
    }
  }

  function processCodeLocally() {
    let result = [];
    let lines = code.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();
      if (line !== '' && !line.endsWith(';') && !line.endsWith('{') && !line.endsWith('}')) {
        result.push({
          line: i + 1,
          msg: 'Missing semicolon',
          desc: 'You forgot to add a semicolon at the end of this statement. Many languages require semicolons to separate instructions.'
        });
      }
    }

    if (result.length === 0) {
      result.push({
        line: 0,
        msg: 'No syntax error found',
        desc: 'Your code passed basic syntax checks.'
      });
    }

    setErrors(result);
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;
      const newCode = code.substring(0, start) + '  ' + code.substring(end);
      setCode(newCode);
      setTimeout(() => {
        e.target.selectionStart = e.target.selectionEnd = start + 2;
      }, 0);
    }
    
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleCheck();
    }
  };

  return (
    <div className="app">
      <nav className="navbar">
        <div className="logo">Code Syntax Error Finder</div>
        <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme">
          <svg className="theme-icon sun" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <svg className="theme-icon moon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        </button>
      </nav>
      <div className="main-container">
        <div className="editor-box">
          <div className="editor-header">
            <h2>Code Editor</h2>
            <select 
              value={language} 
              onChange={(e) => setLanguage(e.target.value)}
              className="language-select"
            >
              <option value="java">Java</option>
              <option value="javascript">JavaScript</option>
              <option value="python">Python</option>
              <option value="c">C</option>
              <option value="cpp">C++</option>
            </select>
          </div>
          <textarea 
            value={code} 
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Paste your ${language.toUpperCase()} code here... (Tab for indent, Ctrl+Enter to check)`}
            className="code-textarea"
            spellCheck="false"
          ></textarea>
          <button 
            onClick={handleCheck} 
            disabled={loading}
            className="check-button"
          >
            {loading ? 'Checking...' : errors.length > 0 && errors[0].line !== 0 ? 'Try Again' : 'Find Errors'}
          </button>
        </div>
        <div className="result-box">
          <h2>Detected Errors</h2>
          <div className="errors-container">
            {errors.length === 0 && <div className="empty-state">No errors detected yet.</div>}
            {errors.map((e, i) => (
              <div key={i} className={`error-card ${e.line === 0 && e.msg.includes('No syntax') ? 'success' : ''}`}>
                <div className="error-header">
                  <span className="error-line">Line {e.line}</span>
                  <span className="error-type">{e.msg}</span>
                </div>
                <div className="error-desc">{e.desc}</div>
                {e.lineContent && <div className="code-snippet">{e.lineContent}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
