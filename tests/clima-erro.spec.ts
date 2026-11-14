import { test, expect } from '@playwright/test'
import { comTalhaoSalvo } from './fixtures/talhao'
import { CLIMA_T07 } from './fixtures/clima'
test('falha, slider ativo e nova tentativa', async ({ page }) => {
 await comTalhaoSalvo(page)
 let falha = true
 await page.route(/\/api\/clima\/decendios/, r => falha ? r.fulfill({ status: 500, json: {} }) : r.fulfill({ json: CLIMA_T07 }))
 await page.goto('/')
 await expect(page.getByRole('alert')).toBeVisible()
 await expect(page.locator('.vg')).toContainText('Sem dado')
 const slider = page.getByRole('slider')
 await slider.focus(); await page.keyboard.press('End')
 await expect(slider).toHaveValue('35')
 falha = false
 await page.getByRole('button', { name: 'Tentar de novo' }).click()
 await expect(page.getByRole('alert')).toHaveCount(0)
 await expect(page.locator('.vg')).not.toContainText('Sem dado')
})
