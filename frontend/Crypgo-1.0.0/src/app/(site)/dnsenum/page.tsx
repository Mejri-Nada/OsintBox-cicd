import { Metadata } from "next";
import Dnsenum from "@/components/Home/Services/dnsenum/dnsenum";

export const metadata: Metadata = {
  title: "DnsEnum | Crypgo",
};

export default function Page() {
  return (
    <Dnsenum />
  );
}
