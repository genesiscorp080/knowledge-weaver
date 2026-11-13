# Architecture rules

- Load document metadata at sign-in and fetch each document body on demand through DocumentContext; large books must not delay library display.
- Key account data loading by user ID, cancel stale requests, and deduplicate document-body requests; token refreshes must not reload the library or leak data between accounts.