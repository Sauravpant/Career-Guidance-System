import { AppError } from "../../utils/app-error";
describe("AppError", () => {
  it("is an instance of Error", () => {

    const err = new AppError(400, "Bad request");
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AppError);
  });
  it("sets statusCode correctly", () => {

    const err = new AppError(404, "Not found");
    expect(err.statusCode).toBe(404);
  });
  it("sets message correctly", () => {

    const err = new AppError(500, "Internal error");
    expect(err.message).toBe("Internal error");
  });
  it("defaults success to false", () => {

    const err = new AppError(400, "Bad");
    expect(err.success).toBe(false);
  });
  it("defaults data to null", () => {

    const err = new AppError(400, "Bad");
    expect(err.data).toBeNull();
  });
  it("defaults errors to empty array", () => {

    const err = new AppError(400, "Bad");
    expect(err.errors).toEqual([]);
  });
  it("stores custom errors array", () => {

    const err = new AppError(422, "Validation error", [
      { field: "email", msg: "Invalid" },
    ]);
    expect(err.errors).toHaveLength(1);
    expect(err.errors[0].field).toBe("email");
  });
  it("captures a stack trace", () => {

    const err = new AppError(500, "Oops");
    expect(err.stack).toBeDefined();
    expect(err.stack).toContain("AppError");
  });
  it("uses provided stack when given", () => {

    const customStack = "custom stack trace";
    const err = new AppError(500, "Oops", [], customStack);
    expect(err.stack).toBe(customStack);
  });
  it("common HTTP status code variants work correctly", () => {

    const codes = [400, 401, 403, 404, 409, 422, 500, 503];

    for (const code of codes) {

      const err = new AppError(code, `Error ${code}`);
      expect(err.statusCode).toBe(code);
    }

  });
});
