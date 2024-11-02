"use client";
import { useEffect, useState } from "react";

export default function Home() {
  const [pyodide, setPyodide] = useState(null);
  const [loadingError, setLoadingError] = useState(null);
  const [code, setCode] = useState(""); // 用於保存Python代碼
  const [input, setInput] = useState(""); // 用於多行輸入
  const [output, setOutput] = useState(""); // 用於顯示執行結果

  useEffect(() => {
    const loadPyodideLibrary = async () => {
      try {
        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/pyodide/v0.26.3/full/pyodide.js";
        script.async = true;

        script.onload = async () => {
          setTimeout(async () => {
            if (typeof window.loadPyodide === "function") {
              try {
                const pyodideInstance = await window.loadPyodide({
                  indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.3/full/",
                });
                setPyodide(pyodideInstance);
              } catch (err) {
                console.error("Failed to initialize Pyodide:", err);
                setLoadingError("Failed to initialize Pyodide.");
              }
            } else {
              console.error("loadPyodide function not found on window.");
              setLoadingError("loadPyodide function not found.");
            }
          }, 500); // 延遲 500 毫秒
        };

        script.onerror = () => {
          console.error("Failed to load Pyodide script.");
          setLoadingError("Failed to load Pyodide script.");
        };

        document.body.appendChild(script);
      } catch (err) {
        console.error("Error loading Pyodide library:", err);
        setLoadingError("Error loading Pyodide library.");
      }
    };

    loadPyodideLibrary();

    return () => {
      document.body
        .querySelectorAll("script[src*='pyodide']")
        .forEach((script) => {
          document.body.removeChild(script);
        });
    };
  }, []);

  const handleRunCode = async () => {
    if (!pyodide) {
      setOutput("Pyodide is still loading...");
      return;
    }

    // 將多行輸入轉換為模擬的標準輸入
    const inputLines = input.split("\n");
    const inputScript = `import sys\nfrom io import StringIO\nsys.stdin = StringIO("${inputLines.join(
      "\\n"
    )}")\n`;

    try {
      // 捕獲Python執行時的標準輸出
      pyodide.globals.set("captured_output", "");
      const captureOutput = `import sys\nfrom io import StringIO\nsys.stdout = StringIO()\n`;

      // 執行Python代碼，並將多行輸入模擬為標準輸入
      await pyodide.runPythonAsync(captureOutput + inputScript + code);

      // 獲取執行結果
      const result = pyodide.runPython("sys.stdout.getvalue()");
      setOutput(result); // 更新output狀態
    } catch (err) {
      setOutput("Error: " + err.message);
    }
  };

  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <h1>Python Execution with Pyodide in Next.js</h1>
      {pyodide ? (
        <>
          <h2>Python Code</h2>
          <textarea
            rows="10"
            cols="30"
            placeholder="Enter your Python code here"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            style={{
              width: "100%",
              padding: "10px",
              marginBottom: "10px",
              backgroundColor: "#1e1e1e",
              color: "#dcdcdc",
            }}
          />

          <h2>Inputs</h2>
          <textarea
            rows="10"
            cols="30"
            placeholder="Enter each input on a new line"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            style={{
              width: "100%",
              padding: "10px",
              marginBottom: "10px",
              backgroundColor: "#1e1e1e",
              color: "#dcdcdc",
            }}
          />

          <button
            onClick={handleRunCode}
            style={{
              padding: "10px 20px",
              backgroundColor: "#0070f3",
              color: "#ffffff",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
              marginTop: "10px",
            }}
          >
            Run
          </button>

          <h2>Output</h2>
          <pre
            style={{
              whiteSpace: "pre-wrap",
              wordWrap: "break-word",
              backgroundColor: "#f0f0f0",
              color: "#333",
              padding: "10px",
              marginTop: "10px",
              borderRadius: "5px",
            }}
          >
            {output}
          </pre>
        </>
      ) : loadingError ? (
        <p style={{ color: "red" }}>{loadingError}</p>
      ) : (
        <p>Loading Pyodide...</p>
      )}
    </div>
  );
}
