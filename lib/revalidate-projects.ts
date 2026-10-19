import { revalidatePath } from "next/cache";

export function revalidateProjects() {
  revalidatePath("/");
  revalidatePath("/portfolio");
  revalidatePath("/portfolio/[slug]", "page");
}
