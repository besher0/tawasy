# Mobile (Expo RN)

## Role-Based Screens

- Shared: Profile
- Shop roles: New Order, Incoming Orders, Next-Day Essentials
- Factory/Admin roles: Incoming Orders, Production Kanban, Analytics

## Scripts

```bash
npm run start
npm run start:device
npm run typecheck
npm run test
```

`start:device` disables Node's automatic IPv4/IPv6 family selection, which can
time out while a VPN is active.

## Environment

- `EXPO_PUBLIC_API_BASE_URL`
