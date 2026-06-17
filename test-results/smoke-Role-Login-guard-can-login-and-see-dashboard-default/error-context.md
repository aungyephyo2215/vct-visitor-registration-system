# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: smoke.spec.ts >> Role Login >> guard can login and see dashboard
- Location: tests/e2e/smoke.spec.ts:39:9

# Error details

```
Test timeout of 30000ms exceeded.
```

# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e3]:
    - generic [ref=e4]:
      - img [ref=e6]
      - generic [ref=e12]: Sign In
      - generic [ref=e13]: Enter your credentials to access the system
    - generic [ref=e14]:
      - generic [ref=e15]:
        - generic [ref=e16]:
          - generic [ref=e17]: Email
          - textbox "Email" [active] [ref=e18]:
            - /placeholder: admin@vrs.com
        - generic [ref=e19]:
          - generic [ref=e20]: Password
          - generic [ref=e21]:
            - textbox "Password" [ref=e22]:
              - /placeholder: ••••••••
              - text: Guard123!
            - button [ref=e23]:
              - img
        - button "Sign In" [ref=e24]
      - link "Back to home" [ref=e26] [cursor=pointer]:
        - /url: /
  - region "Notifications alt+T"
  - button "Open Next.js Dev Tools" [ref=e32] [cursor=pointer]:
    - img [ref=e33]
  - alert [ref=e36]
```