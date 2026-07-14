# Error Handling

Standard Response

{
"success": false,
"message": "Invalid Request",
"error_code": "BAD_REQUEST"
}

---

400

BAD_REQUEST

Invalid Input

---

401

UNAUTHORIZED

Invalid Token

---

403

FORBIDDEN

Permission Denied

---

404

NOT_FOUND

Resource Not Found

---

409

CONFLICT

Duplicate Record

---

429

TOO_MANY_REQUESTS

Rate Limit Exceeded

---

500

INTERNAL_SERVER_ERROR

Unexpected Server Error
