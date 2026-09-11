import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const clients = await prisma.client.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        sessionNotes: { orderBy: { createdAt: "desc" }, take: 20 },
        appointments: { orderBy: { startsAt: "desc" }, take: 10 },
      },
    });
    return NextResponse.json({ clients });
  } catch {
    return NextResponse.json({
      clients: [],
      notice: "Database unavailable. Connect Prisma and run db push.",
    });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { fullName, email, phone, timezone, birthDate, birthTime, birthPlace, vastuFloorPlan } = body ?? {};

  if (!fullName || !email) {
    return NextResponse.json({ error: "fullName and email are required" }, { status: 400 });
  }

  try {
    const client = await prisma.client.create({
      data: {
        fullName,
        email,
        phone,
        timezone: timezone ?? "Asia/Kolkata",
        birthDate: birthDate ? new Date(birthDate) : null,
        birthTime,
        birthPlace,
        vastuFloorPlan,
      },
    });
    return NextResponse.json({ client }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Unable to create client", detail: error instanceof Error ? error.message : "unknown" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { id, note, vastuFloorPlan, birthTime, birthPlace, birthDate } = body ?? {};
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  try {
    const client = await prisma.client.update({
      where: { id },
      data: {
        vastuFloorPlan,
        birthTime,
        birthPlace,
        birthDate: birthDate ? new Date(birthDate) : undefined,
      },
    });

    if (typeof note === "string" && note.trim()) {
      await prisma.sessionNote.create({
        data: { clientId: id, body: note.trim(), authoredBy: session.user?.email ?? "admin" },
      });
    }

    return NextResponse.json({ client });
  } catch (error) {
    return NextResponse.json(
      { error: "Unable to update client", detail: error instanceof Error ? error.message : "unknown" },
      { status: 500 }
    );
  }
}
