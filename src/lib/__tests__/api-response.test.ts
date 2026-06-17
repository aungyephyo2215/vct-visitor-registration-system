import { describe, it, expect } from "vitest";
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
  validationErrorResponse,
} from "../api-response";

describe("successResponse", () => {
  it("returns 200 by default with success:true wrapper", async () => {
    const res = successResponse({ id: "abc" });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ success: true, data: { id: "abc" } });
  });

  it("returns custom status when provided", () => {
    const res = successResponse({ id: "abc" }, 201);
    expect(res.status).toBe(201);
  });
});

describe("errorResponse", () => {
  it("returns 400 by default", async () => {
    const res = errorResponse("Bad request");
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.message).toBe("Bad request");
  });

  it("includes details when provided", async () => {
    const res = errorResponse("Validation failed", 422, [{ field: "name" }]);
    const body = await res.json();
    expect(body.error.details).toEqual([{ field: "name" }]);
  });

  it("omits details key when no details provided", async () => {
    const res = errorResponse("Oops");
    const body = await res.json();
    expect(body.error).not.toHaveProperty("details");
  });
});

describe("unauthorizedResponse", () => {
  it("returns 401", async () => {
    const res = unauthorizedResponse();
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.message).toBe("Unauthorized");
  });

  it("accepts custom message", async () => {
    const res = unauthorizedResponse("No token");
    const body = await res.json();
    expect(body.error.message).toBe("No token");
  });
});

describe("forbiddenResponse", () => {
  it("returns 403", async () => {
    const res = forbiddenResponse();
    expect(res.status).toBe(403);
  });
});

describe("notFoundResponse", () => {
  it("returns 404", async () => {
    const res = notFoundResponse();
    expect(res.status).toBe(404);
  });
});

describe("validationErrorResponse", () => {
  it("returns 422 with structured error", async () => {
    const errors = [{ field: "name", message: "Required" }];
    const res = validationErrorResponse(errors);
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error.message).toBe("Validation failed");
    expect(body.error.details).toEqual(errors);
  });
});
