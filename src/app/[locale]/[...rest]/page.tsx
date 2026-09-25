import { notFound } from "next/navigation";

/** Any unknown URL inside a language shows the translated "page not found". */
export default function CatchAllPage() {
  notFound();
}
