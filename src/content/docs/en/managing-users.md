# Managing users

Admins (and, for developer and viewer roles, managers) assign roles in **Users** in the Dock.

## Give someone a role

1. The person signs up first; they start as a viewer.
2. In **Users**, choose **Add user role**.
3. Enter their user ID (it starts with `user_`) and email, and pick a role.

To change a role later, pick a new one in the list. **Remove role** takes the role away.

## Rules

- Managers can assign developer and viewer only, and cannot change an admin's or another manager's role.
- Only admins can change their own role.
- The email shown for each user comes from their account, not from what was typed.

For a self-hosted workspace, the first admin is set from the command line:

```bash
npm run user:set-role -- you@example.com admin
```

## See also

- [Accounts and roles](/docs/accounts-and-roles)
