import { getSessionUser } from "@/app/data/user/require-user";
import { Navbar } from "./Navbar";

export async function NavbarServer() {
  const user = await getSessionUser();

  return <Navbar user={user} />;
}
