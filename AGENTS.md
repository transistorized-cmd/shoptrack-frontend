# Agent Instructions: Frontend Test Authoring

Use this file when creating or updating Vue/TypeScript tests with Vitest.

## Before You Start
- Understand the component/service: props, emitted events, side-effects (HTTP, storage), and accessibility surface (roles/labels) before testing.
- API & Data Reference: consult `API_DOCUMENTATION.md`, Swagger UI (`http://localhost:5000/api/docs` when API is running), and `ShopTrack_API.postman_collection.json` to confirm endpoints and payloads. Prefer generating/deriving TS types from OpenAPI and reusing `src/types` to keep mocks aligned.

## Create Tests Prompt
When asked to create frontend tests:
- Use Vitest + @testing-library/vue; prefer user-centric assertions.
- Place specs beside code as `ComponentName.spec.ts`.
- Avoid implementation details; interact via `screen` and role/label text.
- Use `@testing-library/user-event` for interactions; await UI updates.
- Mock HTTP via MSW; avoid mocking Axios directly where possible.
- Cover rendering, states, edge cases, and error paths.
 - Use API docs/OpenAPI to shape request/response fixtures and edge cases; keep mocks consistent with server contracts.

## Examples
- Commands: `npm run test`, `npm run test:coverage`.
- Sample test skeleton:
  ```ts
  import { render, screen } from '@testing-library/vue'
  import userEvent from '@testing-library/user-event'
  import MyComponent from './MyComponent.vue'
  test('submits form when valid', async () => {
    render(MyComponent)
    await userEvent.type(screen.getByLabelText(/name/i), 'Alice')
    await userEvent.click(screen.getByRole('button', { name: /save/i }))
    expect(await screen.findByText(/saved/i)).toBeInTheDocument()
  })
  ```

- MSW HTTP mock setup:
  ```ts
  import { http, HttpResponse } from 'msw'
  import { setupServer } from 'msw/node'

  export const server = setupServer(
    http.get('/api/receipts', () => HttpResponse.json([{ id: 1 }]))
  )

  beforeAll(() => server.listen())
  afterEach(() => server.resetHandlers())
  afterAll(() => server.close())
  ```

## Linting & Conventions
- Run `npm run lint` and `npm run format` before committing.
- Use Composition API and explicit types; keep tests deterministic.
