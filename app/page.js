"use client";
import { useEffect, useState } from "react";

export default function Home() {
  const [pyodide, setPyodide] = useState(null);
  const [loadingError, setLoadingError] = useState(null);
  const [code, setCode] = useState(""); // 用於保存Python代碼
  const [input, setInput] = useState(""); // 用於多行輸入
  const [output, setOutput] = useState(""); // 用於顯示執行結果
  const [testResult, setTestResult] = useState(null); // 測試結果顯示
  const [testCases, setTestCases] = useState([]); // 存儲所有測試案例
  const [selectedTestId, setSelectedTestId] = useState(0); // 選擇的測試案例 id

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

    // 加載測試數據
    const loadTestCases = async () => {
      try {
        const response = await fetch("/test_cases.json");
        const data = await response.json();
        setTestCases(data);
      } catch (err) {
        console.error("Failed to load test cases:", err);
        setTestResult("Failed to load test cases.");
      }
    };

    loadTestCases();

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

    const inputLines = input.split("\n");
    const inputScript = `import sys\nfrom io import StringIO\nsys.stdin = StringIO("${inputLines.join(
      "\\n"
    )}")\n`;

    try {
      const captureOutput = `import sys\nfrom io import StringIO\nsys.stdout = StringIO()\n`;
      await pyodide.runPythonAsync(captureOutput + inputScript + code);
      const result = pyodide.runPython("sys.stdout.getvalue()");
      setOutput(result);
    } catch (err) {
      setOutput("Error: " + err.message);
    }
  };

  const handleTestCode = async () => {
    if (!pyodide) {
      setOutput("Pyodide is still loading...");
      return;
    }

    const selectedTestCase = testCases.find(
      (testCase) => testCase.id === selectedTestId
    );
    if (!selectedTestCase) {
      setTestResult("未找到指定的測試案例");
      return;
    }

    let allPassed = true;
    for (let i = 0; i < selectedTestCase.inputs.length; i++) {
      const inputString = selectedTestCase.inputs[i];
      const expectedOutput = selectedTestCase.expectedOutputs[i];

      const inputScript = `import sys\nfrom io import StringIO\nsys.stdin = StringIO("${inputString}")\n`;

      try {
        const captureOutput = `import sys\nfrom io import StringIO\nsys.stdout = StringIO()\n`;
        await pyodide.runPythonAsync(captureOutput + inputScript + code);
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

          <h2>Select Test Case</h2>
          <select
            value={selectedTestId}
            onChange={(e) => setSelectedTestId(Number(e.target.value))}
            style={{
              padding: "10px",
              marginBottom: "10px",
            }}
            className="text-white"
          >
            {testCases.map((testCase) => (
              <option key={testCase.id} value={testCase.id}>
                Test Case {testCase.id}
              </option>
            ))}
          </select>

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
