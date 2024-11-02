"use client";
import { useEffect, useState, useRef } from "react";
import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Home() {
  const { setTheme } = useTheme();
  const [pyodide, setPyodide] = useState(null);
  const [loadingError, setLoadingError] = useState(null);
  const [code, setCode] = useState(""); // 初始Python代碼
  const [input, setInput] = useState(""); // 初始輸入資料
  const [output, setOutput] = useState(""); // 用於顯示執行結果
  const [testResult, setTestResult] = useState(null); // 測試結果顯示
  const [testCases, setTestCases] = useState([]); // 存儲所有測試案例
  const [selectedTestId, setSelectedTestId] = useState(0); // 選擇的測試案例 id
  const textAreaRef = useRef(null); // 程式區域參考
  const inputAreaRef = useRef(null); // 輸入區域參考
  const lineNumberRef = useRef(null); // 參考行數區域
  const outputRef = useRef(null); // 輸出區域參考

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
              setLoadingError("Load Pyodide function not found.");
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

    // 使用正則表達式檢查是否有 "while True"
    const infiniteLoopPattern = /while\s+True/g;

    if (infiniteLoopPattern.test(code)) {
      setOutput("禁用無窮迴圈");
      return; // 如果包含無窮迴圈，則不執行
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

  const updateEditor = (e) => {
    setCode(e.target.value);
    syncHeights();
  };

  const syncHeights = () => {
    if (textAreaRef.current && lineNumberRef.current) {
      // 取得程式碼區域的最大高度，並將行數區域的高度設置為相同
      const maxHeight = Math.max(textAreaRef.current.scrollHeight, 240); // 保持最小高度
      textAreaRef.current.style.height = `${maxHeight}px`;
      lineNumberRef.current.style.height = `${maxHeight}px`; // 同步行數區域高度
    }

    // 更新輸入區域的高度
    if (inputAreaRef.current) {
      const inputHeight = Math.max(inputAreaRef.current.scrollHeight, 240); // 保持最小高度
      inputAreaRef.current.style.height = `${inputHeight}px`;
    }

    // 同步輸出區域的高度
    if (outputRef.current) {
      const outputHeight = Math.max(outputRef.current.scrollHeight, 240); // 保持最小高度
      outputRef.current.style.height = `${outputHeight}px`;
    }
  };

  // 在元件初次載入時，立即同步高度
  useEffect(() => {
    syncHeights();
  }, []);

  return (
    <main>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon">
            <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setTheme("light")}>
            Light
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme("dark")}>
            Dark
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme("system")}>
            System
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <pre className="p-5 font-sans max-w-5xl mx-auto">
        <h1 className="text-2xl mb-4">Python</h1>
        <div className="text-gray-800 bg-gray-100 dark:bg-gray-700 dark:text-gray-100 pr-4 pl-4 pt-3 pb-3 rounded break-words whitespace-normal max-w-full">
          期中考結束了，老師想要幫大家算平均分數。
          這次期中考有國語、英文、數學、社會、自然五科。
          老師將會先輸入同學的名字後一次輸入五科的成績，請根據輸出範例幫老師撰寫平均分數計算機。
        </div>
        <hr className="border-t border-gray-300 my-4" />

        {pyodide ? (
          <>
            <div className="flex flex-col w-full gap-5">
              {/* 程式區 */}
              <div className="w-full">
                <h2 className="text-lg mb-2">Code</h2>
                <div className="flex h-auto">
                  {/* 行數顯示 */}
                  <pre
                    ref={lineNumberRef}
                    className="bg-gray-200 dark:bg-gray-700 text-gray-500 p-2 text-right select-none overflow-hidden h-60"
                    style={{
                      fontFamily: "monospace",
                      lineHeight: "1.5em",
                      width: "30px",
                    }}
                  >
                    {Array.from(
                      { length: Math.max(code.split("\n").length || 1, 1) },
                      (_, i) => i + 1
                    ).join("\n")}
                  </pre>
                  <textarea
                    ref={textAreaRef}
                    placeholder="Enter your Python code here"
                    value={code}
                    onChange={updateEditor}
                    className="w-full border-none outline-none resize-none bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white p-2 h-auto "
                    style={{
                      fontFamily: "monospace",
                      lineHeight: "1.5em",
                    }}
                  />
                </div>
              </div>

              {/* 輸入和輸出區域 */}
              <div className="flex gap-5">
                {/* 輸入區 */}
                <div className="flex-1 w-7/12 relative">
                  <h2 className="text-lg mb-2">Inputs</h2>
                  <textarea
                    ref={inputAreaRef}
                    rows="10"
                    placeholder="Enter each input on a new line"
                    value={input}
                    onChange={(e) => {
                      setInput(e.target.value);
                      syncHeights(); // 在輸入變更時同步高度
                    }}
                    className="w-full bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white p-2 resize-none h-58"
                  />
                  <button
                    onClick={handleRunCode}
                    className="absolute bottom-1.5 right-0 px-4 py-2 bg-blue-500 text-white rounded"
                    style={{
                      borderBottomRightRadius: "0", // 右上角不做圓角
                      borderTopRightRadius: "0", // 左上角不做圓角
                      borderBottomLeftRadius: "0", // 左下角不做圓角
                    }}
                  >
                    Run
                  </button>
                </div>

                {/* 輸出區 */}
                <div className="flex-1 w-5/12">
                  <h2 className="text-lg mb-2">Output</h2>
                  <pre
                    ref={outputRef}
                    className="whitespace-pre-wrap bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 p-3 mt-2 rounded"
                    style={{
                      minHeight: "240px", // 保持最小高度
                      maxHeight: "none", // 讓它隨內容高度自動擴展
                    }}
                  >
                    {output}
                  </pre>
                </div>
              </div>
            </div>

            {testResult && (
              <div
                className={`p-3 mt-2 rounded text-white ${
                  testResult === "測試通過" ? "bg-green-500" : "bg-red-500"
                }`}
              >
                {testResult}
              </div>
            )}
          </>
        ) : loadingError ? (
          <p className="text-red-500">{loadingError}</p>
        ) : (
          <p>Loading Pyodide...</p>
        )}
      </pre>
    </main>
  );
}
