import { db } from "@/lib/db";
import ContactsClient from "./ContactsClient";

export const dynamic = "force-dynamic";

export default async function ContactsPage() {
  const contacts = await db.contact.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return <ContactsClient contacts={contacts} />;
}
