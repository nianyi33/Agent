#!/usr/bin/env python3
"""
抖音搜索工具 — 使用 Playwright + 反检测 + API 兜底搜索抖音视频。
用法：
  python scripts/douyin_search.py "关键词"
  python scripts/douyin_search.py "关键词" --count 20
  python scripts/douyin_search.py "关键词" --headless --json
  python scripts/douyin_search.py "关键词" --api-only   # 纯 API 模式，不启动浏览器
"""

import sys
import json
import time
import argparse
import urllib.request
import urllib.parse
import urllib.error
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout

# ── 反检测脚本：注入到每个页面，隐藏自动化痕迹 ──────────────────────
STEALTH_JS = """
// 移除 webdriver 标记
Object.defineProperty(navigator, 'webdriver', { get: () => false });
// 伪造 chrome 对象
window.chrome = { runtime: {}, loadTimes: function() {}, csi: function() {} };
// 伪造权限查询
const originalQuery = window.navigator.permissions.query;
window.navigator.permissions.query = (parameters) =>
    parameters.name === 'notifications' ?
    Promise.resolve({ state: Notification.permission }) :
    originalQuery(parameters);
// 伪造 plugins 长度
Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
Object.defineProperty(navigator, 'languages', { get: () => ['zh-CN', 'zh', 'en'] });
"""


def search_via_api(keyword: str, count: int = 10) -> list[dict]:
    """通过抖音内部 API 搜索（不需要浏览器，速度快但可能失效）。"""
    results = []
    search_url = "https://www.douyin.com/aweme/v1/web/search/item/"

    params = {
        "keyword": keyword,
        "count": count,
        "offset": 0,
        "search_source": "normal_search",
        "query_correct_type": "1",
    }
    url = f"{search_url}?{urllib.parse.urlencode(params)}"

    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/148.0.0.0 Safari/537.36"
        ),
        "Referer": "https://www.douyin.com/",
        "Accept": "application/json, text/plain, */*",
    }

    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read())

        for item in data.get("data", []):
            aweme = item.get("aweme_info", {}) or item
            video_id = aweme.get("aweme_id", "")
            results.append({
                "title": (aweme.get("desc") or "")[:100],
                "author": (aweme.get("author", {}).get("nickname") or "")[:50],
                "likes": str(aweme.get("statistics", {}).get("digg_count", "")),
                "url": f"https://www.douyin.com/video/{video_id}",
                "video_id": video_id,
            })
    except Exception as e:
        print(f"⚠️  API 模式失败: {e}")

    return results


def search_via_browser(keyword: str, count: int = 10, headless: bool = False) -> list[dict]:
    """通过浏览器搜索抖音（更稳定，能绕过大部分反爬）。"""
    results = []
    search_url = f"https://www.douyin.com/search/{urllib.parse.quote(keyword)}"

    with sync_playwright() as p:
        # 启动参数：隐藏自动化标志
        browser = p.chromium.launch(
            headless=headless,
            args=[
                "--disable-blink-features=AutomationControlled",
                "--disable-features=IsolateOrigins,site-per-process",
            ],
        )

        context = browser.new_context(
            viewport={"width": 1920, "height": 1080},
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/148.0.0.0 Safari/537.36"
            ),
            locale="zh-CN",
        )

        page = context.new_page()

        # 注入反检测脚本
        page.add_init_script(STEALTH_JS)

        print(f"🔍 正在搜索: {keyword}")
        print(f"   打开: {search_url}")

        try:
            page.goto(search_url, wait_until="networkidle", timeout=45000)
        except PlaywrightTimeout:
            print("⚠️  页面加载超时，尝试继续...")

        # 等待足够时间让 SPA 渲染
        time.sleep(5)

        # 模拟人类滚动
        for i in range(4):
            page.mouse.wheel(0, 800)
            time.sleep(1.2)

        # 捕获页面中的初始化数据（SSR 注水数据）
        try:
            html = page.content()
            # 查找 window._ROUTER_DATA 或 __NEXT_DATA__ 之类的 SSR 数据
            init_data = page.evaluate("""() => {
                const scripts = document.querySelectorAll('script[id="RENDER_DATA"]');
                if (scripts.length > 0) return scripts[0].textContent;
                return null;
            }""")
            if init_data:
                data = json.loads(urllib.parse.unquote(init_data))
                # 尝试从 SSR 数据中提取视频列表
                # 结构可能变化，做安全访问
                def extract(obj, path, default=None):
                    for key in path:
                        if isinstance(obj, dict):
                            obj = obj.get(key, {})
                        else:
                            return default
                    return obj if obj != {} else default

                # 各种可能的路径
                for path in [
                    ["app", "searchVideo", "videoList"],
                    ["serverRouter", "searchVideo", "videoList"],
                ]:
                    video_list = extract(data, path)
                    if video_list and isinstance(video_list, list):
                        for v in video_list[:count]:
                            results.append({
                                "title": str(v.get("desc", ""))[:100],
                                "author": str(v.get("author", {}).get("nickname", ""))[:50],
                                "likes": str(v.get("statistics", {}).get("digg_count", "")),
                                "url": f"https://www.douyin.com/video/{v.get('aweme_id', '')}",
                                "video_id": str(v.get("aweme_id", "")),
                            })
                        if results:
                            browser.close()
                            return results
        except Exception as e:
            print(f"   SSR 提取失败: {e}")

        # 兜底：从 DOM 提取
        items = page.query_selector_all('a[href*="/video/"]')
        seen = set()
        for item in items:
            if len(results) >= count:
                break

            try:
                href = item.get_attribute("href") or ""
                if "/video/" not in href:
                    continue
                video_id = href.split("/video/")[-1].split("?")[0].rstrip("/")
                if video_id in seen or not video_id:
                    continue
                seen.add(video_id)

                text = item.inner_text().strip()
                lines = [l for l in text.split("\n") if l.strip()]

                results.append({
                    "title": lines[0][:100] if lines else "",
                    "author": lines[1][:50] if len(lines) > 1 else "",
                    "likes": lines[2] if len(lines) > 2 else "",
                    "url": f"https://www.douyin.com/video/{video_id}",
                    "video_id": video_id,
                })
            except Exception:
                continue

        browser.close()
    return results


def main():
    parser = argparse.ArgumentParser(description="抖音搜索工具")
    parser.add_argument("keyword", help="搜索关键词")
    parser.add_argument("--count", type=int, default=10, help="返回结果数量 (默认 10)")
    parser.add_argument("--headless", action="store_true", help="无头模式运行")
    parser.add_argument("--json", action="store_true", help="JSON 格式输出")
    parser.add_argument("--api-only", action="store_true", help="纯 API 模式，不启动浏览器")
    args = parser.parse_args()

    if args.api_only:
        results = search_via_api(args.keyword, args.count)
    else:
        results = search_via_browser(
            keyword=args.keyword,
            count=args.count,
            headless=args.headless,
        )

    if args.json:
        print(json.dumps(results, ensure_ascii=False, indent=2))
    else:
        if not results:
            print("❌ 未找到结果")
            print("   提示: 抖音可能要求扫码登录，试试用 --api-only 模式")
            sys.exit(0)

        print(f"\n📊 找到 {len(results)} 条结果:\n")
        for i, r in enumerate(results, 1):
            print(f"{i}. {r['title'] or '(无标题)'}")
            print(f"   👤 {r['author'] or '(未知)'}  ❤️ {r['likes'] or '-'}")
            print(f"   🔗 {r['url']}")
            print()


if __name__ == "__main__":
    main()
