"use client";
import { useEffect, useState } from "react";

export default function Home() {
  const [pyodide, setPyodide] = useState(null);
  const [loadingError, setLoadingError] = useState(null);
  const [code, setCode] = useState(""); // 用於保存Python代碼
  const [input, setInput] = useState(""); // 用於多行輸入
  const [output, setOutput] = useState(""); // 用於顯示執行結果
  const [testResult, setTestResult] = useState(null); // 測試結果顯示

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

  // 加載測試數據
  const loadTestCases = async () => {
    try {
      const response = await fetch("/test_cases.json");
      const testCases = await response.json();
      return testCases;
    } catch (err) {
      console.error("Failed to load test cases:", err);
      setTestResult("Failed to load test cases.");
      return null;
    }
  };

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

  const handleTestCode = async () => {
    if (!pyodide) {
      setOutput("Pyodide is still loading...");
      return;
    }

    const testCases = await loadTestCases();
    if (!testCases) return;

    let allPassed = true;
    for (const testCase of testCases) {
      for (let i = 0; i < testCase.inputs.length; i++) {
        const inputString = testCase.inputs[i];
        const expectedOutput = testCase.expectedOutputs[i];

        // 使用 input 模擬標準輸入
        const inputScript = `import sys\nfrom io import StringIO\nsys.stdin = StringIO("${inputString}")\n`;

        try {
          // 捕獲Python執行時的標準輸出
          const captureOutput = `import sys\nfrom io import StringIO\nsys.stdout = StringIO()\n`;

          // 執行Python代碼，並模擬當前測試的輸入
          await pyodide.runPythonAsync(captureOutput + inputScript + code);

          // 獲取執行結果
          const result = pyodide.runPython("sys.stdout.getvalue()").trim();

          if (result !== expectedOutput) {
            allPassed = false;
            break;
          }
        } catch (err) {
          console.error("Error during testing:", err);
          setTestResult("測試不通過");
          return;
        }
      }
    }

    setTestResult(allPassed ? "測試通過" : "測試不通過");
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
              marginRight: "10px",
            }}
          >
            Run
          </button>
          <button
            onClick={handleTestCode}
            style={{
              padding: "10px 20px",
              backgroundColor: "#28a745",
              color: "#ffffff",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
            }}
          >
            Test
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

          {testResult && (
            <div
              style={{
                backgroundColor:
                  testResult === "測試通過" ? "#28a745" : "#dc3545",
                color: "#fff",
                padding: "10px",
                marginTop: "10px",
                borderRadius: "5px",
              }}
            >
              {testResult}
            </div>
          )}
        </>
      ) : loadingError ? (
        <p style={{ color: "red" }}>{loadingError}</p>
      ) : (
        <p>Loading Pyodide...</p>
      )}
    </div>
  );
}
