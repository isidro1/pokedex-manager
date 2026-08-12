import { expect, test } from "@playwright/test";

test("home renderiza portada inicial", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "PokeDex Manager" })).toBeVisible();
});