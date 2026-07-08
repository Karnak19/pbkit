---
"@karnak19/pbkit": patch
---

Make `redirectUrl` optional in generated `auth*WithOAuth2` functions, matching PocketBase v0.39.4 which dropped the required `redirectURL` validator from `authWithOAuth2Code()`.
