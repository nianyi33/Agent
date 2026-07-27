"""深度调试：检查抖音搜索页的渲染状态和网络请求。"""
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=False)
    page = browser.new_page()

    # 收集控制台和网络错误
    errors = []
    page.on("console", lambda msg: errors.append(f"[{msg.type}] {msg.text}") if msg.type in ("error", "warning") else None)
    xhr_urls = []
    def log_req(req):
        if "/aweme/" in req.url or "/search/" in req.url:
            xhr_urls.append(f"{req.method} {req.url[:120]}")
    page.on("request", log_req)

    page.goto("https://www.douyin.com/search/美食", wait_until="domcontentloaded", timeout=30000)
    print("✅ domcontentloaded")

    # 等待更久，让 SPA 框架发起 API 请求
    page.wait_for_timeout(15000)
    print(f"📍 当前 URL: {page.url}")

    # 检查页面主体内容
    body_text = page.evaluate("() => document.body.innerText.slice(0, 500)")
    print(f"📄 页面文本 (前500字):\n{body_text}\n")

    print(f"🌐 XHR 请求 ({len(xhr_urls)} 条):")
    for u in xhr_urls:
        print(f"  {u}")

    print(f"\n⚠️  控制台 ({len(errors)} 条):")
    for e in errors[:10]:
        print(f"  {e}")

    # 检查关键元素
    for sel in ['video', 'img', 'a[href]', '[class*="search"]', '[class*="result"]']:
        count = page.evaluate(f"() => document.querySelectorAll('{sel}').length")
        if count > 0:
            print(f"  🔍 {sel}: {count} 个")

    browser.close()
