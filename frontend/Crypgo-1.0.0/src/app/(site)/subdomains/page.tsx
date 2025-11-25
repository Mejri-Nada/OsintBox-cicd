import { Metadata } from "next";
import Subdomains from "@/components/Home/Services/subdomains/Subdomains";

export const metadata: Metadata = {
  title: "Subdomains | Crypgo",
};

export default function Page() {
  return (
    <Subdomains />
  );
}
