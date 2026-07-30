import { type Page, expect } from "@playwright/test";
import { E2E } from "./selectors";

export async function ensurePanelOpen(page: Page) {
  const panelToggle = page.getByTestId(E2E.panelToggle);
  await expect(panelToggle).toBeVisible();

  if ((await panelToggle.getAttribute("aria-expanded")) === "false") {
    await panelToggle.click();
    await expect(panelToggle).toHaveAttribute("aria-expanded", "true");
  }
}
