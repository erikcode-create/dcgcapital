

## Fix: Move email and clean up duplicate deal

The email "Fwd: Dealer Alchemist deck" (`19c4b1a1`) is currently linked to the duplicate deal (`85ce1ec6`). I'll:

1. **Update the `deal_emails` record** (`818c3274`) to point to the correct deal (`723d41ed`) instead of the duplicate
2. **Delete the duplicate "Dealer Alchemist" deal** (`85ce1ec6`) since it has no other data

This is a data fix using two database operations — no code changes needed.

