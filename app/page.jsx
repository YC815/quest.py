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

const Sidebar = ({ topics, onSelect, className }) => {
  const [expanded, setExpanded] = useState(null);

  const toggleExpand = (index) => {
    setExpanded(expanded === index ? null : index);
    console.log(`Toggled topic index: ${index}`);
  };

  return (
    <nav className={`${className} w-1/4 p-4 h-screen overflow-y-auto`}>
      <h2 className="text-xl font-bold">索引</h2>
      <ul>
        {topics.map((topic, index) => (
          <li key={index}>
            <button
              onClick={() => toggleExpand(index)}
              className="flex justify-between items-center w-full text-left py-2 px-1 hover:bg-blue-500 hover:text-white rounded focus:outline-none"
            >
              {topic.title}
              <span>{expanded === index ? '−' : '＋'}</span>
            </button>
            {expanded === index && (
              <ul className="ml-4">
                {topic.pages.map((page) => (
                  <li key={page.id}>
                    <button
                      className="block py-1 hover:bg-blue-500 hover:text-white rounded"
                      onClick={() => {
                        console.log(`Selected page: ${page.title} with id: ${page.id}`);
                        onSelect(page); // 將整個 page 對象傳遞
                      }} 
                    >
                      {page.title}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default function Home() {
  const { setTheme } = useTheme();
  const [topics, setTopics] = useState([]); // 用於存儲從 JSON 載入的主題
  const [pyodide, setPyodide] = useState(null);
  const [loadingError, setLoadingError] = useState(null);
  const [code, setCode] = useState(""); // 初始Python代碼
  const [input, setInput] = useState(""); // 初始輸入資料
  const [output, setOutput] = useState(""); // 用於顯示執行結果
  const [testResult, setTestResult] = useState(null); // 測試結果顯示
  const [testCases, setTestCases] = useState([]); // 存儲所有測試案例
  const [selectedQuestion, setSelectedQuestion] = useState(null); // 儲存當前選擇的問題
  const textAreaRef = useRef(null); // 程式區域參考
  const inputAreaRef = useRef(null); // 輸入區域參考
  const lineNumberRef = useRef(null); // 參考行數區域
  const outputRef = useRef(null); // 輸出區域參考

  const handleSelectQuestion = async (page) => {
    console.log(`Selected page: ${page.title} with id: ${page.id}`);
    try {
      const questionData = await fetch(`/questions.json`);
      
      if (!questionData.ok) {
        throw new Error(`HTTP error! status: ${questionData.status}`);
      }
      
      const questionJson = await questionData.json();
      console.log('Fetched questions:', questionJson);
  
      // 檢查 questionJson 的結構，並找到對應的問題
      const selected = questionJson.flatMap(topic => topic.pages).find((q) => q.id === page.id);
      console.log(`Attempting to select question with id: ${page.id}`);
      
      if (selected) {
        console.log(`Selected question:`, selected);
        setSelectedQuestion(selected);
      } else {
        console.warn(`No question found with id: ${page.id}`);
        setSelectedQuestion(null); // 若無找到對應題目則清空選擇
      }
    } catch (error) {
      console.error("Error fetching question data:", error);
      setSelectedQuestion(null);
    }
  };
    
  

  useEffect(() => {
    const loadTopics = async () => {
      try {
        const response = await fetch("/pages.json"); // 從 public 文件夾獲取 JSON
        const data = await response.json();
        console.log('Loaded topics:', data);
        if (Array.isArray(data)) {
          setTopics(data); // 設置主題
        } else {
          throw new Error("Loaded data is not an array");
        }
      } catch (error) {
        console.error("Failed to load topics:", error);
        setLoadingError("Failed to load topics.");
      }
    };

    loadTopics();

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
                console.log("Pyodide loaded successfully.");
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
        const response = await fetch("/questions.json");
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log('Loaded test cases:', data);
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
      console.log("Code output:", result);
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
        console.log(`Testing input: ${inputString}, expected: ${expectedOutput}, got: ${result}`);

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
      const maxHeight = Math.max(textAreaRef.current.scrollHeight, 240);
      textAreaRef.current.style.height = `${maxHeight}px`;
      lineNumberRef.current.style.height = `${maxHeight}px`;
    }

    if (inputAreaRef.current) {
      const inputHeight = Math.max(inputAreaRef.current.scrollHeight, 240);
      inputAreaRef.current.style.height = `${inputHeight}px`;
    }

    if (outputRef.current) {
      const outputHeight = Math.max(outputRef.current.scrollHeight, 240);
      outputRef.current.style.height = `${outputHeight}px`;
    }
  };

  useEffect(() => {
    syncHeights();
  }, []);

  return (
    <div className="flex">
      <Sidebar 
        topics={topics} 
        onSelect={(page) => handleSelectQuestion(page)} // 使用新的選擇處理函數
        className="text-gray-800 bg-gray-200 dark:bg-gray-700 dark:text-gray-100 w-72" 
      />

      <main className="flex-1 p-5">
        <div className="absolute top-5 right-5 z-10">
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
        </div>
        <h1 className="text-2xl mb-4">Python</h1>
        <div className="text-gray-800 bg-gray-100 dark:bg-gray-700 dark:text-gray-100 pr-4 pl-4 pt-3 pb-3 rounded break-words whitespace-normal max-w-full">
          {selectedQuestion ? selectedQuestion.description : "選擇一個問題以顯示描述"}
        </div>
        <hr className="border-t border-gray-300 my-4" />

        {pyodide ? (
          <>
            <div className="flex flex-col w-full gap-5">
              <div className="w-full">
                <h2 className="text-lg mb-2">Code</h2>
                <div className="flex h-auto">
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

              <div className="flex gap-5">
                <div className="flex-1 w-7/12 relative">
                  <h2 className="text-lg mb-2">Inputs</h2>
                  <textarea
                    ref={inputAreaRef}
                    rows="10"
                    placeholder="Enter each input on a new line"
                    value={input}
                    onChange={(e) => {
                      setInput(e.target.value);
                      syncHeights();
                    }}
                    className="w-full bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white p-2 resize-none h-58"
                  />
                  <div className="mt-4">
                    <Button onClick={handleRunCode} className="mr-2">Run</Button>
                    <Button onClick={handleTestCode}>Test</Button>
                  </div>
                </div>

                <div className="flex-1 w-5/12">
                  <h2 className="text-lg mb-2">Output</h2>
                  <pre
                    ref={outputRef}
                    className="whitespace-pre-wrap bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 p-3 mt-2 rounded"
                    style={{
                      minHeight: "240px",
                      maxHeight: "none",
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
      </main>
    </div>
  );
}
