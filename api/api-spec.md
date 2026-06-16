# API Specification

Base URL

/api/v1

---

## Authentication

POST /auth/login

Request

{
  "email":"admin@example.com",
  "password":"password"
}

Response

{
  "access_token":"xxxxx",
  "refresh_token":"xxxxx"
}

---

## Visitors

GET /visitors

Create Visitor

POST /visitors

Request

{
  "name":"John",
  "phone":"091234567",
  "nrc":"12/ABC(N)123456"
}

---

GET /visitors/:id

---

PUT /visitors/:id

---

DELETE /visitors/:id

---

## Visits

POST /visits

GET /visits

GET /visits/:id

---

## QR

POST /qr/generate

GET /qr/:token

---

## Check In

POST /checkin

---

## Check Out

POST /checkout

---

## Reports

GET /reports/daily

GET /reports/monthly

GET /reports/frequent-visitors