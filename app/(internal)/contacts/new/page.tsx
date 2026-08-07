import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import NewContactForm from "./NewContactForm";

export default function NewContactPage() {
  async function createContact(formData: FormData) {
    "use server";
    const name    = (formData.get("name") as string).trim();
    const type    = formData.get("type") as string;
    const phone   = (formData.get("phone") as string).trim() || null;
    const email   = (formData.get("email") as string).trim() || null;
    const company = (formData.get("company") as string).trim() || null;
    const notes   = (formData.get("notes") as string).trim() || null;
    if (!name) return;
    await db.contact.create({ data: { name, type: type as any, phone, email, company, notes } });
    redirect("/contacts");
  }

  return <NewContactForm action={createContact} />;
}
