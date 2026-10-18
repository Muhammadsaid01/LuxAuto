import Errors, { HttpCode, Message } from "../Errors";

function text(input: Record<string, unknown>, key: string, required = false): string | undefined {
  const value = input[key];
  if (value === undefined && !required) return undefined;
  if (typeof value !== "string" || (required && !value.trim()) || value.length > 2000) {
    throw new Errors(HttpCode.BAD_REQUEST, Message.SOMETHING_WENT_WRONG);
  }
  return value;
}

// Never copy request bodies into a persistence operation.
export function signupFields(input: Record<string, unknown>) {
  return {
    memberNick: text(input, "memberNick", true)!,
    memberPhone: text(input, "memberPhone", true)!,
    memberPassword: text(input, "memberPassword", true)!,
  };
}

export function profileFields(input: Record<string, unknown>) {
  const result: Record<string, string> = {};
  for (const key of ["memberNick", "memberPhone", "memberAddress", "memberDesc"]) {
    const value = text(input, key, key in input && ["memberNick", "memberPhone"].includes(key));
    if (value !== undefined) result[key] = value;
  }
  return result;
}
