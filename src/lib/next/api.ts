// 抛错
import { Err, errors, HttpError } from "@/lib/error";
import type { NextApiHandler, NextApiResponse } from "next";
export type ApiHandler<T> = NextApiHandler<T | Err>;
export function handleApiRouteError({
  res,
  err,
}: {
  res: NextApiResponse<Err>;
  err: unknown;
}) {
    // 400
  if (err instanceof Error) {
    const status = 400;
    const { message } = errors[status];
    res.status(status).json({ status, message });
    return;
  }
  //
  if (err instanceof HttpError) {
    const { status, message } = err.serialize();
    res.status(status).json({ status, message });
    return;
  }

    // 500
  const status = 500;
  const { message } = errors[status];
  res.status(status).json({ status, message });
}

// 405
export function handleNotAllowed(res: NextApiResponse<Err>) {
  const status = 405;
  const { message } = errors[status];
  res.status(status).json({ status, message });
}
