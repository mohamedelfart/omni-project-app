# QuickRent API Surface (v1)

Base URL: /api/v1
Swagger: /api/v1/docs

## Auth

- POST /auth/register
- POST /auth/login
- POST /auth/phone/request-otp
- POST /auth/phone/verify-otp
- POST /auth/refresh
- POST /auth/forgot-password
- POST /auth/reset-password

## Users

- GET /users/me

## Properties

- GET /properties/search
- POST /properties

## Viewing

- POST /viewing/requests

## Booking

- POST /booking/reservations

## Payments

- POST /payments/intent

## Services

- POST /services/orders

## Insurance

- POST /insurance/plans/subscribe

## Rewards

- GET /rewards/wallet

## Community

- POST /community/posts

## Notifications

- POST /notifications/broadcast
