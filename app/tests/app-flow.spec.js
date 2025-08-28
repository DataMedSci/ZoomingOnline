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

    // Step 1: Open main page
    console.log("📍 Step 1: Opening main page");
    await page.goto("/");
    await expect(page).toHaveTitle(/ZoomingOnline/);
    console.log("✅ Main page loaded successfully");

    // Step 2: Click "Copy Example URL"
    console.log("📍 Step 2: Testing Copy Example URL");
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

    // Step 3: Click "Load Data"
    console.log("📍 Step 3: Loading data");
    const loadButton = page.locator('button:has-text("Load Data")');
    await expect(loadButton).toBeVisible();
    await loadButton.click();

    // Step 4: Check redirection to selection route
    console.log("📍 Step 4: Checking redirection to selection");
    await expect(page).toHaveURL(/\/selection/, { timeout: 15000 });
    console.log("✅ Successfully redirected to selection page");

    // Wait for data to load
    await page.waitForTimeout(3000);

    // Step 5: Check if dataset information is visible
    console.log("📍 Step 5: Checking dataset information");

    // Look for dataset info container
    const datasetInfoSection = page.locator(".dataset-info");
    await expect(datasetInfoSection).toBeVisible({ timeout: 10000 });
    console.log("✅ Dataset information section is visible");

    // Step 6: Check if dropdown options are populated
    console.log("📍 Step 6: Checking dropdown population");

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

      // Try again after waiting
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

    // Step 7: Look for channel selection dropdown
    console.log("📍 Step 7: Looking for channel selection");

    // Try multiple selectors for channel dropdown
    const channelSelect = page
      .locator("#channel-select")
      .or(page.locator('select[id*="channel"]'))
      .or(page.locator("select").first());

    await expect(channelSelect).toBeVisible({ timeout: 5000 });
    console.log("✅ Channel selection dropdown found");

    // Step 8: Select channel 2 (second item)
    console.log("📍 Step 8: Selecting channel 2");
    await channelSelect.selectOption({ index: 2 }); // Select third option (Channel 2, index starts from 0)
    const selectedChannelValue = await channelSelect.inputValue();
    console.log("✅ Channel 2 selected, value:", selectedChannelValue);

    // Step 9: Look for TRC selection
    console.log("📍 Step 9: Looking for TRC selection");
    const trcSelect = page
      .locator("#trc-select")
      .or(page.locator('select[id*="trc"]'))
      .or(page.locator("select").nth(1));

    await expect(trcSelect).toBeVisible({ timeout: 5000 });
    await trcSelect.selectOption({ index: 1 }); // Select first actual TRC (skip placeholder)
    const selectedTrcValue = await trcSelect.inputValue();
    console.log("✅ TRC selected, value:", selectedTrcValue);

    // Step 10: Select segment 2 (second item)
    console.log("📍 Step 10: Selecting segment 2");
    const segmentSelect = page
      .locator("#segment-select")
      .or(page.locator('select[id*="segment"]'))
      .or(page.locator("select").nth(2));

    await expect(segmentSelect).toBeVisible({ timeout: 5000 });
    await segmentSelect.selectOption({ index: 2 }); // Select third option (Segment 2, index starts from 0)
    const selectedSegmentValue = await segmentSelect.inputValue();
    console.log("✅ Segment 2 selected, value:", selectedSegmentValue);

    // Step 11: Click plot button
    console.log("📍 Step 11: Clicking plot button");

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

    // Step 12: Wait for visualization page
    console.log("📍 Step 12: Waiting for visualization page");
    await expect(page).toHaveURL(/\/visualization/, { timeout: 5000 });
    console.log("✅ Successfully navigated to visualization page");

    // Step 13: Wait for chart to render
    console.log("📍 Step 13: Waiting for chart to render");
    const chartContainer = page.locator(
      "#chart-container, .chart-container, svg",
    );
    await expect(chartContainer.first()).toBeVisible({ timeout: 5000 });
    console.log("✅ Chart rendered successfully");

    // Step 14: Check if the correct default zoom level is selected
    console.log("📍 Step 14: Checking default zoom level selection");

    // Wait for zoom controls to be visible
    const zoomControls = page.locator(".zoom-controls");
    await expect(zoomControls).toBeVisible({ timeout: 5000 });

    // Find the time span dropdown
    const timeSpanSelect = page.locator("#zoomSelect");
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

    // Step 15: Check if zoom rectangle is visible on the overview plot
    console.log("📍 Step 15: Checking if zoom rectangle is displayed");

    // Look for zoom rectangle in the SVG
    const zoomRect = page.locator(".draggable-rect, rect.draggable-rect");
    await expect(zoomRect).toBeVisible({ timeout: 3000 });
    console.log("✅ Zoom rectangle is visible on the overview plot");

    // Final verification
    console.log("🎉 Complete app flow test passed!");
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

    // Should show error message
    const errorMessage = page.locator('.error, .bg-red-50, [class*="error"]');
    await expect(errorMessage.first()).toBeVisible({ timeout: 5000 });

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
