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
                      onClick={() => onSelect(page)}
                      className="block py-1 hover:bg-blue-500 hover:text-white rounded"
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
  const [topics, setTopics] = useState([]);
  const [pyodide, setPyodide] = useState(null);
  const [loadingError, setLoadingError] = useState(null);
  const [code, setCode] = useState("");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [testResults, setTestResults] = useState([]); // 儲存所有測試結果
  const [testResult, setTestResult] = useState(""); // 確保這裡有定義初始值
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const textAreaRef = useRef(null);
  const inputAreaRef = useRef(null);
  const lineNumberRef = useRef(null);
  const outputRef = useRef(null);

  const handleSelectQuestion = async (page) => {
    try {
      const questionData = await fetch(`/questions.json`);
      if (!questionData.ok) {
        throw new Error(`HTTP error! status: ${questionData.status}`);
      }
      const questionJson = await questionData.json();
      const selected = questionJson.flatMap(topic => topic.pages).find((q) => q.id === page.id);

      if (selected) {
        setSelectedQuestion(selected);
        console.log(`Selected question:`, selected);
        setTestResults(new Array(selected.examples.length).fill("")); // 初始化測試結果
      } else {
        console.warn(`No question found with id: ${page.id}`);
        setSelectedQuestion(null);
      }
    } catch (error) {
      console.error("Error fetching question data:", error);
      setSelectedQuestion(null);
    }
  };

  useEffect(() => {
    const loadTopics = async () => {
      try {
        const response = await fetch("/pages.json");
        const data = await response.json();
        if (Array.isArray(data)) {
          setTopics(data);
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
              } catch (err) {
                console.error("Failed to initialize Pyodide:", err);
                setLoadingError("Failed to initialize Pyodide.");
              }
            } else {
              console.error("loadPyodide function not found on window.");
              setLoadingError("Load Pyodide function not found.");
            }
          }, 500);
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
  }, []);

  const handleRunCode = async () => {
    if (!pyodide) {
      setOutput("Pyodide is still loading...");
      return ""; // 確保返回空字串
    }
  
    const infiniteLoopPattern = /while\s+True/g;
  
    if (infiniteLoopPattern.test(code)) {
      setOutput("禁用無窮迴圈");
      return ""; // 確保返回空字串
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
      return result; // 確保返回結果
    } catch (err) {
      const errorMessage = err.message.trim(); // 去除多餘的空白
      setOutput(errorMessage); // 更新輸出為錯誤信息
      return ""; // 確保返回空字串
    }
  };
  
  
  

  const handleTestCode = async (example, index) => {
    const inputString = example.input.join("\n"); // 將輸入轉換為字符串
    setInput(inputString); // 設置輸入
  
    const result = await handleRunCode(); // 等待結果返回
  
    if (result) { // 確保 result 不是空
      const isCorrect = result.trim() === example.output.trim(); // 比較結果
  
      // 更新測試結果
      setTestResults((prevResults) => {
        const newResults = [...prevResults];
        newResults[index] = {
          result,
          outputClass: isCorrect ? "bg-green-200" : "bg-red-200",
        };
        return newResults;
      });
    } else {
      console.error("No result returned from handleRunCode");
    }
  };
  
  
  

  const handleRunAllTests = async () => {
    const results = [];
    let allPassed = true;
    let failedTests = [];

    for (const [index, example] of selectedQuestion.examples.entries()) {
      const result = await handleRunCode(example.input); // 執行每個範例
      const isCorrect = result.trim() === example.output.trim();

      results.push(result); // 紀錄結果

      if (!isCorrect) {
        allPassed = false;
        failedTests.push(`Test#${index + 1}`);
      }
    }

    setTestResults(results.map((result, index) => ({
      result,
      outputClass: selectedQuestion.examples[index].output.trim() === result.trim() ? "bg-green-200" : "bg-red-200",
    })));

    // 顯示測試結果
    if (allPassed) {
      setTestResult("測試通過");
    } else {
      setTestResult(`未通過：${failedTests.join(", ")}`);
    }
  };

  return (
    <div className="flex h-screen">
      <Sidebar 
        topics={topics} 
        onSelect={(page) => handleSelectQuestion(page)} 
        className="text-gray-800 bg-gray-200 dark:bg-gray-700 dark:text-gray-100 w-72 h-full overflow-y-auto" 
      />

      <main className="flex-1 p-5 h-full overflow-y-auto">
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
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full border-none outline-none resize-none bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white p-2 h-auto"
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
                    onChange={(e) => setInput(e.target.value)}
                    className="w-full bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white p-2 resize-none h-58"
                  />
                  <div className="mt-4">
                    <Button onClick={handleRunCode} className="mr-2">Run</Button>
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

            {selectedQuestion && (
              <div className="mt-4">
                <h2 className="text-lg mb-2 font-bold">Examples</h2>
                <table className="min-w-full border border-gray-300 rounded-lg overflow-hidden">
                  <thead className="bg-gray-200">
                    <tr>
                      <th className="border border-gray-300 p-2 text-left">Button</th>
                      <th className="border border-gray-300 p-2 text-left">Input</th>
                      <th className="border border-gray-300 p-2 text-left">Correct answer</th>
                      <th className="border border-gray-300 p-2 text-left">Your output</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedQuestion.examples.map((example, index) => {
                      const outputClass = testResults[index]?.outputClass || ""; // 獲取對應的背景顏色
                      return (
                        <tr key={index} className="hover:bg-gray-100">
                          <td className="border border-gray-300 p-2 text-center w-1/4">
                            <Button
                              onClick={() => {
                                handleTestCode(example, index); // 執行測試
                              }}
                              className="text-blue-500 hover:underline"
                            >
                              Run test #{index + 1}
                            </Button>
                          </td>
                          <td className="border border-gray-300 p-2">
                            <pre>{Array.isArray(example.input) ? example.input.join(", ") : example.input}</pre>
                          </td>
                          <td className="border border-gray-300 p-2">
                            <pre>{example.output}</pre>
                          </td>
                          <td className={`border border-gray-300 p-2 ${outputClass}`}>
                            <pre>{testResults[index]?.result || ""}</pre>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <div className="mt-4">
                  <Button onClick={handleRunAllTests} className="mr-2">Test All</Button>
                </div>
              </div>
            )}

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
