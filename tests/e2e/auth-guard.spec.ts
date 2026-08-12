import { expect, test } from "@playwright/test";

test("redirecciona rutas privadas al login cuando no hay sesion", async ({ page }) => {
  await page.goto("/dashboard");

  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole("heading", { name: "Iniciar sesion" })).toBeVisible();
});
