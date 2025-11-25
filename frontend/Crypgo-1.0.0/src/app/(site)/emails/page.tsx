import { Metadata } from "next";
import Emails from "@/components/Home/Services/emails/emails";

export const metadata: Metadata = {
  title: "Emails | Crypgo",
};

export default function Page() {
  return (
    <Emails />
  );
}
