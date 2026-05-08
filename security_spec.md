# Security Spec - Namma-Santhe Ledger

## Data Invariants
1. A transaction cannot exist without a valid customer ID belonging to the authenticated user.
2. The user can only access their own user folder `/users/{userId}/**`.
3. Amounts in transactions must be positive numbers.
4. Transaction types are strictly 'credit' or 'payment'.
5. Customer `totalDue` must reflect the sum of transactions (enforced by batch logic).

## The Dirty Dozen Payloads
1. **Identity Spoofing**: Attempt to write to `/users/other-uid/customers/c1`.
2. **Resource Poisoning**: Create a customer with a 1MB name.
3. **Negative Credit**: Create a transaction with amount `-500`.
4. **Invalid Type**: Create a transaction with type `'gift'`.
5. **Orphaned Transaction**: Create a transaction for a non-existent `customerId`.
6. **Unauthorized Read**: Attempt to list `/users/other-uid/customers`.
7. **Bypassing Verification**: Write data when `email_verified` is false (if using verified emails).
8. **Shadow Field**: Add `isVerified: true` to a customer profile.
9. **Mutation of Immutables**: Change `createdAt` on an existing customer.
10. **State Shortcut**: Directly update `totalDue` on a customer without a transaction (if we enforce batch).
11. **Junk ID**: Use `../..` or special characters in a document ID.
12. **PII Leak**: Attempt to read another user's phone number.

## Test Cases
- [ ] Deny write to other user's path.
- [ ] Deny transaction with negative amount.
- [ ] Deny transaction without valid customer existence check (existsAfter).
- [ ] Deny update to `createdAt`.
- [ ] Deny list query without user filter.
