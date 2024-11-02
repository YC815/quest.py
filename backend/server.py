from flask import Flask, request, jsonify, make_response
from flask_cors import CORS
import subprocess
import tempfile
import os
import json
import re
import logging

# 初始化 Flask 應用
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})  # 啟用 CORS，允許所有來源訪問

# 設定基本日誌級別
logging.basicConfig(level=logging.DEBUG)

# 路徑為當前文件夾中的 test_cases.json
TEST_CASES_FILE = "test_cases.json"


@app.route('/execute', methods=['POST'])
def execute():
    data = request.get_json()
    app.logger.debug(f"Received data for execution: {data}")

    # 取得代碼並將 '\n' 轉換為真正的換行符
    code = data.get("code", "")
    inputs = data.get("inputs", [])

    try:
        # 創建臨時文件保存 Python 腳本，保證代碼多行寫入
        with tempfile.NamedTemporaryFile(delete=False, suffix=".py") as temp_script:
            temp_script.write(code.replace('\\n', '\n').encode('utf-8'))
            temp_script_path = temp_script.name

        # 創建臨時文件保存輸入數據
        input_str = "\n".join(inputs)
        with tempfile.NamedTemporaryFile(delete=False, suffix=".txt") as temp_input:
            temp_input.write(input_str.encode('utf-8'))
            temp_input_path = temp_input.name

        # 使用 subprocess 執行 Python 腳本，並從輸入文件中讀取標準輸入
        with open(temp_input_path, 'r') as input_file:
            app.logger.debug(f"Executing Python script from {temp_script_path} with input file {temp_input_path}")
            result = subprocess.run(
                ["python3", temp_script_path],
                stdin=input_file,
                text=True,
                capture_output=True,
                check=False,
                timeout=10  # 增加執行超時保護
            )
            app.logger.debug(f"Execution completed. stdout: {result.stdout}, stderr: {result.stderr}")

        # 過濾掉與調試器相關的警告信息
        filtered_stderr = re.sub(
            r"^\d+\.\d+s - Debugger warning:.*(?:\n.*)*", "", result.stderr, flags=re.MULTILINE
        ).strip()

        # 返回標準輸出與標準錯誤
        response = make_response(jsonify({"stdout": result.stdout, "stderr": filtered_stderr}))

    except subprocess.TimeoutExpired:
        app.logger.error(f"Execution timed out for script {temp_script_path}")
        response = make_response(jsonify({"stdout": "", "stderr": "Error: Execution timed out"}))

    except subprocess.CalledProcessError as e:
        app.logger.error(f"CalledProcessError: {e}")
        response = make_response(jsonify({"stdout": e.stdout, "stderr": e.stderr}))

    except Exception as e:
        app.logger.error(f"Exception occurred: {str(e)}")
        response = make_response(jsonify({"stdout": "", "stderr": f"Error: {str(e)}"}))

    finally:
        # 刪除臨時文件
        if os.path.exists(temp_script_path):
            os.remove(temp_script_path)
        if os.path.exists(temp_input_path):
            os.remove(temp_input_path)

    return response


@app.route('/check', methods=['POST'])
def check():
    data = request.get_json()
    app.logger.debug(f"Received data for checking: {data}")

    # 取得代碼並將 '\n' 替換為真正的換行符
    code = data.get("code", "").replace('\\n', '\n')

    # 簡單檢查 Python 代碼是否包含危險函數
    restricted_keywords = ['import os', 'import sys', 'open(', 'subprocess']
    if any(keyword in code for keyword in restricted_keywords):
        response = make_response(jsonify({"passed": False, "message": "Code contains restricted operations."}))
        return response

    # 加載測試案例
    try:
        with open(TEST_CASES_FILE, 'r') as test_cases_file:
            test_cases = json.load(test_cases_file)
    except FileNotFoundError:
        return make_response(jsonify({"passed": False, "message": "Test cases file not found"}))
    except json.JSONDecodeError:
        return make_response(jsonify({"passed": False, "message": "Error parsing test cases file"}))

    results = []

    # 遍歷每個測試案例進行測試
    for test_case in test_cases:
        test_id = test_case.get("id")
        inputs = test_case.get("inputs", [])
        expected_outputs = test_case.get("expectedOutputs", [])

        try:
            # 創建臨時文件保存 Python 腳本
            with tempfile.NamedTemporaryFile(delete=False, suffix=".py") as temp_script:
                temp_script.write(code.encode('utf-8'))
                temp_script_path = temp_script.name

            # 逐一測試每個輸入
            actual_outputs = []
            for i in range(len(inputs)):
                input_value = inputs[i]

                # 使用 subprocess 執行 Python 腳本，並傳遞當前輸入
                result = subprocess.run(
                    ["python3", temp_script_path],
                    input=input_value,
                    text=True,
                    capture_output=True,
                    check=False,
                    timeout=10  # 增加執行超時保護
                )
                app.logger.debug(f"Test case {test_id} for input '{input_value}' completed. stdout: {result.stdout}, stderr: {result.stderr}")

                # 獲取輸出並存入結果
                actual_outputs.append(result.stdout.strip())

            # 解析輸出並與預期結果進行比較
            expected_outputs = [output.strip() for output in expected_outputs]
            passed = (actual_outputs == expected_outputs)

            # 將每個測試的詳細信息存入 results
            result_summary = {
                "id": test_id,
                "inputs": inputs,
                "actual_outputs": actual_outputs,
                "expected_outputs": expected_outputs,
                "passed": passed
            }
            results.append(result_summary)

        except subprocess.TimeoutExpired:
            app.logger.error(f"Test case {test_id} execution timed out.")
            results.append({
                "id": test_id,
                "inputs": inputs,
                "expected_outputs": expected_outputs,
                "actual_outputs": [],
                "passed": False,
                "error": "Execution timed out"
            })

        except Exception as e:
            app.logger.error(f"Test case {test_id} failed with error: {e}")
            results.append({
                "id": test_id,
                "inputs": inputs,
                "expected_outputs": expected_outputs,
                "actual_outputs": [],
                "passed": False,
                "error": str(e)
            })

        finally:
            if os.path.exists(temp_script_path):
                os.remove(temp_script_path)

    # 檢查所有測試案例是否全部通過
    all_passed = all(result["passed"] for result in results)

    response_data = {
        "passed": all_passed,
        "results": results
    }

    return make_response(jsonify(response_data))


if __name__ == "__main__":
    # 修改為固定端口 5001，並使用 0.0.0.0 使 Flask 可以從外部訪問
    app.run(debug=True, host="0.0.0.0", port=5001)
