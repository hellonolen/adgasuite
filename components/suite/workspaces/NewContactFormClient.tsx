"use client";

/**
 * Workspace wrapper for the new-contact form. Rendered as children of the suite layout's
 * workspace area. The shell (sidebar, topbar, voice panel) is provided by the layout.
 */

import NewContactForm from "@/app/suite/contacts/new/new-contact-form";

export default function NewContactFormClient() {
  return <NewContactForm />;
}
