@echo off
chcp 65001 >nul
echo.
echo ====================================================
echo   抖音自动化脚本 - Selenium版本
echo ====================================================
echo   注意：本工具仅用于个人研究目的
echo   请遵守相关法律法规和平台服务条款
echo ====================================================
echo.

REM 检查Python是否安装
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ 未检测到Python，请先安装Python 3.8+
    pause
    exit /b 1
)

echo 正在启动抖音自动化脚本（Selenium版本）...
echo.
echo 重要提示：
echo 1. 首次运行会弹出浏览器窗口
echo 2. 需要手动登录抖音账号
echo 3. 登录后按Enter键继续
echo.
echo 如果您还没有安装依赖，请先运行 install.bat
echo.
pause

python douyin_automation.py

if errorlevel 1 (
    echo.
    echo ❌ 脚本运行过程中出现错误
    echo.
    echo 可能的原因：
    echo 1. 依赖包未安装 - 运行 install.bat
    echo 2. WebDriver问题 - 检查Chrome浏览器版本
    echo 3. 配置文件错误 - 检查 config.yaml 格式
) else (
    echo.
    echo ✅ 脚本执行完成！
)

echo.
pause
