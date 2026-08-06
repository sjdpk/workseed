"use client";

import { Button } from "./Button";
import { Input } from "./Input";

export interface EmergencyContactInput {
  id?: string;
  name: string;
  relation?: string | null;
  phone?: string | null;
  altPhone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  isPrimary?: boolean;
}

/** Suggestions only — anything can be typed, including a relation not listed. */
const RELATIONS = [
  "Spouse",
  "Father",
  "Mother",
  "Son",
  "Daughter",
  "Brother",
  "Sister",
  "Grandparent",
  "Guardian",
  "Friend",
  "Neighbour",
  "Doctor",
  "Other",
];

export function emptyEmergencyContact(): EmergencyContactInput {
  return { name: "", relation: "", phone: "", altPhone: "", email: "", address: "", notes: "" };
}

/**
 * Repeatable emergency-contact rows. Only the name is required; a contact with
 * just a name and a relation is valid, and rows left blank are dropped on save.
 * Exactly one contact is the primary — ticking one unticks the rest.
 */
export function EmergencyContacts({
  contacts,
  onChange,
  disabled,
}: {
  contacts: EmergencyContactInput[];
  onChange: (next: EmergencyContactInput[]) => void;
  disabled?: boolean;
}) {
  const patch = (index: number, changes: Partial<EmergencyContactInput>) =>
    onChange(contacts.map((c, i) => (i === index ? { ...c, ...changes } : c)));

  const setPrimary = (index: number) =>
    onChange(contacts.map((c, i) => ({ ...c, isPrimary: i === index })));

  const remove = (index: number) => {
    const next = contacts.filter((_, i) => i !== index);
    // never leave the list without a primary
    if (next.length && !next.some((c) => c.isPrimary)) next[0] = { ...next[0], isPrimary: true };
    onChange(next);
  };

  return (
    <div className="space-y-4">
      <datalist id="contact-relations">
        {RELATIONS.map((r) => (
          <option key={r} value={r} />
        ))}
      </datalist>

      {contacts.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No contacts yet. Add whoever should be called first.
        </p>
      )}

      {contacts.map((contact, i) => (
        <div
          key={contact.id || i}
          className="space-y-4 rounded-md border border-gray-200 p-4 dark:border-gray-800"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="radio"
                name="primaryEmergencyContact"
                checked={!!contact.isPrimary || (contacts.length === 1 && i === 0)}
                onChange={() => setPrimary(i)}
                disabled={disabled}
                className="h-4 w-4"
              />
              Call first
            </label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              onClick={() => remove(i)}
            >
              Remove
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Name"
              value={contact.name}
              disabled={disabled}
              placeholder="Full name"
              onChange={(e) => patch(i, { name: e.target.value })}
            />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Relation
              </label>
              <Input
                list="contact-relations"
                value={contact.relation || ""}
                disabled={disabled}
                placeholder="Spouse, Father, Friend…"
                onChange={(e) => patch(i, { relation: e.target.value })}
              />
            </div>
            <Input
              label="Phone"
              value={contact.phone || ""}
              disabled={disabled}
              onChange={(e) => patch(i, { phone: e.target.value })}
            />
            <Input
              label="Another number (optional)"
              value={contact.altPhone || ""}
              disabled={disabled}
              onChange={(e) => patch(i, { altPhone: e.target.value })}
            />
            <Input
              label="Email (optional)"
              type="email"
              value={contact.email || ""}
              disabled={disabled}
              onChange={(e) => patch(i, { email: e.target.value })}
            />
            <Input
              label="Address (optional)"
              value={contact.address || ""}
              disabled={disabled}
              onChange={(e) => patch(i, { address: e.target.value })}
            />
          </div>
          <Input
            label="Notes (optional)"
            value={contact.notes || ""}
            disabled={disabled}
            placeholder="Speaks Nepali only, works nights…"
            onChange={(e) => patch(i, { notes: e.target.value })}
          />
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={() =>
          onChange([...contacts, { ...emptyEmergencyContact(), isPrimary: contacts.length === 0 }])
        }
      >
        Add contact
      </Button>
    </div>
  );
}

/** Read-only list for profile and employee view screens. */
export function EmergencyContactList({ contacts }: { contacts: EmergencyContactInput[] }) {
  if (!contacts.length) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">No emergency contacts on file</p>
    );
  }

  return (
    <ul className="space-y-3">
      {contacts.map((c, i) => (
        <li
          key={c.id || i}
          className="rounded-md border border-gray-200 p-3 text-sm dark:border-gray-800"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-gray-900 dark:text-white">{c.name}</span>
            {c.relation && <span className="text-gray-500 dark:text-gray-400">· {c.relation}</span>}
            {c.isPrimary && (
              <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                Call first
              </span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-gray-600 dark:text-gray-400">
            {c.phone && <a href={`tel:${c.phone}`}>{c.phone}</a>}
            {c.altPhone && <a href={`tel:${c.altPhone}`}>{c.altPhone}</a>}
            {c.email && <a href={`mailto:${c.email}`}>{c.email}</a>}
          </div>
          {(c.address || c.notes) && (
            <p className="mt-1 text-gray-500 dark:text-gray-400">
              {[c.address, c.notes].filter(Boolean).join(" · ")}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}
