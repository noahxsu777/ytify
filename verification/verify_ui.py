from playwright.sync_api import sync_playwright
import time

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    # Set color scheme to dark
    context = browser.new_context(
        viewport={'width': 1280, 'height': 800},
        color_scheme='dark'
    )
    page = context.new_page()

    try:
        print("Navigating...")
        page.goto("http://localhost:5174")

        # Click the "Comenzar ahora" link
        try:
             button = page.locator("a.sonic-btn").first
             button.wait_for(state="visible", timeout=5000)
             button.click()
             print("Button clicked.")
             time.sleep(3) # Wait for page transition
        except Exception as e:
             print(f"Could not click button: {e}")

        # Now verify content
        print("Checking for greeting...")
        try:
             page.wait_for_selector(".greeting-section h2", timeout=5000)
             greeting = page.locator(".greeting-section h2").first.text_content()
             print(f"Greeting found: {greeting}")
        except:
             print("Greeting not found.")

        # Check grid items
        items = page.locator(".greeting-card").count()
        print(f"Found {items} greeting cards.")

        # Check horizontal scroll
        hscroll = page.locator(".horizontal-scroll").count()
        print(f"Found {hscroll} horizontal scroll sections.")

        page.screenshot(path="verification/screenshot_final.png", full_page=True)
        print("Screenshot saved to verification/screenshot_final.png")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
