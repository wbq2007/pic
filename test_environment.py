"""
环境测试脚本
运行此脚本验证自动化环境是否正常工作
"""

import sys
import io
try:
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
except AttributeError:
    pass

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
