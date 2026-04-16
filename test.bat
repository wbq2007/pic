@echo off
chcp 65001 >nul
echo.
echo ====================================================
echo   抖音自动化环境测试
echo ====================================================
echo.

REM 检查Python是否安装
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ 未检测到Python，请先安装Python 3.8+
    pause
    exit /b 1
)

echo 正在测试环境...
echo.
python test_environment.py

if errorlevel 1 (
    echo.
    echo ⚠️ 测试失败，请检查环境配置
    echo 运行 install.bat 或执行以下命令：
    echo   pip install -r requirements.txt
    echo   playwright install chromium
) else (
    echo.
    echo ✅ 环境测试通过！
    echo.
    echo 下一步建议：
    echo 1. 首次运行需要手动登录：运行 python douyin_playwright.py
    echo 2. 根据实际网页结构更新代码中的选择器
    echo 3. 阅读 README.md 了解详细使用说明
)

echo.
pause
