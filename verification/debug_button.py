from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()
    page.goto("http://localhost:5174")

    # Wait for content
    page.wait_for_timeout(3000)

    content = page.content()
    index = content.find("Comenzar ahora")
    if index != -1:
        print(f"Found text at index {index}")
        print(content[index-200:index+200])
    else:
        print("Text not found in content.")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
