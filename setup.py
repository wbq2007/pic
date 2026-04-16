"""
安装脚本 - 设置抖音自动化研究环境
"""

import subprocess
import sys
import os

def run_command(command, description):
    """运行命令并显示输出"""
    print(f"\n[安装] {description}...")
    print(f"  命令: {command}")

    try:
        result = subprocess.run(
            command,
            shell=True,
            capture_output=True,
            text=True,
            check=False
        )

        if result.returncode == 0:
            print("   ✅ 完成")
            if result.stdout.strip():
                print(f"  输出: {result.stdout.strip()}")
        else:
            print(f"   ❌ 失败 (代码: {result.returncode})")
            if result.stderr:
                print(f"  错误: {result.stderr.strip()}")
            return False
        return True
    except Exception as e:
        print(f"   ❌ 异常: {e}")
        return False

def install_packages():
    """安装Python依赖包"""
    print("\n" + "="*50)
    print("1. 安装Python依赖包")
    print("="*50)

    # 检查pip是否可用
    success = run_command("python --version", "检查Python版本")
    if not success:
        return False

    success = run_command("pip --version", "检查pip版本")
    if not success:
        return False

    # 安装requirements.txt中的包
    success = run_command("pip install -r requirements.txt", "安装依赖包")
    return success

def install_playwright_browsers():
    """安装Playwright浏览器"""
    print("\n" + "="*50)
    print("2. 安装Playwright浏览器")
    print("="*50)

    success = run_command("playwright --version", "检查Playwright是否已安装")
    if not success:
        print("   ⚠️  Playwright未安装，尝试安装...")
        success = run_command("pip install playwright", "安装Playwright包")
        if not success:
            return False

    success = run_command("playwright install chromium", "安装Chromium浏览器")
    return success

def verify_environment():
    """验证环境配置"""
    print("\n" + "="*50)
    print("3. 验证环境配置")
    print("="*50)

    checks = [
        ("检查selenium", "python -c \"import selenium; print(f'Selenium版本: {selenium.__version__}')\""),
        ("检查playwright", "python -c \"import playwright; print('Playwright导入成功')\""),
        ("检查webdriver-manager", "python -c \"import webdriver_manager; print('Webdriver-manager导入成功')\""),
    ]

    all_ok = True
    for name, command in checks:
        success = run_command(command, name)
        if not success:
            all_ok = False

    return all_ok

def create_test_script():
    """创建测试脚本"""
    print("\n" + "="*50)
    print("4. 创建测试脚本")
    print("="*50)

    test_script = '''"""
环境测试脚本
运行此脚本验证自动化环境是否正常工作
"""

import sys

def test_imports():
    """测试必要的包是否可导入"""
    print("🔍 测试包导入...")

    packages = [
        ("selenium", "Web自动化"),
        ("playwright", "现代浏览器自动化"),
        ("webdriver_manager", "WebDriver管理"),
        ("yaml", "配置解析"),
    ]

    all_ok = True
    for package_name, description in packages:
        try:
            __import__(package_name)
            print(f"   ✅ {package_name} ({description})")
        except ImportError as e:
            print(f"   ❌ {package_name} ({description}): {e}")
            all_ok = False

    return all_ok

def test_config():
    """测试配置文件"""
    print("\n🔍 测试配置文件...")

    try:
        import yaml
        with open("config.yaml", "r", encoding="utf-8") as f:
            config = yaml.safe_load(f)

        if "keywords" in config:
            print(f"   ✅ 配置文件包含 {len(config['keywords'])} 个关键词")
            for i, keyword in enumerate(config['keywords'][:3], 1):
                print(f"      {i}. {keyword}")
            if len(config['keywords']) > 3:
                print(f"      ... 共 {len(config['keywords'])} 个关键词")
        else:
            print("   ⚠️ 配置文件缺少keywords部分")

        return True
    except Exception as e:
        print(f"   ❌ 配置文件错误: {e}")
        return False

def main():
    print("="*50)
    print("抖音自动化环境测试")
    print("="*50)

    imports_ok = test_imports()
    config_ok = test_config()

    print("\n" + "="*50)
    print("测试结果总结")
    print("="*50)

    if imports_ok and config_ok:
        print("🎉 所有测试通过！环境已准备就绪。")
        print("\n下一步建议:")
        print("1. 运行 'python douyin_playwright.py' 启动自动化")
        print("2. 根据实际网页结构更新代码中的选择器")
        print("3. 阅读 README.md 了解详细使用说明")
    else:
        print("⚠️  部分测试失败，请检查安装步骤。")
        print("\n修复建议:")
        if not imports_ok:
            print("- 重新运行安装脚本: python setup.py")
        if not config_ok:
            print("- 检查 config.yaml 文件格式")

        sys.exit(1)

if __name__ == "__main__":
    main()
'''

    try:
        with open("test_environment.py", "w", encoding="utf-8") as f:
            f.write(test_script)
        print("   ✅ 测试脚本已创建: test_environment.py")
        return True
    except Exception as e:
        print(f"   ❌ 创建测试脚本失败: {e}")
        return False

def main():
    """主安装流程"""
    print("\n" + "="*60)
    print("  抖音自动化研究环境安装脚本")
    print("="*60)
    print("  注意：本工具仅用于个人研究目的")
    print("  请遵守相关法律法规和平台服务条款")
    print("="*60)

    # 检查当前目录
    current_dir = os.getcwd()
    print(f"\n📁 当前目录: {current_dir}")

    # 检查必要文件
    required_files = ["requirements.txt", "config.yaml", "douyin_playwright.py"]
    missing_files = []

    for file in required_files:
        if os.path.exists(file):
            print(f"   ✅ {file}")
        else:
            print(f"   ❌ {file}")
            missing_files.append(file)

    if missing_files:
        print(f"\n⚠️  缺少必要文件: {', '.join(missing_files)}")
        print("请确保在项目根目录运行此脚本。")
        return False

    # 执行安装步骤
    if not install_packages():
        print("\n❌ Python包安装失败")
        return False

    if not install_playwright_browsers():
        print("\n⚠️  Playwright浏览器安装可能有问题，但将继续...")

    if not verify_environment():
        print("\n⚠️  环境验证发现问题")

    if not create_test_script():
        print("\n⚠️  测试脚本创建失败")

    print("\n" + "="*60)
    print("安装完成！")
    print("="*60)

    print("\n📋 接下来:")
    print("1. 运行测试验证环境:")
    print("   python test_environment.py")
    print("\n2. 阅读使用说明:")
    print("   查看 README.md 文件")
    print("\n3. 首次运行自动化:")
    print("   python douyin_playwright.py")
    print("   注意：首次运行需要手动登录抖音账号")
    print("\n4. 重要提醒:")
    print("   - 根据实际网页结构更新代码中的选择器")
    print("   - 遵守平台服务条款，合理使用")
    print("   - 设置合理的操作间隔，避免账号风险")

    print("\n" + "="*60)
    print("安装脚本执行完毕")
    print("="*60)

    return True

if __name__ == "__main__":
    try:
        success = main()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\n安装被用户中断")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ 安装过程中出现异常: {e}")
        sys.exit(1)
