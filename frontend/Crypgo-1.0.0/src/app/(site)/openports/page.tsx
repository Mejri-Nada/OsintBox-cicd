import { Metadata } from "next";
import Openports from "@/components/Home/Services/openports/openports";

export const metadata: Metadata = {
  title: "OpenPorts | Crypgo",
};

export default function Page() {
  return (
    <Openports />
  );
}
