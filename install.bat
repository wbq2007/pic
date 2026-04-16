@echo off
chcp 65001 >nul
echo.
echo ====================================================
echo   抖音自动化研究环境安装脚本
echo ====================================================
echo   注意：本工具仅用于个人研究目的
echo   请遵守相关法律法规和平台服务条款
echo ====================================================
echo.

REM 检查Python是否安装
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ 未检测到Python，请先安装Python 3.8+
    echo 下载地址：https://www.python.org/downloads/
    pause
    exit /b 1
)

REM 检查pip是否可用
pip --version >nul 2>&1
if errorlevel 1 (
    echo ❌ 未检测到pip，请确保Python安装正确
    pause
    exit /b 1
)

REM 运行Python安装脚本
echo 正在运行安装脚本...
echo.
python setup.py

if errorlevel 1 (
    echo.
    echo ❌ 安装过程中出现错误
    pause
    exit /b 1
)

echo.
echo 安装完成！
echo.
echo 接下来：
echo 1. 运行测试验证环境：
echo    双击 test.bat 或运行 python test_environment.py
echo.
echo 2. 阅读使用说明：
echo    查看 README.md 文件
echo.
echo 3. 首次运行自动化：
echo    双击 run.bat 或运行 python douyin_playwright.py
echo.
echo 注意：首次运行需要手动登录抖音账号
echo.
pause
