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
  const [testResults, setTestResults] = useState([]);
  const [testResult, setTestResult] = useState(null);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
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
        console.log(`Selected question:`, selected);
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
      setOutput(result); // 更新 output 狀態以顯示在 UI 中
      return result; // 返回執行結果
    } catch (err) {
      console.error("Error running code:", err);
      return ""; // 如果有錯誤，返回空字串
    }
  };

  const handleTestCode = async (example, index) => {
    const inputString = example.input.join("\n");
    const result = await handleRunCode(inputString); // 自動運行範例輸入

    setTestResults((prevResults) => {
      const newResults = [...prevResults];
      newResults[index] = {
        result,
        isCorrect: result.trim() === example.output.trim(),
      };
      return newResults;
    });
  };

  const handleRunAllTests = async () => {
    const results = [];

    for (const example of selectedQuestion.examples) {
      const inputString = example.input.join("\n");
      const result = await handleRunCode(inputString);
      results.push({
        result,
        isCorrect: result.trim() === example.output.trim(),
      });
    }

    setTestResults(results);
    const allPassed = results.every((test) => test.isCorrect);
    setTestResult(allPassed ? "測試通過" : "未通過測試");
  };

  // 更新行號顯示
  useEffect(() => {
    if (textAreaRef.current && lineNumberRef.current) {
      const lines = code.split("\n");
      lineNumberRef.current.innerText = Array.from({ length: lines.length }, (_, i) => i + 1).join("\n");
    }
  }, [code]); // 當 code 更新時重新計算行號

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
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
                    className="bg-gray-200 dark:bg-gray-700 text-gray-500 p-2 text-right select-none overflow-hidden h-auto"
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
                    ref={textAreaRef}
                    rows="10"
                    placeholder="Enter each input on a new line"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    className="w-full bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white p-2 resize-none h-58"
                  />
                  <div className="mt-4">
                    <Button onClick={() => handleRunCode(input)} className="mr-2">Run</Button>
                    <Button onClick={handleRunAllTests} className="mr-2">Test All</Button>
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
                            <pre>{Array.isArray(example.input) ? example.input.join(", ") : example.input}</pre>
                          </td>
                          <td className="border border-gray-300 p-2">
                            <pre>{example.output}</pre>
                          </td>
                          <td className={`border border-gray-300 p-2 ${outputClass}`}>
                            <pre>{testResults[index]?.result}</pre>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
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
    </div>
  );
}
