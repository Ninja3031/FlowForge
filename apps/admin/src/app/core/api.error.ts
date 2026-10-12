// One error shape for the whole app, so pages can just show `error.message`
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body?: unknown,
  ) {
    super(message);
  }
}