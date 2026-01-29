import { useState } from "react";
import "./App.css";

export default function App() {
  const [code, setCode] = useState("");
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);

  async function handleCheck() {
    if (code.trim() === "") {
      setErrors([{ line: 0, msg: "No code detected", desc: "Please paste your source code in the editor box before checking for errors." }]);
      return;
    }

    setLoading(true);
    try {
      // Try API endpoint first, fallback to local processing
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
        // Fallback to client-side processing
        processCodeLocally();
      }
    } catch (error) {
      console.error('API call failed, using local processing:', error);
      // Fallback to client-side processing
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
  return (
    <div className="app">
      <nav className="navbar">
        <div className="logo">Cloud Syntax Error Finder</div>
      </nav>
      <div className="main-container">
        <div className="editor-box">
          <h2>Paste Your Code</h2>
          <textarea value={code} onChange={(e) => setCode(e.target.value)} placeholder="Paste your code here..."></textarea>
          <button onClick={handleCheck} disabled={loading}>
            {loading ? 'Checking...' : 'Find Errors'}
          </button>
        </div>
        <div className="result-box">
          <h2>Detected Errors</h2>
          {errors.length == 0 && <p className="empty">No errors detected yet.</p>}
          {errors.map((e, i) => (
            <div key={i} className="error-card">
              <p className="error-title">Line {e.line}: {e.msg}</p>
              <p className="error-desc">{e.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}