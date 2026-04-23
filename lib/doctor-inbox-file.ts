import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type ServerDoctorInboxItem = {
  id: string;
  doctorId: string;
  doctorName: string;
  clinicId?: string;
  bookingId: string;
  patientCode: string;
  patientName: string;
  patientAge: number;
  patientGender: string;
  message: string;
  reason: string;
  symptoms: string;
  appointmentDate: string;
  appointmentTime: string;
  specialty: string;
  hospitalName: string;
  handoffRoute: string;
  consultationRoute: string;
  patientRecord: Record<string, unknown>;
  createdAt: string;
  isRead: boolean;
  status: "pending" | "added";
};

type CreateDoctorInboxItemInput = Omit<
  ServerDoctorInboxItem,
  "id" | "createdAt" | "isRead" | "status"
>;

const DOCTOR_INBOX_DIR = path.join(process.cwd(), "data");
const DOCTOR_INBOX_FILE = path.join(DOCTOR_INBOX_DIR, "doctor-inbox.json");

async function ensureDoctorInboxFile() {
  await mkdir(DOCTOR_INBOX_DIR, { recursive: true });

  try {
    await readFile(DOCTOR_INBOX_FILE, "utf8");
  } catch {
    await writeFile(DOCTOR_INBOX_FILE, "[]", "utf8");
  }
}

async function readAllDoctorInboxItems() {
  await ensureDoctorInboxFile();

  try {
    const raw = await readFile(DOCTOR_INBOX_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ServerDoctorInboxItem[]) : [];
  } catch {
    return [];
  }
}

async function writeAllDoctorInboxItems(items: ServerDoctorInboxItem[]) {
  await ensureDoctorInboxFile();
  await writeFile(DOCTOR_INBOX_FILE, JSON.stringify(items, null, 2), "utf8");
}

export async function listDoctorInboxItems(doctorId?: string) {
  const items = await readAllDoctorInboxItems();
  const filteredItems = doctorId ? items.filter((item) => item.doctorId === doctorId) : items;

  return filteredItems.sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  );
}

export async function createDoctorInboxItem(input: CreateDoctorInboxItemInput) {
  const items = await readAllDoctorInboxItems();
  const existingIndex = items.findIndex(
    (item) => item.bookingId === input.bookingId && item.doctorId === input.doctorId
  );

  if (existingIndex >= 0) {
    const existingItem = items[existingIndex];
    const nextItem: ServerDoctorInboxItem = {
      ...existingItem,
      ...input,
      patientRecord: input.patientRecord,
    };
    items[existingIndex] = nextItem;
    await writeAllDoctorInboxItems(items);
    return nextItem;
  }

  const nextItem: ServerDoctorInboxItem = {
    ...input,
    id: `DIN-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
    createdAt: new Date().toISOString(),
    isRead: false,
    status: "pending",
  };

  items.unshift(nextItem);
  await writeAllDoctorInboxItems(items);
  return nextItem;
}

export async function updateDoctorInboxItem(
  id: string,
  updates: Partial<Pick<ServerDoctorInboxItem, "isRead" | "status">>
) {
  const items = await readAllDoctorInboxItems();
  let updatedItem: ServerDoctorInboxItem | null = null;

  const nextItems = items.map((item) => {
    if (item.id !== id) return item;
    updatedItem = { ...item, ...updates };
    return updatedItem;
  });

  if (!updatedItem) {
    return null;
  }

  await writeAllDoctorInboxItems(nextItems);
  return updatedItem;
}

export async function deleteDoctorInboxItem(id: string) {
  const items = await readAllDoctorInboxItems();
  const nextItems = items.filter((item) => item.id !== id);

  if (nextItems.length === items.length) {
    return false;
  }

  await writeAllDoctorInboxItems(nextItems);
  return true;
}

export async function markAllDoctorInboxItemsRead(doctorId: string) {
  const items = await readAllDoctorInboxItems();
  const nextItems = items.map((item) =>
    item.doctorId === doctorId ? { ...item, isRead: true } : item
  );
  await writeAllDoctorInboxItems(nextItems);

  return nextItems.filter((item) => item.doctorId === doctorId);
}
