import { test, expect } from "@playwright/test";

test.describe("ZoomingOnline App Flow", () => {
  test.beforeEach(async ({ page }) => {
    // Log browser console for debugging
    page.on("console", (msg) => {
      console.log(`[browser:${msg.type()}]`, msg.text());
    });

    // Listen for JavaScript errors
    page.on("pageerror", (error) => {
      console.log(`❌ Page error: ${error.message}`);
    });
  });

  test("complete app flow: copy URL → load data → select parameters → visualize", async ({
    page,
  }) => {
    console.log("🚀 Starting complete app flow test");

    console.log("📍 Opening main page");
    await page.goto("http://localhost:5173/");
    await expect(page).toHaveTitle(/ZoomingOnline/);
    console.log("✅ Main page loaded successfully");

    console.log("📍 Testing Copy Example URL");
    const copyButton = page.locator('button:has-text("Copy Example URL")');
    await expect(copyButton).toBeVisible({ timeout: 10000 });
    await copyButton.click();

    // Wait a moment for the URL to be copied
    await page.waitForTimeout(500);

    // Check if the URL was pasted into the text field
    const urlInput = page.locator('input[type="text"]');
    await expect(urlInput).toBeVisible();
    const inputValue = await urlInput.inputValue();
    expect(inputValue).toContain("example.zarr");
    console.log("✅ Example URL copied to input field:", inputValue);

    console.log("📍 Loading data");
    const loadButton = page.locator('button:has-text("Load Data")');
    await expect(loadButton).toBeVisible();
    await loadButton.click();

    console.log("📍 Checking redirection to selection");
    await expect(page).toHaveURL(/\/selection/, { timeout: 15000 });
    console.log("✅ Successfully redirected to selection page");

    // Wait for data to load
    await page.waitForTimeout(3000);

    console.log("📍 Checking dataset information");

    // Look for dataset info container
    const datasetInfoSection = page.locator(".dataset-info");
    await expect(datasetInfoSection).toBeVisible({ timeout: 10000 });
    console.log("✅ Dataset information section is visible");

    console.log("📍 Checking dropdown population");

    // Debug: Check what form elements are visible
    const selectionForm = page.locator("form").first();
    const formVisible = await selectionForm.isVisible().catch(() => false);
    console.log("📋 Selection form visible:", formVisible);

    // Count how many select elements we have
    const selectCount = await page.locator("select").count();
    console.log("🔍 Total select elements found:", selectCount);

    // Try to find select elements with specific IDs
    const selectWithIds = await page
      .locator(
        'select[id*="select"], select[id*="channel"], select[id*="trc"], select[id*="segment"]',
      )
      .count();
    console.log(
      "🔍 Elements with select/channel/trc/segment in ID:",
      selectWithIds,
    );

    // Wait longer and check for form loading
    if (selectCount === 0) {
      console.log("❌ No form elements found - data might not be loaded");

      // Check for loading state
      const loadingElements = await page.locator(".animate-spin").count();
      const loadingTextElements = await page.locator('text="Loading"').count();
      if (loadingElements > 0 || loadingTextElements > 0) {
        console.log("⏳ Page still in loading state, waiting longer...");
        await page.waitForTimeout(5000);
      }

      const selectCountAfterWait = await page.locator("select").count();
      console.log("🔍 Select elements after waiting:", selectCountAfterWait);

      if (selectCountAfterWait === 0) {
        // Debug: Check page content
        const pageContent = await page.content();
        const preview = pageContent.substring(0, 500);
        console.log("📝 Page content preview:", preview);

        // Take a screenshot for debugging
        await page.screenshot({
          path: "debug-selection-page.png",
          fullPage: true,
        });
        throw new Error(
          "Selection form not found - data loading might have failed",
        );
      }
    }

    console.log("📍 Looking for channel selection");

    // Try multiple selectors for channel dropdown
    const channelSelect = page
      .locator("#channel-select")
      .or(page.locator('select[id*="channel"]'))
      .or(page.locator("select").first());

    await expect(channelSelect).toBeVisible({ timeout: 5000 });
    console.log("✅ Channel selection dropdown found");

    console.log("📍 Selecting channel 2");
    await channelSelect.selectOption({ index: 2 }); // Select third option (Channel 2, index starts from 0)
    const selectedChannelValue = await channelSelect.inputValue();
    console.log("✅ Channel 2 selected, value:", selectedChannelValue);

    console.log("📍 Looking for TRC selection");
    const trcSelect = page
      .locator("#trc-select")
      .or(page.locator('select[id*="trc"]'))
      .or(page.locator("select").nth(1));

    await expect(trcSelect).toBeVisible({ timeout: 5000 });
    await trcSelect.selectOption({ index: 1 }); // Select first actual TRC (skip placeholder)
    const selectedTrcValue = await trcSelect.inputValue();
    console.log("✅ TRC selected, value:", selectedTrcValue);

    console.log("📍 Selecting segment 2");
    const segmentSelect = page
      .locator("#segment-select")
      .or(page.locator('select[id*="segment"]'))
      .or(page.locator("select").nth(2));

    await expect(segmentSelect).toBeVisible({ timeout: 5000 });
    await segmentSelect.selectOption({ index: 2 }); // Select third option (Segment 2, index starts from 0)
    const selectedSegmentValue = await segmentSelect.inputValue();
    console.log("✅ Segment 2 selected, value:", selectedSegmentValue);

    console.log("📍 Clicking plot button");

    // Wait a moment for selections to propagate
    await page.waitForTimeout(1000);

    // Check the button state
    const plotButton = page
      .locator("button")
      .filter({ hasText: /Plot Selected Data|Plot Data|Visualize/i });

    await expect(plotButton).toBeVisible({ timeout: 1000 });

    // Debug: Check if button is enabled
    const isEnabled = await plotButton.isEnabled();
    console.log("🔍 Plot button enabled:", isEnabled);

    if (!isEnabled) {
      // Wait a bit more and check again
      await page.waitForTimeout(3000);
      const isEnabledAfterWait = await plotButton.isEnabled();
      console.log("🔍 Plot button enabled after wait:", isEnabledAfterWait);

      if (!isEnabledAfterWait) {
        // Take a screenshot to debug the state
        await page.screenshot({
          path: "debug-disabled-button.png",
          fullPage: true,
        });
        console.log(
          "❌ Plot button remains disabled - selections may not be propagating properly",
        );
      }
    }

    await expect(plotButton).toBeEnabled({ timeout: 5000 });
    await plotButton.click();
    console.log("✅ Plot button clicked");

    console.log("📍 Waiting for visualization page");
    await expect(page).toHaveURL(/\/visualization/, { timeout: 5000 });
    console.log("✅ Successfully navigated to visualization page");

    console.log("📍 Waiting for chart to render");
    const chartContainer = page.locator(
      "#chart-container, .chart-container, svg",
    );
    await expect(chartContainer.first()).toBeVisible({ timeout: 5000 });
    console.log("✅ Chart rendered successfully");

    console.log("📍 Checking default zoom level selection");

    // Wait for zoom controls to be visible - now there are multiple, so target the first one
    const zoomControls = page.locator(".zoom-controls").first();
    await expect(zoomControls).toBeVisible({ timeout: 5000 });

    // Find the time span dropdown within the first zoom control
    const timeSpanSelect = zoomControls.locator("#zoomSelect-overview, #zoomSelect-zoom1").first();
    await expect(timeSpanSelect).toBeVisible({ timeout: 5000 });

    // Get all available options to understand what's generated
    const allOptions = await timeSpanSelect.locator("option").allTextContents();
    console.log("🔍 Available zoom levels:", allOptions);

    // Get the selected value and text
    const selectedValue = await timeSpanSelect.inputValue();
    const selectedOptionText = await timeSpanSelect
      .locator("option:checked")
      .textContent();

    console.log("🔍 Selected zoom level value:", selectedValue);
    console.log("🔍 Selected zoom level text:", selectedOptionText);

    // Check if 1 µs is available and selected
    const hasOneMicrosecond = allOptions.some((option) =>
      option.match(/1\s*(µs|μs|us|microsecond)/i),
    );

    if (hasOneMicrosecond) {
      // If 1µs is available, it should be selected
      expect(selectedOptionText).toMatch(/1\s*(µs|μs|us|microsecond)/i);
      console.log("✅ Correct default zoom level '1 microsecond' is selected");
    } else {
      // If 1µs is not available (due to data constraints), check that a reasonable default is selected
      // It should not be the smallest or largest level
      const selectedIndex = allOptions.indexOf(selectedOptionText);
      expect(selectedIndex).toBeGreaterThan(0); // Not the first (smallest)
      expect(selectedIndex).toBeLessThan(allOptions.length - 1); // Not the last (largest)
      console.log(
        "✅ Reasonable default zoom level selected (not smallest or largest):",
        selectedOptionText,
      );
    }

    console.log("📍 Checking if zoom rectangle is displayed");

    // Look for zoom rectangle in the SVG - target the first one (overview chart)
    const zoomRect = page.locator(".chart-rectangle, rect.chart-rectangle").first();
    await expect(zoomRect).toBeVisible({ timeout: 3000 });
    console.log("✅ Zoom rectangle is visible on the overview plot");

    // Zoom rectangle interaction tests
    console.log("📍 Testing zoom rectangle dragging");

    // Get initial position of the zoom rectangle
    const initialRect = await zoomRect.boundingBox();
    console.log("🔍 Initial zoom rectangle position:", initialRect);

    if (!initialRect) {
      throw new Error("Zoom rectangle not found or has no bounding box");
    }

    // Calculate target position for dragging (move to 16us position)
    // We'll move the rectangle horizontally by a significant amount
    const dragDistance = 150; // pixels to drag horizontally
    const targetX = initialRect.x + dragDistance;
    const targetY = initialRect.y; // Keep same vertical position

    console.log(`🔍 Dragging zoom rectangle from (${initialRect.x}, ${initialRect.y}) to (${targetX}, ${targetY})`);

    // Perform slow drag operation (2 seconds duration)
    await page.mouse.move(initialRect.x + initialRect.width / 2, initialRect.y + initialRect.height / 2);
    await page.mouse.down();
    await page.mouse.move(targetX, targetY, { steps: 20 }); // 20 steps over ~2 seconds
    await page.mouse.up();

    console.log("✅ Zoom rectangle drag completed");

    // Wait a moment for the chart to update
    await page.waitForTimeout(1000);

    // Check if rectangle position has changed
    const finalRect = await zoomRect.boundingBox();
    console.log("🔍 Final zoom rectangle position:", finalRect);

    if (!finalRect) {
      throw new Error("Zoom rectangle disappeared after dragging");
    }

    // Verify the rectangle has moved
    const movedDistance = Math.abs(finalRect.x - initialRect.x);
    expect(movedDistance).toBeGreaterThan(50); // Should have moved at least 50 pixels
    console.log(`✅ Zoom rectangle moved ${movedDistance}px horizontally`);

    // Test zoom rectangle width adjustment
    console.log("📍 Testing zoom rectangle width adjustment");

    // Look for zoom in/out buttons in the first zoom control
    const firstZoomControl = page.locator(".zoom-controls").first();
    const zoomInButton = firstZoomControl.locator("button").filter({ hasText: "➕ In" });
    await expect(zoomInButton).toBeVisible({ timeout: 3000 });

    // Get rectangle width before zoom in
    const widthBeforeZoom = finalRect.width;
    console.log("🔍 Rectangle width before zoom in:", widthBeforeZoom);

    // Click the "In" button to make rectangle narrower
    await zoomInButton.click();
    console.log("✅ Zoom In button clicked");

    // Wait for the change to take effect
    await page.waitForTimeout(1000);

    // Check if rectangle width has changed
    const rectAfterZoom = await zoomRect.boundingBox();
    if (!rectAfterZoom) {
      throw new Error("Zoom rectangle disappeared after zoom in");
    }

    const widthAfterZoom = rectAfterZoom.width;
    console.log("🔍 Rectangle width after zoom in:", widthAfterZoom);

    // Verify the rectangle became narrower (smaller width)
    expect(widthAfterZoom).toBeLessThan(widthBeforeZoom);
    console.log(`✅ Zoom rectangle width decreased from ${widthBeforeZoom}px to ${widthAfterZoom}px`);

    // Final verification
    console.log("🎉 Complete app flow test with zoom rectangle interactions passed!");
  });

  test("error handling: invalid URL", async ({ page }) => {
    console.log("🚀 Testing error handling with invalid URL");

    await page.goto("/");

    // Enter invalid URL
    const urlInput = page.locator('input[type="text"]');
    await urlInput.fill("https://invalid-url.com/nonexistent.zarr");

    // Try to load
    const loadButton = page.locator('button:has-text("Load Data")');
    await loadButton.click();

    // Wait for loading to start and then fail
    await page.waitForTimeout(2000);

    // Check for error message with multiple possible selectors
    const errorSelectors = [
      '.bg-red-50',
      '[class*="error"]',
      '.error',
      'text=/Error|Failed|Invalid/i'
    ];

    let errorFound = false;
    for (const selector of errorSelectors) {
      try {
        const element = page.locator(selector).first();
        await expect(element).toBeVisible({ timeout: 5000 });
        console.log(`✅ Error found with selector: ${selector}`);
        errorFound = true;
        break;
      } catch (e) {
        console.log(`❌ Error not found with selector: ${selector}`);
      }
    }

    if (!errorFound) {
      // Take a screenshot to debug
      await page.screenshot({
        path: "debug-error-handling.png",
        fullPage: true,
      });
      throw new Error("No error message found after loading invalid URL");
    }

    console.log("✅ Error handling test passed");
  });

  test("navigation: back to home from selection", async ({ page }) => {
    console.log("🚀 Testing navigation from selection back to home");

    // First load example data to get to selection page
    await page.goto("/");
    const copyButton = page.locator('button:has-text("Copy Example URL")');
    await copyButton.click();

    const loadButton = page.locator('button:has-text("Load Data")');
    await loadButton.click();

    await expect(page).toHaveURL(/\/selection/, { timeout: 5000 });

    // Look for "Load Different Dataset" or similar button
    const backButton = page
      .locator("button")
      .filter({ hasText: /Load Different|Try Different|Back|Home/i });

    await expect(backButton.first()).toBeVisible({ timeout: 5000 });
    await backButton.first().click();

    // Should return to home page
    await expect(page).toHaveURL(/\/$/, { timeout: 5000 });

    console.log("✅ Navigation test passed");
  });
});
