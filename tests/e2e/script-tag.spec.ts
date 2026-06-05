import { expect, test } from '@playwright/test'

interface ScriptTagChatRequest {
  appId: string
  message: {
    content: string
    parts: Array<
      | {
          type: 'text'
          text: string
        }
      | {
          type: 'file'
          url: string
          name: string
          size?: number
          mediaType?: string
        }
    >
  }
  participant: {
    id: string
    kind: string
  }
}

test('script tag bundle mounts the widget inside shadow DOM isolation', async ({
  page,
}) => {
  await page.goto('/script-tag.html')

  const container = page.locator('[data-lee-chat-container="true"]')

  await expect(container).toHaveCount(1)
  await expect(page.getByText('Welcome from script tag.')).toBeVisible()

  await expect(
    container.evaluate((element) => {
      return {
        hasShadowRoot: Boolean(element.shadowRoot),
        hasLightDomWidgetRoot: Boolean(
          element.querySelector('[data-testid="lee-chat-root"]'),
        ),
        hasShadowWidgetRoot: Boolean(
          element.shadowRoot?.querySelector('[data-testid="lee-chat-root"]'),
        ),
        hasShadowStyle: Boolean(
          element.shadowRoot?.querySelector('style')?.textContent?.includes(
            '.lee-chat-root',
          ),
        ),
      }
    }),
  ).resolves.toEqual({
    hasShadowRoot: true,
    hasLightDomWidgetRoot: false,
    hasShadowWidgetRoot: true,
    hasShadowStyle: true,
  })
})

test('script tag bundle sends uploaded attachment parts', async ({ page }) => {
  let requestBody: ScriptTagChatRequest | undefined

  await page.route('**/api/chat', async (route) => {
    requestBody = JSON.parse(
      route.request().postData() ?? '{}',
    ) as ScriptTagChatRequest

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        message: {
          id: 'assistant-e2e-attachment-response',
          content: 'Attachment received',
          createdAt: new Date().toISOString(),
        },
      }),
    })
  })

  await page.goto('/script-tag.html')

  await page.getByLabel('Attach file').setInputFiles({
    name: 'script-tag-manual.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('manual'),
  })

  await expect(page.getByText('script-tag-manual.pdf')).toBeVisible()

  await page.getByLabel('Message').fill('Please review this file')
  await page.getByRole('button', { name: 'Send' }).click()

  await expect.poll(() => requestBody).toBeDefined()
  await expect(page.getByText('Attachment received')).toBeVisible()

  expect(requestBody).toMatchObject({
    message: {
      content: 'Please review this file',
      parts: [
        {
          type: 'text',
          text: 'Please review this file',
        },
        {
          type: 'file',
          url: '/uploads/script-tag-manual.pdf',
          name: 'script-tag-manual.pdf',
          mediaType: 'application/pdf',
        },
      ],
    },
  })
})

test('script tag bundle sends a message through the configured endpoint', async ({
  page,
}) => {
  let requestBody: ScriptTagChatRequest | undefined

  await page.route('**/api/chat', async (route) => {
    requestBody = JSON.parse(
      route.request().postData() ?? '{}',
    ) as ScriptTagChatRequest

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        message: {
          id: 'assistant-e2e-response',
          content: `Echo: ${requestBody.message.content}`,
          createdAt: new Date().toISOString(),
        },
      }),
    })
  })

  await page.goto('/script-tag.html')

  await page.getByLabel('Message').fill('Hello from e2e')
  await page.getByRole('button', { name: 'Send' }).click()

  await expect.poll(() => requestBody).toBeDefined()
  await expect(page.getByText('Hello from e2e', { exact: true })).toBeVisible()
  await expect(page.getByText('Echo: Hello from e2e')).toBeVisible()

  expect(requestBody).toMatchObject({
    appId: 'script-tag-e2e',
    message: {
      content: 'Hello from e2e',
    },
    participant: {
      id: 'visitor-script-tag-e2e',
      kind: 'user',
    },
  })
})
