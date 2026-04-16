"""
抖音自动化脚本 - 使用Playwright

Playwright 是一个现代浏览器自动化库，支持多种浏览器。
安装: pip install playwright
初始化: playwright install
"""

import asyncio
import logging
import yaml
from typing import List
from playwright.async_api import async_playwright

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class DouyinPlaywright:
    def __init__(self, headless=False):
        self.headless = headless
        self.browser = None
        self.context = None
        self.page = None

    async def setup(self):
        """初始化浏览器和页面"""
        playwright = await async_playwright().start()
        try:
            self.browser = await playwright.chromium.launch(headless=self.headless, channel="msedge")
            logger.info("使用Microsoft Edge浏览器")
        except Exception:
            self.browser = await playwright.chromium.launch(headless=self.headless)
            logger.info("使用Chromium浏览器")

        # 创建上下文，模拟移动设备（抖音主要是移动端）
        iphone = playwright.devices['iPhone 12']
        import os
        if os.path.exists("auth_state.json"):
            self.context = await self.browser.new_context(**iphone, storage_state="auth_state.json")
        else:
            self.context = await self.browser.new_context(**iphone)

        self.page = await self.context.new_page()
        logger.info("Playwright 初始化完成")

    async def goto_douyin(self):
        """访问抖音"""
        await self.page.goto("https://www.douyin.com")
        await self.page.wait_for_load_state('networkidle')
        logger.info("已访问抖音首页")

    async def login_manually(self):
        """手动登录（推荐）"""
        logger.info("请手动登录抖音...")
        # 等待用户手动登录
        await asyncio.to_thread(input, "请在浏览器中完成登录，然后按Enter键继续...")

        # 保存登录状态
        await self.context.storage_state(path="auth_state.json")
        logger.info("登录状态已保存")

    async def load_auth_state(self):
        """加载认证状态"""
        import os
        if os.path.exists("auth_state.json"):
            logger.info("找到认证状态文件")
            return True
        else:
            logger.warning("未找到认证状态文件，需要重新登录")
            return False

    async def search_videos(self, keyword: str):
        """搜索视频"""
        logger.info(f"搜索视频: {keyword}")
        # 需要找到搜索框并输入关键词
        # 实际选择器需要根据网站结构确定
        # await self.page.click("搜索框选择器")
        # await self.page.fill("搜索框选择器", keyword)
        # await self.page.press("搜索框选择器", "Enter")
        # await self.page.wait_for_load_state('networkidle')
        logger.warning("搜索功能需要根据实际网站结构实现")

    async def get_video_urls_from_feed(self, count: int = 10) -> List[str]:
        """从推荐 feed 获取视频URL"""
        urls = []
        logger.info(f"正在获取 {count} 个视频...")

        # 滚动加载视频
        for i in range(count // 3 + 1):
            # 尝试获取视频链接 - 抖音视频链接通常包含 /video/
            video_links = await self.page.query_selector_all('a[href*="/video/"]')
            for link in video_links:
                href = await link.get_attribute('href')
                if href and href not in urls:
                    # 确保是完整的URL
                    if href.startswith('/'):
                        href = f"https://www.douyin.com{href}"
                    urls.append(href)
                    if len(urls) >= count:
                        break

            # 向下滚动
            await self.page.evaluate("window.scrollBy(0, window.innerHeight * 2)")
            await asyncio.sleep(2)

            if len(urls) >= count:
                break

        logger.info(f"获取到 {len(urls)} 个视频URL")
        return urls

    async def process_video_comments(self, video_url: str, keywords: List[str]):
        """处理单个视频的评论"""
        logger.info(f"处理视频评论: {video_url}")

        await self.page.goto(video_url)
        await self.page.wait_for_load_state('networkidle')

        # 展开评论
        await self._expand_comments()

        # 获取评论
        comments = await self._get_comments()

        # 查找匹配关键词的评论
        matching_comments = []
        for comment in comments:
            for keyword in keywords:
                if keyword in comment['text']:
                    matching_comments.append(comment)
                    break

        # 举报匹配的评论
        for comment in matching_comments:
            await self._report_comment(comment)

        # 标记视频为不感兴趣
        await self._mark_not_interested()

        return len(matching_comments)

    async def _expand_comments(self):
        """展开评论"""
        # 尝试点击评论按钮 - 尝试多个可能的选择器
        comment_selectors = [
            'button:has-text("评论")',
            'div[class*="comment"] button',
            'div[class*="Comment"] button',
            'button[aria-label*="comment"]',
            'button[aria-label*="评论"]',
        ]

        clicked = False
        for selector in comment_selectors:
            try:
                if await self.page.query_selector(selector):
                    await self.page.click(selector)
                    await asyncio.sleep(2)
                    clicked = True
                    logger.info(f"已点击评论按钮: {selector}")
                    break
            except Exception as e:
                logger.debug(f"选择器 {selector} 失败: {e}")
                continue

        if not clicked:
            logger.info("未找到评论按钮，继续滚动加载评论")

        # 滚动加载更多评论
        for _ in range(5):
            # 尝试找到评论容器并滚动
            comment_containers = await self.page.query_selector_all('div[class*="comment"], div[class*="Comment"], div[class*="list"]')
            for container in comment_containers:
                try:
                    await container.evaluate("el => el.scrollTop = el.scrollHeight")
                    await asyncio.sleep(0.5)
                except:
                    pass

            await asyncio.sleep(1)

    async def _get_comments(self) -> List[dict]:
        """获取评论"""
        comments = []
        # 尝试查找评论元素
        comment_selectors = [
            'div[class*="comment-item"]',
            'div[class*="commentItem"]',
            'div[class*="comment"] div[class*="content"]',
            'div[class*="Comment"] div[class*="content"]',
            'div[class*="text"]',
        ]

        for selector in comment_selectors:
            try:
                comment_elements = await self.page.query_selector_all(selector)
                if comment_elements:
                    logger.info(f"使用选择器 {selector} 找到 {len(comment_elements)} 个评论")
                    for element in comment_elements:
                        text = await element.text_content()
                        if text and len(text.strip()) > 0:
                            comments.append({'element': element, 'text': text.strip()})
                    break
            except Exception as e:
                logger.debug(f"选择器 {selector} 失败: {e}")
                continue

        logger.info(f"共获取到 {len(comments)} 条评论")
        return comments

    async def _report_comment(self, comment: dict):
        """举报评论"""
        logger.info(f"举报评论: {comment['text'][:50]}...")

        try:
            # 尝试点击评论的更多按钮
            more_selectors = [
                'button[aria-label*="更多"]',
                'button[class*="more"]',
                'button[class*="More"]',
                'svg[class*="more"]',
            ]

            clicked = False
            for selector in more_selectors:
                try:
                    # 在评论元素内查找更多按钮
                    more_btn = await comment['element'].query_selector(selector)
                    if more_btn:
                        await more_btn.click()
                        await asyncio.sleep(1)
                        clicked = True
                        logger.info(f"已点击更多按钮: {selector}")
                        break
                except Exception as e:
                    logger.debug(f"更多按钮选择器 {selector} 失败: {e}")
                    continue

            if clicked:
                # 尝试点击举报选项
                report_selectors = [
                    'button:has-text("举报")',
                    'div[role="menu"] button:has-text("举报")',
                    'li:has-text("举报")',
                ]

                for selector in report_selectors:
                    try:
                        report_btn = await self.page.query_selector(selector)
                        if report_btn:
                            await report_btn.click()
                            await asyncio.sleep(1)
                            logger.info("已点击举报按钮")

                            # 尝试选择举报理由（使用配置中的第一个理由）
                            try:
                                with open("config.yaml", "r", encoding="utf-8") as f:
                                    import yaml
                                    config = yaml.safe_load(f)
                                    report_reasons = config.get("report_reasons", ["其他"])
                                    if report_reasons:
                                        reason = report_reasons[0]
                                        # 尝试选择理由
                                        reason_selector = f'button:has-text("{reason}"), input[value*="{reason}"]'
                                        reason_btn = await self.page.query_selector(reason_selector)
                                        if reason_btn:
                                            await reason_btn.click()
                                            await asyncio.sleep(0.5)
                            except:
                                pass

                            # 尝试提交
                            submit_selectors = ['button:has-text("提交")', 'button:has-text("确定")', 'button:has-text("举报")']
                            for sub_selector in submit_selectors:
                                try:
                                    submit_btn = await self.page.query_selector(sub_selector)
                                    if submit_btn:
                                        await submit_btn.click()
                                        await asyncio.sleep(1)
                                        logger.info("举报提交成功")
                                        break
                                except:
                                    continue

                            break
                    except Exception as e:
                        logger.debug(f"举报选择器 {selector} 失败: {e}")
                        continue
            else:
                logger.info("未找到更多按钮，跳过举报")

        except Exception as e:
            logger.error(f"举报过程中出错: {e}")

    async def _mark_not_interested(self):
        """标记为不感兴趣"""
        logger.info("标记视频为不感兴趣")

        try:
            # 尝试点击更多选项按钮
            more_selectors = [
                'button[aria-label*="更多"]',
                'button[class*="more"]',
                'button[class*="More"]',
                'svg[class*="more"]',
                'button[aria-label*="options"]',
            ]

            clicked = False
            for selector in more_selectors:
                try:
                    more_btn = await self.page.query_selector(selector)
                    if more_btn:
                        await more_btn.click()
                        await asyncio.sleep(1)
                        clicked = True
                        logger.info(f"已点击更多按钮: {selector}")
                        break
                except Exception as e:
                    logger.debug(f"更多按钮选择器 {selector} 失败: {e}")
                    continue

            if clicked:
                # 尝试选择"不感兴趣"选项
                not_interested_selectors = [
                    'button:has-text("不感兴趣")',
                    'div[role="menu"] button:has-text("不感兴趣")',
                    'li:has-text("不感兴趣")',
                    'button:has-text("不感兴趣")',
                ]

                for selector in not_interested_selectors:
                    try:
                        not_interested_btn = await self.page.query_selector(selector)
                        if not_interested_btn:
                            await not_interested_btn.click()
                            await asyncio.sleep(1)
                            logger.info("已标记为不感兴趣")
                            return
                    except Exception as e:
                        logger.debug(f"不感兴趣选择器 {selector} 失败: {e}")
                        continue

                logger.info("未找到不感兴趣选项")
            else:
                logger.info("未找到更多按钮，无法标记不感兴趣")

        except Exception as e:
            logger.error(f"标记不感兴趣过程中出错: {e}")

    async def run(self, keywords: List[str], video_count: int = 5):
        """运行主流程"""
        try:
            await self.setup()

            # 访问抖音
            await self.goto_douyin()

            # 尝试加载认证状态
            if not await self.load_auth_state():
                await self.login_manually()

            # 获取视频URL（这里从推荐feed获取）
            video_urls = await self.get_video_urls_from_feed(video_count)

            # 处理每个视频
            results = []
            for url in video_urls:
                try:
                    count = await self.process_video_comments(url, keywords)
                    results.append((url, count))
                    logger.info(f"视频处理完成: {url}, 举报了 {count} 条评论")
                except Exception as e:
                    logger.error(f"处理视频 {url} 时出错: {e}")
                    results.append((url, "error"))

            # 输出结果
            logger.info("=" * 50)
            logger.info("处理完成:")
            for url, count in results:
                logger.info(f"  {url}: {count}")

        except Exception as e:
            logger.error(f"运行出错: {e}")
        finally:
            await self.close()

    async def close(self):
        """关闭资源"""
        if self.browser:
            await self.browser.close()
            logger.info("浏览器已关闭")

async def main():
    """主函数"""
    # 加载配置文件
    try:
        with open("config.yaml", "r", encoding="utf-8") as f:
            config = yaml.safe_load(f)

        # 获取关键词列表
        keywords = config.get("keywords", ["女权主义", "女权", "表情包里带有女权主义"])

        # 获取自动化设置
        settings = config.get("settings", {})
        headless = settings.get("headless", True)
        max_videos = settings.get("max_videos", 5)

        logger.info(f"配置文件加载成功: headless={headless}, max_videos={max_videos}")
        logger.info(f"关键词: {keywords}")

    except Exception as e:
        logger.error(f"配置文件加载失败: {e}, 使用默认设置")
        keywords = ["女权主义", "女权", "表情包里带有女权主义"]
        headless = True
        max_videos = 5

    automation = DouyinPlaywright(headless=headless)
    await automation.run(keywords, video_count=max_videos)

if __name__ == "__main__":
    asyncio.run(main())
