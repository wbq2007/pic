#!/usr/bin/env python3
"""
自动查找并点击页面中的“下一节”按钮（Selenium）。

安装:
    pip install selenium

需下载对应的 ChromeDriver 并放在 PATH 或指定路径。
"""

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, WebDriverException


def click_next_on_page(driver, timeout=10):
    try:
        xpath = ("//button[contains(normalize-space(.),'下一节') or "
                 "contains(normalize-space(.),'下一章') or "
                 "contains(normalize-space(.),'下一节>') or "
                 "contains(normalize-space(.),'Next')]")
        btn = WebDriverWait(driver, timeout).until(
            EC.element_to_be_clickable((By.XPATH, xpath))
        )
        btn.click()
        print("Clicked '下一节' button.")
        return True
    except TimeoutException:
        print("Button not found within timeout, trying to remove modal overlays.")
        # 尝试移除常见 modal/overlay 元素
        overlays = driver.find_elements(By.XPATH, "//*[contains(@class,'modal') or @role='dialog' or contains(@class,'overlay') or contains(@class,'popup') or contains(@class,'mask')]")
        for o in overlays:
            try:
                driver.execute_script("arguments[0].style.display='none';", o)
            except WebDriverException:
                pass
        # 再试一次寻找按钮（短超时）
        try:
            btn = WebDriverWait(driver, 2).until(
                EC.element_to_be_clickable((By.XPATH, xpath))
            )
            btn.click()
            print("Clicked after removing overlays.")
            return True
        except Exception:
            print("Still not found.")
            return False


def main():
    url = input("Enter URL: ").strip()
    options = webdriver.ChromeOptions()
    options.add_argument("--start-maximized")
    driver = webdriver.Chrome(options=options)
    driver.get(url)
    ok = click_next_on_page(driver, timeout=8)
    if not ok:
        print("未自动点击，请按需处理。")
    input("Press Enter to quit...")
    driver.quit()


if __name__ == '__main__':
    main()
