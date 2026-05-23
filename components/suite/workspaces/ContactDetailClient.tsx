"use client";

/**
 * Workspace wrapper for the contact-detail view. Rendered as children of the suite
 * layout's workspace area; the shell (sidebar, topbar, voice panel) is provided by the
 * layout. We don't impose any padding here because ContactDetail already manages its
 * own header band, content gutter, and scrolling within the .workspace scroll context.
 */

import ContactDetail, {
  type ContactDetailData,
  type ContactEvent,
} from "@/components/suite/ContactDetail";

export interface ContactDetailClientProps {
  contact: ContactDetailData;
  events: ContactEvent[];
}

export default function ContactDetailClient({ contact, events }: ContactDetailClientProps) {
  return <ContactDetail contact={contact} events={events} />;
}
