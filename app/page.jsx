"use client";
import { useEffect, useState, useRef } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import CodeMirror from '@uiw/react-codemirror';
import { python } from '@codemirror/lang-python';
import React from 'react';
import { EditorState } from '@codemirror/state';
import { barf } from 'thememirror';
import { dracula } from "@uiw/codemirror-theme-dracula";
import { eclipse } from '@uiw/codemirror-theme-eclipse';
import { ClerkProvider, SignInButton, SignedIn, SignedOut, UserButton } from '@clerk/nextjs';
import { dark } from '@clerk/themes'
import { zhTW } from '@clerk/localizations'
import { AppProps } from 'next/app'
const Sidebar = ({ topics, onSelect, onHomeClick, className, selectedPage }) => {
  const [expanded, setExpanded] = useState(null);

  const toggleExpand = (index) => {
    setExpanded(expanded === index ? null : index);
  };

  return (
    <nav className={`${className} w-1/4 p-4 h-screen overflow-y-auto`}>
      <h2 className="text-xl font-bold pb-1">索引</h2>
      <ul>
        <li>
          <button
            onClick={onHomeClick}
            className={`block w-full py-2 px-1 text-left hover:bg-blue-500 hover:text-white  ${selectedPage === null ? 'bg-stone-300 dark:bg-stone-600' : ''
              }`}
          >
            主頁
          </button>
        </li>
        {topics.map((topic, index) => (
          <li key={index}>
            <button
              onClick={() => toggleExpand(index)}
              className={`flex justify-between items-center w-full text-left py-2 px-1 hover:bg-blue-500 hover:text-white  focus:outline-none ${topic.isCompleted ? 'bg-green-200 dark:bg-green-800' : ''
                }`}
            >
              {topic.title}
              <span>{expanded === index ? '−' : '＋'}</span>
            </button>
            {expanded === index && (
              <ul className="">
                {topic.pages.map((page) => (
                  <li key={page.id}>
                    <button
                      onClick={() => onSelect(page)}
                      className={`block py-1 text-left pl-4 hover:bg-blue-500 hover:text-white  w-full ${page.isCompleted
                        ? selectedPage?.id === page.id
                          ? 'bg-green-300 dark:bg-green-900' // 當前題目且已過關，顯示深綠色
                          : 'bg-green-200 dark:bg-green-800' // 已過關但非當前題目，顯示淺綠色
                        : selectedPage?.id === page.id
                          ? 'bg-stone-300 dark:bg-stone-600' // 當前選中的題目但未過關，顯示灰色
                          : '' // 其他情況保持原樣
                        }`}
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
  const { theme, setTheme } = useTheme();
  const [topics, setTopics] = useState([]);
  const [pyodide, setPyodide] = useState(null);
  const [loadingError, setLoadingError] = useState(null);
  const [code, setCode] = useState("");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [testResults, setTestResults] = useState([]);
  const [testResult, setTestResult] = useState(null);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [showHome, setShowHome] = useState(true);
  const textAreaRef = useRef(null);
  const outputRef = useRef(null);
  const lineNumberRef = useRef(null); // 新增行號參考

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
        setShowHome(false);

        // 清空上一關的測試結果和輸出
        setTestResults([]);
        setTestResult(null);
        setOutput("");
      } else {
        console.warn(`No question found with id: ${page.id}`);
        setSelectedQuestion(null);
      }
    } catch (error) {
      console.error("Error fetching question data:", error);
      setSelectedQuestion(null);
    }
  };

  const handleHomeClick = () => {
    setShowHome(true);
    setSelectedQuestion(null);
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

  const handleRunCode = async (inputString) => {
    if (!pyodide) {
      return "Pyodide is still loading...";
    }

    const inputLines = inputString.split("\n").map(line => line.trim()).filter(line => line.length > 0);
    const inputScript = `import sys\nfrom io import StringIO\nsys.stdin = StringIO("${inputLines.join("\\n")}")\n`;

    try {
      const captureOutput = `import sys\nfrom io import StringIO\nsys.stdout = StringIO()\n`;
      await pyodide.runPythonAsync(captureOutput + inputScript + code);
      const result = pyodide.runPython("sys.stdout.getvalue()").trim();
      setOutput(result);
      return result;
    } catch (err) {
      const errorMessage = `Error: ${err.message.trim()}`;
      console.error("Error running code:", err);

      setOutput(errorMessage);
      return errorMessage;
    }
  };
  // theme={theme === "light" ? eclipse : dracula}
  return (
    <ClerkProvider
      appearance={{
        baseTheme: theme === "light" ? eclipse : dark,
        // localization: { zhTW }
      }}>
      <div className="min-h-screen bg-white dark:bg-gray-900">
        <SignedOut>
          <div className="flex items-center justify-center h-screen">
            <SignInButton mode="modal">
              <Button>Sign In</Button>
            </SignInButton>
          </div>
        </SignedOut>
        <SignedIn>
          <div className="flex h-screen">
            <Sidebar
              topics={topics}
              onSelect={(page) => {
                setShowHome(false);
                handleSelectQuestion(page);
              }}
              onHomeClick={() => {
                setShowHome(true);
                setSelectedQuestion(null);
              }}
              selectedPage={selectedQuestion}
            />

            <main className="flex-1 p-5 h-full overflow-y-auto">
              <div className="absolute top-5 right-5 z-10 flex items-center space-x-4">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" >
                      <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                      <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                      <span className="sr-only">Toggle theme</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setTheme("light")}>Light</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTheme("dark")}>Dark</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTheme("system")}>System</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <UserButton
                  appearance={{
                    elements: {
                      userButtonPopoverCard: 'bg-white dark:bg-gray-800 shadow-lg',
                      userButtonPrimaryButton: 'text-blue-500 hover:text-blue-600',
                      // 其他樣式元素
                    },
                  }}
                />
              </div>

              <h1 className="text-2xl mb-4">Quest.py</h1>

              {/* 主頁內容 */}
              {showHome ? (
                <div className="text-gray-800 bg-gray-100 dark:bg-gray-700 dark:text-gray-100 pr-4 pl-4 pt-3 pb-3 rounded break-words whitespace-normal max-w-full">
                  <h2 className="text-xl">歡迎來到主頁</h2>
                  <p>這裡是您的 Python 學習平台，請從索引中選擇一個問題以開始學習。</p>
                  <p className="mt-2 text-sm text-gray-500">本網頁題目參考自Snakify。</p>
                </div>
              ) : (
                <>
                  <div className="text-gray-800 bg-gray-100 dark:bg-gray-700 dark:text-gray-100 pr-4 pl-4 pt-3 pb-3 rounded break-words whitespace-normal max-w-full">
                    {selectedQuestion ? (
                      Array.isArray(selectedQuestion.description) ? (
                        // 如果 `description` 是多行陣列，逐行顯示
                        selectedQuestion.description.map((line, index) => (
                          <p key={index} className="mb-2">{line}</p> // 為每行 `description` 添加一點間隔
                        ))
                      ) : (
                        <p>{selectedQuestion.description}</p> // 單行的情況，直接顯示
                      )
                    ) : (
                      "選擇一個問題以顯示描述"
                    )}
                  </div>

                  <hr className="border-t border-gray-300 my-4" />

                  {pyodide ? (
                    <>
                      <div className="flex flex-col w-full gap-5">
                        <div className="w-full">
                          <h2 className="text-lg mb-2">Code</h2>
                          <div className="relative">
                            {/* CodeMirror 編輯器 */}
                            <CodeMirror
                              value={code}
                              extensions={[python()]}
                              onChange={(value) => setCode(value)}
                              theme={theme === "light" ? eclipse : dracula}
                              className="w-full h-auto rounded-lg shadow-lg"
                              style={{ fontSize: '16px' }}
                            />

                            {/* 當無內容時顯示的佔位符 */}
                            {showPlaceholder && (
                              <div className="absolute top-1 left-10 pointer-events-none text-gray-400" style={{ fontSize: '16px' }}>
                                Enter your Python code here
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-5">
                          <div className="flex-1 w-7/12 relative">
                            <h2 className="text-lg mb-2">Input</h2>
                            <textarea
                              ref={textAreaRef}
                              rows="10"
                              placeholder="Enter each input on a new line"
                              value={input}
                              onChange={(e) => setInput(e.target.value)}
                              className="w-full bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white p-2 resize-none h-58"
                            />
                            <div className="mt-4 flex items-center space-x-4">
                              <Button onClick={() => handleRunCode(input)} className="mr-2">Run</Button>
                              <Button onClick={handleRunAllTests} className="mr-2">Test All</Button>
                              {testResult && (
                                <span
                                  className={`p-2 rounded text-white ${testResult === "測試通過" ? "bg-green-500" : "bg-red-500"
                                    }`}
                                >
                                  {testResult}
                                </span>
                              )}
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

                      {selectedQuestion && selectedQuestion.examples && (
                        <div className="mt-4">
                          <h2 className="text-lg mb-2 font-bold">Examples</h2>
                          <table className="min-w-full border border-gray-300 rounded-lg overflow-hidden">
                            <thead className="bg-gray-200 text-black dark:bg-gray-800 dark:text-white">
                              <tr>
                                <th className="border border-gray-300 p-2 text-left">Button</th>
                                <th className="border border-gray-300 p-2 text-left">Input</th>
                                <th className="border border-gray-300 p-2 text-left">Correct answer</th>
                                <th className="border border-gray-300 p-2 text-left">Your output</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedQuestion.examples.map((example, index) => {
                                const isCorrect = testResults[index]?.isCorrect; // 用於判斷輸出是否正確
                                const outputClass = isCorrect ? "bg-green-200 dark:bg-green-800" : "bg-red-200 dark:bg-red-800"; // 設置背景顏色
                                return (
                                  <tr key={index} className="hover:bg-gray-100 dark:hover:bg-gray-900">
                                    <td className="border border-gray-300 p-2 text-center w-1/4">
                                      <Button
                                        onClick={() => handleTestCode(example, index)} // 執行測試
                                        className="bg-gray-300 text-gray-900 hover:bg-gray-400 dark:bg-gray-400 dark:text-black dark:hover:bg-gray-500"
                                      >
                                        Run test #{index + 1}
                                      </Button>
                                    </td>
                                    <td className="border border-gray-300 p-2">
                                      {/* 如果 input 是陣列，將每個元素換行顯示 */}
                                      <pre>
                                        {Array.isArray(example.input)
                                          ? example.input.map((item, i) => <div key={i}>{item}</div>)
                                          : example.input}
                                      </pre>
                                    </td>
                                    <td className="border border-gray-300 p-2">
                                      {/* 如果 output 是陣列，將每個元素換行顯示 */}
                                      <pre>
                                        {Array.isArray(example.output)
                                          ? example.output.map((item, i) => <div key={i}>{item}</div>)
                                          : example.output}
                                      </pre>
                                    </td>
                                    <td className={`border border-gray-300 p-2 ${testResults[index]?.result ? outputClass : ""}`}>
                                      <pre>{testResults[index]?.result}</pre>
                                    </td>

                                  </tr>
                                );
                              })}
                            </tbody>

                          </table>
                        </div>
                      )}
                    </>
                  ) : loadingError ? (
                    <p className="text-red-500">{loadingError}</p>
                  ) : (
                    <p>Loading Pyodide...</p>
                  )}
                </>
              )}
            </main>
          </div>
        </SignedIn>
      </div>
    </ClerkProvider>
  );
}