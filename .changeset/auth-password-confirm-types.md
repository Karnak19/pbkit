---
"@karnak19/pbkit": minor
---

Generate the password-confirmation fields that PocketBase's auth API requires (#53).

For auth collections, the generated request types now include:

- `Create`: a required `passwordConfirm: string` alongside `password`.
- `Update`: an optional `oldPassword?: string` (and `passwordConfirm?` via `Partial<Create>`), for self-service password changes.

```ts
export type UsersCreate = {
  password: string
  passwordConfirm: string
  // ...
}
export type UsersUpdate = Partial<UsersCreate> & {
  oldPassword?: string
}
```

`createUser({ email, password, passwordConfirm })` now typechecks without a cast, and password-change updates accept `{ oldPassword, password, passwordConfirm }`. Non-auth collections are unaffected.
