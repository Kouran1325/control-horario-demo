import { NextResponse } from "next/server";

export function ok(data: any) {
  return NextResponse.json(data, { status: 200 });
}

export function badRequest(message: string) {
  return NextResponse.json({ message }, { status: 400 });
}

export function unauthorized(message = "Unauthorized") {
  return NextResponse.json({ message }, { status: 401 });
}

export function forbidden(message = "Forbidden") {
  return NextResponse.json({ message }, { status: 403 });
}

export function serverError(message = "Internal Server Error") {
  return NextResponse.json({ message }, { status: 500 });
}