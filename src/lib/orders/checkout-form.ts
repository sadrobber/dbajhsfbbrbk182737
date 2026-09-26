import { z } from "zod";
import { supplies } from "@/lib/data/schema";

/**
 * The checkout form, checked the same way in the browser and on the server.
 * Error messages are field names; the form translates them (Cart.errors.<field>).
 */
export const checkoutFormSchema = z.object({
  firstName: z.string().trim().min(1, "firstName").max(60, "firstName"),
  lastName: z.string().trim().min(1, "lastName").max(60, "lastName"),
  email: z.email("email").max(120, "email"),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9 ().-]{6,24}$/, "phone"),
  /** A served town (Local.towns.<key>) or "other". */
  town: z.string().regex(/^[a-z-]{1,40}$/, "town"),
  marketingOptIn: z.boolean(),
  /** What the customer saw when submitting: the order is refused if it changed meanwhile. */
  expectedSupply: z.enum(supplies),
  expectedTotal: z.number().min(0),
});

export type CheckoutForm = z.infer<typeof checkoutFormSchema>;
export type CheckoutField = keyof CheckoutForm;

export function checkoutFormFrom(formData: FormData): unknown {
  const text = (key: string) => String(formData.get(key) ?? "");
  return {
    firstName: text("firstName"),
    lastName: text("lastName"),
    email: text("email").trim(),
    phone: text("phone"),
    town: text("town"),
    marketingOptIn: formData.get("marketingOptIn") === "on",
    expectedSupply: text("expectedSupply"),
    expectedTotal: Number(text("expectedTotal")),
  };
}
